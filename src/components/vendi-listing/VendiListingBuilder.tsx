import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ImagePlus, Loader2, Send, X, Wrench, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LivePreviewPanel from '@/components/ai-listing/LivePreviewPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import vendibookFavicon from '@/assets/vendibook-favicon.png';
import VendiAuthGate from '@/components/vendi-listing/VendiAuthGate';
import {
  buildListingPayload, getPublishBlockers, nextQuestion, progressPercent,
  Question, VendiDraft,
} from '@/lib/vendi-listing/script';
import { isSkip } from '@/lib/vendi-listing/extract';
import {
  ATTESTATIONS,
  publishAcceptanceText,
} from '@/components/listing-wizard/stages/PublishAttestations';
import {
  CONSENT_TRIGGERS, CURRENT_VERSIONS, DOCUMENT_SLUGS, DOCUMENT_TYPES,
} from '@/lib/legalDocuments';
import { useLegalDocument } from '@/hooks/useLegalDocument';
import { useRecordConsent } from '@/hooks/useRecordConsent';

type Msg = { id: string; role: 'vendi' | 'user'; content: string };

interface LocalPhoto { id: string; file: File; url: string }

const storageKeyFor = (userId: string) => `vendibook_list_with_vendi_v1:${userId}`;

const emptyDraft: VendiDraft = {
  title: null, description: null, category: null, mode: null,
};

interface PersistedState {
  draft: VendiDraft;
  answered: string[];
  messages: Msg[];
  draftId?: string | null;
  consentId?: string | null;
}

const uid = () => Math.random().toString(36).slice(2);


const VendiListingBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [draft, setDraft] = useState<VendiDraft>(emptyDraft);
  const [answered, setAnswered] = useState<string[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [consentId, setConsentId] = useState<string | null>(null);
  const [attesting, setAttesting] = useState(false);
  const [attestInput, setAttestInput] = useState('');
  const [attestError, setAttestError] = useState<string | null>(null);

  const creatingDraftRef = useRef(false);
  const disclosureShownRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const storageKey = user ? storageKeyFor(user.id) : null;

  // Same document + acceptance wording the step-by-step wizard records.
  const documentType = draft.mode === 'rent'
    ? DOCUMENT_TYPES.RENTER_TERMS
    : DOCUMENT_TYPES.SELLER_TERMS;
  const { data: legalDoc } = useLegalDocument(documentType);
  const recordConsent = useRecordConsent();
  const acceptanceText = publishAcceptanceText(draft.mode);

  const current: Question | null = useMemo(
    () => (reviewing ? null : nextQuestion(draft, answered)),
    [draft, answered, reviewing],
  );

  // Restore this signed-in owner's in-progress conversation
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed?.draft) {
          setDraft(parsed.draft);
          setAnswered(parsed.answered ?? []);
          setMessages(parsed.messages ?? []);
          setDraftId(parsed.draftId ?? null);
          setConsentId(parsed.consentId ?? null);
        }
      }
    } catch { /* ignore corrupt state */ }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || !storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ draft, answered, messages, draftId, consentId }));
    } catch { /* quota — non-fatal */ }
  }, [draft, answered, messages, draftId, consentId, hydrated, storageKey]);


  // Create the owned draft row as soon as we know mode + category, so every
  // later answer and upload is autosaved against the seller's account.
  useEffect(() => {
    if (!hydrated || !user || draftId || creatingDraftRef.current) return;
    if (!draft.mode || !draft.category) return;
    creatingDraftRef.current = true;
    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) return;
        const { data: created, error } = await supabase.functions.invoke('create-listing-draft', {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: {
            mode: draft.mode === 'sale' ? 'sale' : 'rent',
            category: draft.category,
            city: draft.city ?? null,
            state: draft.state ?? null,
            zipCode: draft.zip_code ?? null,
            location: draft.address ?? null,
          },
        });
        if (error) throw error;
        const id = (created as { id?: string } | null)?.id;
        if (id) setDraftId(id);
      } catch {
        creatingDraftRef.current = false;
      }
    })();
  }, [hydrated, user, draftId, draft.mode, draft.category, draft.city, draft.state, draft.zip_code, draft.address]);

  // Debounced autosave of collected answers onto the owned draft
  useEffect(() => {
    if (!draftId || !hydrated) return;
    const timer = window.setTimeout(() => {
      const payload = buildListingPayload(draft, uploadedUrls);
      void supabase.from('listings').update(payload as never).eq('id', draftId);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [draft, uploadedUrls, draftId, hydrated]);

  // Ask the first / next question
  useEffect(() => {
    if (!hydrated || reviewing) return;
    const q = nextQuestion(draft, answered);
    if (!q) { setReviewing(true); return; }
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      const prompt = q.prompt(draft);
      if (last?.role === 'vendi' && last.content === prompt) return prev;
      return [...prev, { id: uid(), role: 'vendi', content: prompt }];
    });
  }, [draft, answered, hydrated, reviewing]);

  // Final publish gate: present the same seller disclosure the step-by-step
  // wizard shows, in the chat, before publishing can unlock.
  useEffect(() => {
    if (!reviewing || consentId || disclosureShownRef.current) return;
    disclosureShownRef.current = true;
    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: 'vendi',
        content:
          'One last legal step before this can go live. Please read the disclosure below — it is the same attestation used in the standard listing wizard. ' +
          'When you have read it, type YES (in capitals) to affirm it.',
      },
    ]);
  }, [reviewing, consentId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, reviewing]);


  const say = (role: Msg['role'], content: string) =>
    setMessages((prev) => [...prev, { id: uid(), role, content }]);

  const submitAnswer = useCallback((raw: string, display?: string) => {
    const q = current;
    if (!q) return;
    const text = raw.trim();
    if (!text) return;
    const echo = display ?? (text.length > 420 ? `${text.slice(0, 420)}…` : text);
    say('user', echo);
    setInput('');

    if (q.optional && isSkip(text)) {
      setAnswered((prev) => [...prev, q.id]);
      return;
    }

    const result = q.apply(draft, text);
    if (result.error) { say('vendi', result.error); return; }
    setDraft((prev) => ({ ...prev, ...(result.patch ?? {}) }));
    setAnswered((prev) => [...prev, q.id, ...(result.answeredIds ?? [])]);
    if (result.say) say('vendi', result.say);
  }, [current, draft]);


  const handlePhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const accepted = Array.from(files).filter((f) => f.type.startsWith('image/') && f.size <= 15 * 1024 * 1024);
    if (accepted.length !== files.length) toast.error('Some files were skipped (images up to 15MB only).');
    setPhotos((prev) => [...prev, ...accepted.map((file) => ({ id: uid(), file, url: URL.createObjectURL(file) }))].slice(0, 12));
  };

  const removePhoto = (id: string) => setPhotos((prev) => prev.filter((p) => p.id !== id));

  const previewImages = uploadedUrls.length ? uploadedUrls : photos.map((p) => p.url);
  const blockers = getPublishBlockers(draft, previewImages.length);

  const uploadPhotos = async (listingId: string, userId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const photo of photos) {
      const ext = photo.file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/${listingId}/${Date.now()}-${uid()}.${ext}`;
      const { error } = await supabase.storage.from('listing-images').upload(path, photo.file, {
        cacheControl: '3600', upsert: true, contentType: photo.file.type || 'image/jpeg',
      });
      if (error) throw new Error(`Photo upload failed: ${error.message}`);
      const { data } = supabase.storage.from('listing-images').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  // Persist media to the owner's draft as soon as both exist, so photos survive
  // a closed tab just like the answers do.
  useEffect(() => {
    if (!draftId || !user || !photos.length || uploadedUrls.length) return;
    let cancelled = false;
    void (async () => {
      try {
        const urls = await uploadPhotos(draftId, user.id);
        if (!cancelled) setUploadedUrls(urls);
      } catch {
        /* keep local previews; publish retries the upload */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, user, photos.length, uploadedUrls.length]);

  /**
   * Exactly `YES` — uppercase, no surrounding punctuation, no extra words.
   * Partial matches ("YE", "YES."), lowercase, and any auto-filled variant are
   * rejected, and the Affirm control stays disabled until the value matches, so
   * a button click alone can never satisfy the acknowledgment.
   */
  const isExactYes = attestInput === 'YES';

  /**
   * Typed acknowledgment of the publish disclosure. Only an exact, capitalised
   * `YES` counts — no inferred or button-only consent — and it is written
   * through the same `record_user_consent` audit path as the wizard's
   * ConsentModal before the Publish action unlocks.
   */
  const handleAttest = async (raw: string) => {
    const text = raw;
    if (attesting || consentId) return;
    if (text !== 'YES') {
      const reason = !text.trim()
        ? 'Type YES to affirm the disclosure.'
        : text.trim().toUpperCase() === 'YES'
          ? 'Use capital letters with no extra spaces or punctuation: YES.'
          : 'That does not match. Type exactly YES (capital letters, nothing else).';
      setAttestError(reason);
      say('vendi', `${reason} Nothing is published until then.`);
      return;
    }
    setAttestError(null);
    say('user', text);
    setAttestInput('');

    setAttesting(true);
    try {
      const id = await recordConsent.mutateAsync({
        documentType,
        documentVersion: legalDoc?.version ?? CURRENT_VERSIONS[documentType],
        trigger: CONSENT_TRIGGERS.PUBLISH_LISTING,
        acceptanceText: `${acceptanceText} ${ATTESTATIONS.map((a) => a.text).join(' ')} Acknowledged by typing YES in the List with Vendi builder.`,
        relatedIds: draftId ? { listing_id: draftId } : undefined,
      });
      setConsentId(id);
      say('vendi', 'Recorded and dated. Publish Listing is now unlocked — publishing is still your explicit action.');
    } catch (error) {
      say('vendi', 'I could not record your acknowledgment. Please try typing YES again, or contact support@vendibook.com.');
      toast.error(error instanceof Error ? error.message : 'Could not record your acceptance.');
    } finally {
      setAttesting(false);
    }
  };

  const handlePublish = async () => {
    if (blockers.length) return;
    if (!user || !consentId) return;
    setPublishing(true);
    try {

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Please sign in again to publish.');

      let listingId = draftId;
      if (!listingId) {
        const { data: created, error: draftError } = await supabase.functions.invoke('create-listing-draft', {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: {
            mode: draft.mode === 'sale' ? 'sale' : 'rent',
            category: draft.category,
            city: draft.city ?? null,
            state: draft.state ?? null,
            zipCode: draft.zip_code ?? null,
            location: draft.address ?? null,
          },
        });
        if (draftError) throw draftError;
        listingId = (created as { id?: string } | null)?.id ?? null;
        if (!listingId) throw new Error('We could not start your draft. Please try again.');
        setDraftId(listingId);
      }

      const imageUrls = uploadedUrls.length ? uploadedUrls : await uploadPhotos(listingId, user.id);
      setUploadedUrls(imageUrls);

      const payload = buildListingPayload(draft, imageUrls);
      const { error: updateError } = await supabase.from('listings').update(payload as never).eq('id', listingId);
      if (updateError) throw updateError;

      const { error: publishError } = await supabase
        .from('listings')
        .update({ status: 'published', published_at: new Date().toISOString() } as never)
        .eq('id', listingId);

      if (storageKey) localStorage.removeItem(storageKey);

      if (publishError) {
        toast.message('Draft saved — a few details still need review before it can go live.', {
          description: publishError.message,
        });
        navigate(`/create-listing/${listingId}`);
        return;
      }

      toast.success('Your listing is live.');
      navigate(`/listing/${listingId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  const startOver = () => {
    if (storageKey) localStorage.removeItem(storageKey);
    setDraft(emptyDraft); setAnswered([]); setMessages([]); setPhotos([]); setUploadedUrls([]); setReviewing(false);
    setDraftId(null); creatingDraftRef.current = false;
    setConsentId(null); setAttestInput(''); disclosureShownRef.current = false;
  };


  const progress = progressPercent(draft, answered);

  const previewPanel = (
    <LivePreviewPanel preview={draft} images={previewImages} ready={blockers.length === 0} />
  );

  // The interview never starts anonymously — the draft, answers and media must
  // belong to a real account from the very first question.
  if (authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#08080a]">
        <Loader2 className="h-6 w-6 animate-spin text-white/50" />
      </div>
    );
  }
  if (!user) return <VendiAuthGate />;

  return (
    <div className="dashboard-shell relative min-h-screen overflow-hidden bg-[#08080a] text-foreground">
      {/* Ambient depth — restrained, no loud gradients */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(90% 60% at 12% -10%, rgba(255,81,36,0.10), transparent 60%), radial-gradient(70% 50% at 100% 0%, rgba(255,255,255,0.05), transparent 65%)',
        }}
      />

      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#08080a]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5 sm:px-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={vendibookFavicon} alt="" className="h-7 w-7 rounded-lg ring-1 ring-white/10" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em]">List with Vendi</h1>
            <p className="truncate text-xs text-muted-foreground">Guided listing builder · {progress}% complete</p>
          </div>
          <Button variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex" onClick={() => navigate('/list')}>
            <Wrench className="mr-2 h-4 w-4" /> Build it myself
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setShowMobilePreview(true)}
          >
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
        </div>
        <div className="h-px w-full bg-white/[0.06]">
          <motion.div
            className="h-full"
            style={{ background: 'linear-gradient(90deg, rgba(255,81,36,0.55), rgba(255,81,36,1))' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>
      </header>

      <div className="relative mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_400px] lg:py-10">
        <section className="dash-glass flex min-h-[68vh] flex-col overflow-hidden p-0">
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-7 sm:py-8">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[86%] px-4 py-3 text-[15px] leading-relaxed sm:max-w-[76%] ${
                      m.role === 'user'
                        ? 'rounded-[18px] rounded-br-[6px] border border-[rgba(255,81,36,0.28)] bg-[rgba(255,81,36,0.10)] text-foreground'
                        : 'rounded-[18px] rounded-bl-[6px] border border-white/[0.08] bg-white/[0.045] text-foreground/90'
                    }`}
                  >
                    {m.role === 'vendi' && (
                      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Vendi
                      </span>
                    )}
                    {m.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {current?.kind === 'choice' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-wrap gap-2.5 pt-1"
              >
                {(current.options?.(draft) ?? []).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => submitAnswer(opt.value, opt.label)}
                    className="group rounded-2xl border border-white/[0.09] bg-white/[0.035] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-[1px] hover:border-[rgba(255,81,36,0.4)] hover:bg-white/[0.06]"
                  >
                    <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                    {opt.description && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{opt.description}</span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}

            {current?.kind === 'yesno' && (
              <div className="flex gap-2.5 pt-1">
                {(['yes', 'no'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => submitAnswer(v)}
                    className="rounded-full border border-white/[0.1] bg-white/[0.04] px-6 py-2.5 text-sm font-medium capitalize transition-all duration-200 hover:border-[rgba(255,81,36,0.4)] hover:bg-white/[0.07]"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}

            {current?.kind === 'photos' && (
              <div className="space-y-4 pt-1">
                <div className="flex flex-wrap gap-2.5">
                  {photos.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative h-[86px] w-[86px] overflow-hidden rounded-2xl border border-white/[0.1]"
                    >
                      <img src={p.url} alt="Listing photo" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => removePhoto(p.id)}
                        className="absolute right-1.5 top-1.5 rounded-full border border-white/10 bg-black/65 p-1 backdrop-blur-md transition hover:bg-black/85"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-[86px] w-[86px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/15 text-muted-foreground transition hover:border-[rgba(255,81,36,0.45)] hover:text-foreground"
                    aria-label="Add photos"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[10px] tracking-wide">Add</span>
                  </button>
                </div>
                <Button onClick={() => submitAnswer('done')} disabled={!photos.length} className="rounded-full">
                  Continue with {photos.length} photo{photos.length === 1 ? '' : 's'}
                </Button>
              </div>
            )}

            {reviewing && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="dash-glass dash-glass-ember p-6"
              >
                <h2 className="text-lg font-semibold tracking-[-0.01em]">Review and publish</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Everything below came straight from your answers. Nothing was added for you.
                </p>
                {blockers.length > 0 && (
                  <ul className="mt-4 space-y-1.5 text-sm text-destructive">
                    {blockers.map((b) => <li key={b}>• {b}</li>)}
                  </ul>
                )}

                {/* Seller disclosure — identical language to the standard wizard */}
                <div className="mt-6 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-5">
                  <h3 className="text-sm font-semibold tracking-[-0.01em]">Before you publish</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/85">
                    {ATTESTATIONS.map((a) => <li key={a.key}>• {a.text}</li>)}
                  </ul>
                  <p className="mt-4 text-sm leading-relaxed text-foreground/85">{acceptanceText}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {legalDoc ? `Version ${legalDoc.version}` : `Version ${CURRENT_VERSIONS[documentType]}`} ·{' '}
                    <a
                      href={`/legal/${DOCUMENT_SLUGS[documentType]}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {draft.mode === 'rent' ? 'Host / Renter Terms' : 'Seller Terms'}
                    </a>{' '}
                    ·{' '}
                    <a href="/terms" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
                      Terms of Service
                    </a>{' '}
                    ·{' '}
                    <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
                      Privacy Policy
                    </a>
                  </p>

                  {consentId ? (
                    <p className="mt-4 flex items-center gap-2 text-sm text-foreground/90">
                      <Check className="h-4 w-4 text-[rgb(255,81,36)]" aria-hidden />
                      Acknowledged and recorded. You can publish when you're ready.
                    </p>
                  ) : (
                    <form
                      className="mt-4 space-y-2"
                      onSubmit={(e) => { e.preventDefault(); void handleAttest(attestInput); }}
                    >
                      <label htmlFor="vendi-attest" className="block text-xs text-muted-foreground">
                        Type YES to affirm the disclosure above. This is your legal acknowledgment — it does not publish your listing.
                      </label>
                      <div className="flex items-center gap-2 rounded-[18px] border border-white/[0.1] bg-white/[0.04] px-3 py-2 focus-within:border-[rgba(255,81,36,0.45)]">
                        <input
                          id="vendi-attest"
                          value={attestInput}
                          onChange={(e) => setAttestInput(e.target.value)}
                          placeholder="Type YES"
                          autoComplete="off"
                          className="min-h-[40px] flex-1 border-0 bg-transparent px-1 text-base text-foreground outline-none placeholder:text-muted-foreground"
                        />
                        <Button type="submit" size="sm" disabled={attesting} className="rounded-full">
                          {attesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Affirm
                        </Button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Button onClick={handlePublish} disabled={publishing || blockers.length > 0 || !consentId} className="rounded-full">
                    {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Publish listing
                  </Button>
                  <Button variant="outline" className="rounded-full border-white/12 bg-white/[0.04]" onClick={() => { setReviewing(false); setAnswered((prev) => prev.slice(0, -1)); }}>
                    Make changes
                  </Button>
                  <Button variant="ghost" className="rounded-full text-muted-foreground" onClick={startOver}>Start over</Button>
                </div>
              </motion.div>
            )}


            <div ref={endRef} />
          </div>

          {current && !['choice', 'yesno', 'photos'].includes(current.kind) && (
            <form
              className="sticky bottom-0 border-t border-white/[0.07] bg-[#0c0c0f]/80 px-4 py-3.5 backdrop-blur-xl sm:px-7"
              onSubmit={(e) => { e.preventDefault(); submitAnswer(input); }}
            >
              {current.kind === 'paste' && photos.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <div key={p.id} className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/[0.1]">
                      <img src={p.url} alt="Attached" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove attachment"
                        onClick={() => removePhoto(p.id)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2 rounded-[20px] border border-white/[0.09] bg-white/[0.04] px-3 py-2 transition focus-within:border-[rgba(255,81,36,0.45)]">
                {current.kind === 'paste' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Attach photos from your other listing"
                    className="h-10 w-10 shrink-0 rounded-full text-muted-foreground"
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                )}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && current.kind !== 'paste') {
                      e.preventDefault(); submitAnswer(input);
                    }
                  }}
                  rows={current.kind === 'paste' ? 5 : 1}
                  placeholder={current.placeholder ?? 'Type your answer…'}
                  aria-label={current.prompt(draft)}
                  className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground"
                />
                {current.optional && (
                  <Button type="button" variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={() => submitAnswer('skip')}>
                    Skip
                  </Button>
                )}
                <Button type="submit" size="icon" aria-label="Send answer" className="h-10 w-10 shrink-0 rounded-full">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {current.kind === 'paste' && (
                <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
                  Paste your own text only — Vendi never pulls anything from Facebook Marketplace or other sites. Attached photos become your listing photos.
                </p>
              )}
            </form>
          )}


          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { handlePhotos(e.target.files); e.target.value = ''; }}
          />
        </section>

        <aside className="hidden lg:block">
          <div className="dash-glass sticky top-28 h-[72vh] overflow-hidden p-0">
            {previewPanel}
          </div>
        </aside>
      </div>

      {/* Mobile: polished preview sheet */}
      <Sheet open={showMobilePreview} onOpenChange={setShowMobilePreview}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-[24px] border-white/[0.08] bg-[#0c0c0f]/95 p-0 backdrop-blur-2xl lg:hidden"
        >
          <SheetHeader className="border-b border-white/[0.07] px-5 py-4 text-left">
            <SheetTitle className="text-sm font-semibold text-foreground">Live preview</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(85vh-64px)] overflow-hidden">{previewPanel}</div>
        </SheetContent>
      </Sheet>

      {/* Mobile: persistent preview control */}
      <button
        type="button"
        onClick={() => setShowMobilePreview(true)}
        className="fixed bottom-24 right-4 z-20 flex items-center gap-2 rounded-full border border-white/[0.12] bg-[#121215]/90 px-4 py-2.5 text-xs font-medium text-foreground shadow-[0_12px_30px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl lg:hidden"
      >
        <Eye className="h-4 w-4" /> Preview
      </button>
    </div>
  );
};

export default VendiListingBuilder;

