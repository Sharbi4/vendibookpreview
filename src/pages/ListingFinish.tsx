import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ConsentModal } from '@/components/consent/ConsentModal';
import { ListingDisclosures, type DisclosureValues } from '@/components/listing-wizard/stages/ListingDisclosures';
import {
  PublishAttestations,
  allAttested,
  emptyAttestations,
  publishAcceptanceText,
  type AttestationKey,
} from '@/components/listing-wizard/stages/PublishAttestations';
import { DOCUMENT_TYPES, CONSENT_TRIGGERS } from '@/lib/legalDocuments';
import { publishListingIdempotent } from '@/lib/listings/publishListing';
import { LISTING_ROUTES, authReturnTo } from '@/lib/listings/routes';
import {
  CONDITION_OPTIONS,
  READINESS_OPTIONS,
  getCategoryBasics,
  requiresSaleDimensions,
} from '@/lib/listings/stages';
import {
  FINISH_LISTING_COLUMNS,
  answersFromRow,
  buildFinishPatch,
  describeFinishPublishError,
  getFinishContentBlockers,
  getFinishQuestions,
  type FinishAnswers,
  type FinishListingRow,
} from '@/lib/listings/finishListing';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';
import { cn } from '@/lib/utils';

const AUTOSAVE_MS = 800;

/**
 * One-screen "Finish & publish" for drafts saved before the disclosure step
 * existed. It only asks what is still missing, autosaves every answer, and
 * publishes through the same canonical publisher and consent record as the
 * full wizard. Content gaps (photos, price, address…) route to the full editor.
 * Payment settings are never read or changed here.
 */
