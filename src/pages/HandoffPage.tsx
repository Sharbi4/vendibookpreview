import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, FileSignature, Loader2, ShieldCheck, TriangleAlert, KeyRound,
} from 'lucide-react';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { handoffOps, useHandoffContext, type HandoffSession } from '@/hooks/useHandoff';
import EvidenceTimeline from '@/components/handoff/EvidenceTimeline';
import WalkthroughRecorder from '@/components/handoff/WalkthroughRecorder';
import DeliveryOps from '@/components/handoff/DeliveryOps';
import { HANDOFF_TERMS_VERSION } from '@/lib/legal/versions';

const CONSENT_COPY =
  'This walkthrough will be recorded and stored with the Vendibook transaction to document the condition and handoff of the asset.';

const STEPS = ['Start', 'Walkthrough', 'Condition', 'Review', 'Sign', 'Complete'] as const;

const stepIndex = (h: HandoffSession | null) => {
  if (!h) return 0;
  if (h.status === 'completed') return 5;
  if (h.buyer_decision) return 4;
  if (h.walkthrough_completed_at) return 2;
  if (h.status === 'started' && h.mode === 'buyer_pickup' && !h.pickup_code_verified_at) return 0;
  return 1;
};

export default function HandoffPage() {
  const { kind, id } = useParams<{ kind: 'sale' | 'booking'; id: string }>();
  const saleId = kind === 'sale' ? (id ?? null) : null;
  const bookingId = kind === 'booking' ? (id ?? null) : null;
  const { data, isLoading, error, refresh } = useHandoffContext(saleId, bookingId);

  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [handoffTermsAccepted, setHandoffTermsAccepted] = useState(false);
  const [decision, setDecision] = useState<'accepted' | 'accepted_with_exceptions' | 'issue_reported' | null>(null);
  const [notes, setNotes] = useState('');

  const handoff = useMemo(
    () => data?.handoff_sessions?.find((h) => !h.finalized) ?? data?.handoff_sessions?.[0] ?? null,
    [data],
  );
  const media = useMemo(
    () => (data?.media ?? []).filter((m) => m.handoff_session_id === handoff?.id),
    [data, handoff?.id],
  );
  const exceptions = useMemo(
    () => (data?.exceptions ?? []).filter((m) => m.handoff_session_id === handoff?.id),
    [data, handoff?.id],
  );
  const signature = useMemo(
    () => (data?.signatures ?? []).find((s) => s.handoff_session_id === handoff?.id) ?? null,
    [data, handoff?.id],
  );

  const isSeller = data?.viewer_role === 'seller' || data?.viewer_role === 'admin';
  const isBuyer = data?.viewer_role === 'buyer' || data?.viewer_role === 'admin';
  const current = stepIndex(handoff);

  const run = async (name: string, payload: Record<string, unknown>, success?: string) => {
    setBusy(name);
    try {
      const result = await handoffOps<any>(payload);
      if (success) toast.success(success);
      await refresh();
      return result;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
      return null;
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Handoff unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn't load this handoff. It may belong to another account.
        </p>
        <Button asChild className="mt-6"><Link to="/dashboard">Back to dashboard</Link></Button>
      </div>
    );
  }

  const completed = handoff?.status === 'completed';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:pt-12">
      <SEO title="Verified Handoff · Vendibook" description="Document the fulfillment and handoff of your Vendibook transaction." noindex />

      <Link to="/dashboard/activity" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Vendibook Verified Handoff</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Document this handoff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fulfillment method: {(handoff?.mode ?? data.target.fulfillment_type ?? 'not set').toString().replace(/_/g, ' ')}
            {' · '}Reference {(saleId ?? bookingId ?? '').slice(0, 8).toUpperCase()}
          </p>
        </div>
        {completed && (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Verified Handoff
          </Badge>
        )}
      </div>

      {/* stepper */}
      <div className="mt-6 flex flex-wrap gap-1.5 text-xs">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`rounded-full border px-3 py-1 ${
              i === current
                ? 'border-foreground bg-foreground text-background'
                : i < current
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-border text-muted-foreground'
            }`}
          >
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {/* Delivery / freight operations */}
      <div className="mt-6">
        <DeliveryOps
          saleId={saleId}
          bookingId={bookingId}
          sessions={data.fulfillment_sessions}
          tracking={data.tracking}
          isSeller={!!isSeller}
          onChange={refresh}
        />
      </div>

      {/* STEP 1 — start */}
      {!handoff && isSeller && (
        <Card className="mt-6 space-y-3 p-4">
          <p className="font-medium">Start the handoff</p>
          <p className="text-sm text-muted-foreground">
            Use this when you and the buyer are together. For a local pickup we generate a 6-digit code the buyer
            enters to confirm you are both present.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={handoffTermsAccepted}
              onChange={(e) => setHandoffTermsAccepted(e.target.checked)}
            />
            <span>
              I have read and agree to the{' '}
              <Link to="/legal/handoff-terms" target="_blank" rel="noreferrer" className="underline">
                Verified Handoff &amp; Condition Evidence Terms
              </Link>
              . A handoff record documents what we capture — it is not an inspection or a verification by Vendibook.
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!handoffTermsAccepted || busy === 'start'}
              onClick={() => run('start', { action: 'start_handoff', sale_transaction_id: saleId, booking_id: bookingId, mode: 'buyer_pickup', legal_acceptance_version: HANDOFF_TERMS_VERSION }, 'Pickup handoff started.')}>
              {busy === 'start' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Start pickup handoff
            </Button>
            <Button size="sm" variant="outline" disabled={!handoffTermsAccepted || busy === 'start-d'}
              onClick={() => run('start-d', { action: 'start_handoff', sale_transaction_id: saleId, booking_id: bookingId, mode: 'seller_delivery', legal_acceptance_version: HANDOFF_TERMS_VERSION }, 'Handoff started.')}>
              Start delivery handoff
            </Button>
          </div>
          {!handoffTermsAccepted && (
            <p className="text-xs text-muted-foreground">
              Please review and accept the handoff terms to continue.
            </p>
          )}
        </Card>
      )}

      {handoff && !handoff.pickup_code_verified_at && handoff.mode === 'buyer_pickup' && (
        <Card className="mt-6 space-y-3 p-4">
          <p className="font-medium">Pickup code</p>
          {isSeller && handoff.pickup_code && (
            <p className="text-sm text-muted-foreground">
              Give the buyer this code in person:{' '}
              <span className="font-mono text-lg tracking-[0.3em] text-foreground">{handoff.pickup_code}</span>
            </p>
          )}
          {isBuyer && (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Enter the 6-digit code from the seller</label>
                <Input value={code} inputMode="numeric" maxLength={6} className="mt-1 w-40 font-mono tracking-[0.3em]"
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
              </div>
              <Button size="sm" disabled={code.length !== 6 || busy === 'code'}
                onClick={() => run('code', { action: 'verify_pickup_code', handoff_session_id: handoff.id, code }, 'Pickup confirmed.')}>
                Confirm pickup
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* STEP 2 — walkthrough */}
      {handoff && (handoff.pickup_code_verified_at || handoff.mode !== 'buyer_pickup') && !handoff.walkthrough_completed_at && (
        <Card className="mt-6 space-y-4 p-4">
          <p className="font-medium">Condition walkthrough</p>
          <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
            <span>{CONSENT_COPY}</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Capture the item only. Do not film other people, children, or the inside of a private home beyond what this
            transaction needs — see the{' '}
            <Link to="/legal/handoff-terms" target="_blank" rel="noreferrer" className="underline">handoff terms</Link>.
          </p>
          {consent ? (
            <WalkthroughRecorder
              handoffId={handoff.id}
              onUploaded={async () => {
                await handoffOps({ action: 'record_consent', handoff_session_id: handoff.id }).catch(() => undefined);
                refresh();
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Confirm the notice above to enable the camera.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={busy === 'wt' || media.length === 0}
              onClick={() => run('wt', { action: 'complete_walkthrough', handoff_session_id: handoff.id }, 'Walkthrough documented.')}>
              Finish walkthrough
            </Button>
            <span className="text-xs text-muted-foreground">{media.length} file{media.length === 1 ? '' : 's'} stored</span>
          </div>
        </Card>
      )}

      {/* STEP 3 — buyer decision */}
      {handoff?.walkthrough_completed_at && !handoff.buyer_decision && isBuyer && (
        <Card className="mt-6 space-y-3 p-4">
          <p className="font-medium">How was the asset received?</p>
          <div className="grid gap-2">
            {([
              ['accepted', 'Accept asset', 'Condition matches what I expected.'],
              ['accepted_with_exceptions', 'Accept with exceptions', 'I am taking it, but something should be on the record.'],
              ['issue_reported', 'Report an issue / do not accept', 'Routes to Vendibook support. The transaction is not marked complete.'],
            ] as const).map(([value, label, help]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDecision(value)}
                className={`rounded-lg border p-3 text-left ${decision === value ? 'border-foreground bg-foreground/5' : 'border-border'}`}
              >
                <p className="font-medium">{label}</p>
                <p className="text-sm text-muted-foreground">{help}</p>
              </button>
            ))}
          </div>
          {decision && decision !== 'accepted' && (
            <>
              <Textarea placeholder="Describe what you found" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <p className="text-xs text-muted-foreground">Add photos or video above — they are stored with this record and timestamped.</p>
            </>
          )}
          <Button size="sm" disabled={!decision || busy === 'dec'}
            onClick={() => run('dec', { action: 'submit_decision', handoff_session_id: handoff.id, decision, notes }, 'Your decision was recorded.')}>
            {busy === 'dec' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Record decision
          </Button>
        </Card>
      )}

      {/* STEP 4 — summary + STEP 5 — signature */}
      {handoff?.buyer_decision && (
        <Card className="mt-6 space-y-4 p-4">
          <p className="font-medium">Handoff summary</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Fulfillment method</dt><dd>{handoff.mode.replace(/_/g, ' ')}</dd></div>
            <div><dt className="text-muted-foreground">Handoff time</dt><dd>{new Date(handoff.buyer_decision_at ?? handoff.started_at).toLocaleString()}</dd></div>
            <div><dt className="text-muted-foreground">Walkthrough recorded</dt><dd>{handoff.walkthrough_completed_at ? 'Yes' : 'No'}</dd></div>
            <div><dt className="text-muted-foreground">Media files</dt><dd>{media.length}</dd></div>
            <div><dt className="text-muted-foreground">Exceptions</dt><dd>{exceptions.length}</dd></div>
            <div><dt className="text-muted-foreground">Location documented</dt><dd>{(data?.fulfillment_sessions ?? []).some((s) => s.location_consent) ? 'Yes' : 'No'}</dd></div>
            <div><dt className="text-muted-foreground">Buyer decision</dt><dd>{handoff.buyer_decision.replace(/_/g, ' ')}</dd></div>
            <div><dt className="text-muted-foreground">Transaction reference</dt><dd className="font-mono text-xs">{(saleId ?? bookingId ?? '').slice(0, 8).toUpperCase()}</dd></div>
          </dl>

          {handoff.buyer_decision === 'issue_reported' && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
              <div>
                <p className="font-medium">An issue was reported at handoff.</p>
                <p className="text-muted-foreground">
                  This handoff stays open and the transaction is not marked complete. Continue in support so the
                  documented issue can be reviewed.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link to="/contact">Continue with support</Link>
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <FileSignature className="h-4 w-4" /> Handoff &amp; Condition Acknowledgment
            </p>
            <p className="text-sm text-muted-foreground">
              A separate document from the purchase agreement. It records what was handed over, when, and the
              buyer's condition decision — including any exceptions.
            </p>
            {signature?.status === 'signed' ? (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                Signed {signature.signed_at ? new Date(signature.signed_at).toLocaleString() : ''}
              </Badge>
            ) : signature?.status === 'not_configured' ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-700 dark:text-amber-300">
                Electronic signing is not set up in this environment yet, so this acknowledgment can't be signed
                here. Everything else on this handoff is recorded.
              </p>
            ) : (
              <Button size="sm" variant="outline" disabled={busy === 'sig'}
                onClick={() => run('sig', { action: 'request_signature', handoff_session_id: handoff.id })}>
                Request acknowledgment
              </Button>
            )}
          </div>

          {!completed && handoff.buyer_decision !== 'issue_reported' && (
            <Button disabled={busy === 'done'}
              onClick={() => run('done', { action: 'complete_handoff', handoff_session_id: handoff.id }, 'Handoff documented.')}>
              {busy === 'done' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Complete handoff
            </Button>
          )}
        </Card>
      )}

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Evidence &amp; Handoff</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Fulfillment and handoff were documented through Vendibook.
        </p>
        <EvidenceTimeline events={data.evidence} verified={completed} />
      </div>
    </div>
  );
}