const ListingFinish: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const [row, setRow] = useState<FinishListingRow | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing' | 'not_draft'>('loading');
  const [answers, setAnswers] = useState<FinishAnswers | null>(null);
  const [attestations, setAttestations] = useState<Record<AttestationKey, boolean>>(emptyAttestations());
  const [showErrors, setShowErrors] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<{ message: string; needsEditor: boolean } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<Promise<void> | null>(null);
  const viewedRef = useRef(false);

  // Auth gate: sign in, then come straight back here.
  useEffect(() => {
    if (!authLoading && !user && listingId) {
      navigate(authReturnTo(`/list/finish/${listingId}${window.location.search}`), { replace: true });
    }
  }, [authLoading, user, listingId, navigate]);

  // Load the draft (owner only — RLS plus an explicit host filter).
  useEffect(() => {
    if (!user || !listingId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(FINISH_LISTING_COLUMNS)
        .eq('id', listingId)
        .eq('host_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setLoadState('missing');
        return;
      }
      const listing = data as unknown as FinishListingRow;
      setRow(listing);
      setAnswers(answersFromRow(listing));
      setLoadState(listing.status === 'draft' ? 'ready' : 'not_draft');
    })();
    return () => {
      cancelled = true;
    };
  }, [user, listingId]);

  const contentBlockers = useMemo(() => (row ? getFinishContentBlockers(row) : []), [row]);
  const questions = useMemo(() => (row && answers ? getFinishQuestions(row, answers) : []), [row, answers]);
  const missingIds = useMemo(() => new Set(questions.map((q) => q.fieldId)), [questions]);

  // Which questions to render is fixed at load, so a field never disappears
  // while the seller is still typing into it.
  const [asked, setAsked] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (row && answers && asked === null) {
      setAsked(new Set(getFinishQuestions(row, answers).map((q) => q.fieldId)));
    }
  }, [row, answers, asked]);

  useEffect(() => {
    if (loadState !== 'ready' || !row || viewedRef.current || asked === null) return;
    viewedRef.current = true;
    void trackEventToDb('finish_page_viewed', 'supply', {
      questions_missing: asked.size,
      content_blockers: contentBlockers.map((b) => b.id),
    }, row.id);
  }, [loadState, row, asked, contentBlockers]);

  const persist = useCallback(
    async (next: FinishAnswers) => {
      if (!row || !user) return;
      const { error } = await supabase
        .from('listings')
        .update(buildFinishPatch(next) as never)
        .eq('id', row.id)
        .eq('host_id', user.id)
        .eq('status', 'draft');
      if (error) {
        toast({ title: "Couldn't save that answer", description: 'Check your connection. We will retry when you publish.', variant: 'destructive' });
      }
    },
    [row, user, toast],
  );

  const update = (patch: Partial<FinishAnswers>) => {
    setAnswers((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        pendingSave.current = persist(next);
      }, AUTOSAVE_MS);
      return next;
    });
  };

  const readyToPublish = contentBlockers.length === 0 && questions.length === 0 && allAttested(attestations);

  const handlePublishClick = () => {
    if (!readyToPublish) {
      setShowErrors(true);
      const first = questions[0]?.fieldId;
      if (first) document.getElementById(first)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    void trackEventToDb('finish_publish_clicked', 'supply', {}, row?.id);
    setConsentOpen(true);
  };

  const publish = async () => {
    if (!row || !answers || !user || publishing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await pendingSave.current;
      const patch = buildFinishPatch(answers);
      const result = await publishListingIdempotent(row.id, patch);

      if (result.firstPublish) {
        const price =
          row.mode === 'sale' && row.price_sale
            ? `$${Number(row.price_sale).toLocaleString()}`
            : row.price_daily
              ? `$${row.price_daily}/day`
              : 'Contact for price';
        const hostName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'there';
        supabase.functions
          .invoke('send-listing-live-email', {
            body: {
              hostEmail: user.email,
              hostName,
              listingTitle: row.title,
              listingId: row.id,
              listingImageUrl: row.image_urls?.[0],
              coverImageUrl: row.cover_image_url || row.image_urls?.[0],
              listingPrice: price,
              category: row.category,
              address: [row.city, row.state].filter(Boolean).join(', '),
              listingType: row.mode === 'sale' ? 'sale' : 'rental',
            },
          })
          .catch((err) => console.error('Listing live email error:', err));
        supabase.functions
          .invoke('send-admin-notification', {
            body: {
              type: 'new_listing',
              data: {
                listing_id: row.id,
                title: row.title,
                category: row.category,
                mode: row.mode,
                price_daily: row.price_daily,
                price_sale: row.price_sale,
                address: [row.city, row.state].filter(Boolean).join(', '),
                host_id: user.id,
                host_name: hostName,
                host_email: user.email,
                source: 'finish_and_publish',
              },
            },
          })
          .catch((err) => console.error('Admin notification error:', err));
      }

      void trackEventToDb('finish_published', 'supply', { first_publish: result.firstPublish }, row.id);
      toast({ title: 'Your listing is live 🎉', description: 'Buyers can find it now. You can edit it any time from your dashboard.' });
      navigate(LISTING_ROUTES.published(row.id));
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      const described = describeFinishPublishError(raw);
      setPublishError(described);
      void trackEventToDb('finish_publish_failed', 'supply', { reason: raw.slice(0, 80) }, row.id);
      toast({ title: 'Not published yet', description: described.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  // Abandon signal: the first unanswered question when the seller leaves.
  useEffect(() => {
    const onLeave = () => {
      if (row && questions.length > 0) {
        void trackEventToDb('finish_abandoned', 'supply', { first_missing_field_id: questions[0].fieldId }, row.id);
      }
    };
    window.addEventListener('pagehide', onLeave);
    return () => window.removeEventListener('pagehide', onLeave);
  }, [row, questions]);

  if (authLoading || (user && loadState === 'loading') || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadState === 'missing' || !row || !answers) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold">We couldn't find that draft</h1>
        <p className="mt-2 text-muted-foreground">It may belong to another account or have been removed.</p>
        <Button asChild className="mt-6"><Link to="/dashboard">Go to your dashboard</Link></Button>
      </Shell>
    );
  }

  if (loadState === 'not_draft') {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold">This listing isn't a draft anymore</h1>
        <p className="mt-2 text-muted-foreground">You can still edit it from the full editor.</p>
        <Button asChild className="mt-6"><Link to={LISTING_ROUTES.edit(row.id)}>Open the editor</Link></Button>
      </Shell>
    );
  }

  const basics = getCategoryBasics(row.category);
  const readinessOptions = READINESS_OPTIONS[basics.readiness];
  const show = (id: string) => asked?.has(id) ?? false;
  const disclosureIds = ['listing-title-status', 'listing-lien', 'listing-known-problems', 'listing-included-items', 'listing-photo-exclusions'];
  const showDisclosures = disclosureIds.some(show) || [...(asked ?? [])].some((id) => id.startsWith('known-problem-'));
  const showDims = requiresSaleDimensions(row.mode, row.category) && (show('length_ft') || show('height_ft'));
  const cover = row.cover_image_url || row.image_urls?.[0];
  const price =
    row.mode === 'sale' && row.price_sale
      ? `$${Number(row.price_sale).toLocaleString()}`
      : row.price_daily
        ? `$${row.price_daily}/day`
        : null;

  const disclosureValues: DisclosureValues = {
    titleStatus: answers.titleStatus,
    hasLien: answers.hasLien,
    noKnownProblems: answers.noKnownProblems,
    knownProblems: answers.knownProblems,
    includedItems: answers.includedItems,
    photosExclusionsAnswered: answers.photosExclusionsAnswered,
    photosExclusionsNote: answers.photosExclusionsNote,
    priceNegotiable: answers.priceNegotiable,
    acceptsOffers: answers.acceptsOffers,
    minOfferAmount: answers.minOfferAmount,
  };

  return (
    <Shell>
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
        {cover ? (
          <img src={cover} alt="" className="h-16 w-20 flex-none rounded-lg object-cover" />
        ) : (
          <div className="h-16 w-20 flex-none rounded-lg bg-muted" />
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{row.title || 'Your listing'}</p>
          <p className="text-sm text-muted-foreground">
            {[price, [row.city, row.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <h1 className="mt-6 text-2xl font-semibold">Finish & publish</h1>
      <p className="mt-1 text-muted-foreground" aria-live="polite">
        {questions.length > 0
          ? `${questions.length} quick ${questions.length === 1 ? 'answer' : 'answers'} left. Buyers ask these first, so answering them up front means fewer back-and-forth messages.`
          : contentBlockers.length > 0
            ? 'Your answers are saved. A few listing details still need the full editor.'
            : 'All set. Confirm below and publish.'}
      </p>

      {contentBlockers.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-4 w-4 text-amber-600" /> Still needed in the full editor
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
            {contentBlockers.map((b) => <li key={b.id}>{b.message}</li>)}
          </ul>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to={LISTING_ROUTES.resume(row.id)}>Open the full editor <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      )}

      <div className="mt-6 space-y-8">
        {show('listing-condition') && (
          <Question id="listing-condition" label="Overall condition" missing={showErrors && missingIds.has('listing-condition')}>
            <RadioGroup value={answers.condition} onValueChange={(v) => update({ condition: v })} className="grid gap-2 sm:grid-cols-2">
              {CONDITION_OPTIONS.map((o) => (
                <Choice key={o.value} name="condition" value={o.value} label={o.label} />
              ))}
            </RadioGroup>
          </Question>
        )}

        {show('listing-operational-status') && (
          <Question
            id="listing-operational-status"
            label={basics.readiness === 'drivable' ? 'Does it start, run and drive?' : basics.readiness === 'towable' ? 'Is it towable today?' : 'Is the space operational?'}
            missing={showErrors && missingIds.has('listing-operational-status')}
          >
            <RadioGroup value={answers.operationalStatus} onValueChange={(v) => update({ operationalStatus: v })} className="grid gap-2">
              {readinessOptions.map((o) => (
                <Choice key={o.value} name="operational" value={o.value} label={o.label} />
              ))}
            </RadioGroup>
          </Question>
        )}

        {showDims && (
          <Question id="length_ft" label="Overall size (feet)" missing={showErrors && (missingIds.has('length_ft') || missingIds.has('height_ft'))}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="finish-length">Length</Label>
                <Input id="finish-length" inputMode="decimal" value={answers.lengthFt} onChange={(e) => update({ lengthFt: e.target.value })} placeholder="e.g. 16" />
              </div>
              <div>
                <Label htmlFor="finish-height">Height</Label>
                <Input id="finish-height" inputMode="decimal" value={answers.heightFt} onChange={(e) => update({ heightFt: e.target.value })} placeholder="e.g. 9" />
              </div>
            </div>
          </Question>
        )}

        {showDisclosures && (
          <ListingDisclosures
            category={row.category}
            mode={row.mode}
            values={disclosureValues}
            onChange={(patch) => update(patch)}
            showErrors={showErrors}
          />
        )}

        <PublishAttestations
          value={attestations}
          onChange={(key, checked) => setAttestations((prev) => ({ ...prev, [key]: checked }))}
        />
      </div>

      {publishError && (
        <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p>{publishError.message}</p>
          {publishError.needsEditor && (
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to={LISTING_ROUTES.resume(row.id)}>Fix it in the full editor</Link>
            </Button>
          )}
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 mt-8 border-t border-border bg-background/95 px-4 py-4 backdrop-blur">
        <Button className="w-full" size="lg" onClick={handlePublishClick} disabled={publishing || contentBlockers.length > 0}>
          {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          {publishing ? 'Publishing…' : 'Publish listing'}
        </Button>
        {!allAttested(attestations) && questions.length === 0 && contentBlockers.length === 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">Tick each confirmation above to publish.</p>
        )}
      </div>

      <ConsentModal
        open={consentOpen}
        onOpenChange={setConsentOpen}
        documentType={row.mode === 'rent' ? DOCUMENT_TYPES.RENTER_TERMS : DOCUMENT_TYPES.SELLER_TERMS}
        trigger={CONSENT_TRIGGERS.PUBLISH_LISTING}
        acceptanceText={publishAcceptanceText(row.mode)}
        relatedIds={{ listing_id: row.id }}
        intro="Review the terms that govern this listing. Your acceptance is recorded and dated."
        primaryLabel={publishing ? 'Publishing…' : 'Accept and publish'}
        onAccept={async () => {
          await publish();
        }}
      />
    </Shell>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-background">
    <SEO title="Finish & publish your listing | Vendibook" description="Answer a few quick questions and publish your listing." noindex />
    <Header />
    <main className="mx-auto w-full max-w-xl px-4 pb-10 pt-6">{children}</main>
  </div>
);

const Question: React.FC<{ id: string; label: string; missing?: boolean; children: React.ReactNode }> = ({ id, label, missing, children }) => (
  <section id={id} className={cn('space-y-3 scroll-mt-24', missing && 'rounded-xl ring-1 ring-destructive/50 p-3')}>
    <h2 className="text-base font-semibold">{label}</h2>
    {children}
    {missing && <p className="text-xs font-medium text-destructive">Please answer this to publish.</p>}
  </section>
);

const Choice: React.FC<{ name: string; value: string; label: string }> = ({ name, value, label }) => {
  const id = `${name}-${value}`;
  return (
    <Label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm font-normal hover:bg-muted/50">
      <RadioGroupItem id={id} value={value} />
      {label}
    </Label>
  );
};

export default ListingFinish;
