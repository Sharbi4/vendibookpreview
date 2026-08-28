import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  FileText,
  Loader2,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InsuranceEducationCard } from '@/components/booking/InsuranceEducationCard';
import { supabase } from '@/integrations/supabase/client';
import { openPlaidLink } from '@/lib/plaidLink';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Disclosure & verification — the last stop before payment.
 *
 * Everything shown here is server-resolved: the ACTIVE legal document versions,
 * the renter's recorded attestation, and the authoritative identity status. The
 * client never chooses a version and never decides that identity passed.
 *
 * The identity check is free for renters. No payment is initiated on this step.
 */

const INSURANCE_ANSWERS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unsure', label: 'Not sure' },
] as const;

type InsuranceAnswer = (typeof INSURANCE_ANSWERS)[number]['value'];

interface LegalDoc {
  id: string;
  document_type: string;
  version: string;
  title: string | null;
  slug: string | null;
  summary: string | null;
}

interface Attestation {
  attested_at: string;
  document_version: string | null;
  stale: boolean;
  insurance_answer: InsuranceAnswer | null;
}

interface IdentityState {
  status: string;
  verified: boolean;
  pending_review: boolean;
  can_retry: boolean;
  reused: boolean;
  available: boolean;
}

interface DisclosureStepProps {
  listingId: string;
  /** Bubbles the renter's insurance answer up so the booking payload keeps it. */
  onInsuranceAnswer?: (answer: InsuranceAnswer) => void;
  /** Fires once the attestation is recorded and identity is settled. */
  onComplete: (state: { attested: boolean; identityStatus: string }) => void;
  disabled?: boolean;
}

const DOC_LABELS: Record<string, string> = {
  renter_terms: 'Renter Terms',
  refund_cancellation_policy: 'Refund & Cancellation Policy',
  marketplace_rules: 'Marketplace Rules',
};

export function DisclosureStep({
  listingId,
  onInsuranceAnswer,
  onComplete,
  disabled,
}: DisclosureStepProps) {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<LegalDoc[]>([]);
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [identity, setIdentity] = useState<IdentityState | null>(null);
  const [insurance, setInsurance] = useState<InsuranceAnswer | ''>('');
  const [agreed, setAgreed] = useState(false);

  const call = useCallback(
    async (action: string) => {
      const { data, error: fnErr } = await supabase.functions.invoke('booking-verification', {
        body: { action, listingId, route: window.location.pathname },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data?.message ?? 'Something went wrong.');
      return data as {
        documents?: LegalDoc[];
        attestation?: Attestation | null;
        identity?: IdentityState;
        link_token?: string;
      };
    },
    [listingId],
  );

  const applyState = useCallback(
    (data: { documents?: LegalDoc[]; attestation?: Attestation | null; identity?: IdentityState }) => {
      if (data.documents) setDocuments(data.documents);
      if (data.identity) setIdentity(data.identity);
      if (data.attestation !== undefined) {
        setAttestation(data.attestation ?? null);
        if (data.attestation && !data.attestation.stale) {
          setAgreed(true);
          if (data.attestation.insurance_answer) setInsurance(data.attestation.insurance_answer);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await call('status');
        if (!cancelled) applyState(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'We could not load the terms. Please try again.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call, applyState]);

  const attested = Boolean(attestation && !attestation.stale);
  const identityDone = Boolean(identity?.verified || identity?.pending_review || !identity?.available);

  const handleAttest = async () => {
    if (!insurance || !agreed) return;
    setWorking(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('booking-verification', {
        body: {
          action: 'attest',
          listingId,
          insuranceAnswer: insurance,
          agreed: true,
          route: window.location.pathname,
          locale: navigator.language,
        },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data?.message ?? 'We could not record your agreement.');
      applyState(data);
      onInsuranceAnswer?.(insurance);
      toast.success('Agreement recorded');
    } catch (err) {
      // Recoverable: the step stays on screen with the retry affordance.
      setError(err instanceof Error ? err.message : 'We could not record your agreement.');
    } finally {
      setWorking(false);
    }
  };

  const runIdentity = async (retry: boolean) => {
    setWorking(true);
    setError(null);
    try {
      const data = await call(retry ? 'idv-retry' : 'idv-start');
      if (data.identity) setIdentity(data.identity);
      if (data.link_token) {
        const outcome = await openPlaidLink(data.link_token);
        if (outcome.errorMessage) setError(outcome.errorMessage);
        // The server, not Link, decides the outcome.
        const refreshed = await call('idv-refresh');
        applyState(refreshed);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'We could not start the identity check right now.',
      );
    } finally {
      setWorking(false);
    }
  };

  const refreshIdentity = async () => {
    setWorking(true);
    try {
      applyState(await call('idv-refresh'));
    } catch {
      /* keep last known state — never blank the flow */
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading the latest terms…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        A quick review before payment. These are the current terms for this booking, plus a free
        identity check that keeps hosts and renters safe.
      </p>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Terms */}
      <div className="space-y-3 rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">What you're agreeing to</h3>
        </div>
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-start gap-2 text-sm">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                {doc.slug ? (
                  <a
                    href={`/legal/${doc.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline underline-offset-4"
                  >
                    {doc.title || DOC_LABELS[doc.document_type] || doc.document_type}
                  </a>
                ) : (
                  <span className="font-medium">
                    {doc.title || DOC_LABELS[doc.document_type] || doc.document_type}
                  </span>
                )}
                <span className="text-muted-foreground"> · version {doc.version}</span>
                {doc.summary && (
                  <span className="block text-muted-foreground">{doc.summary}</span>
                )}
              </span>
            </li>
          ))}
          {documents.length === 0 && (
            <li className="text-sm text-muted-foreground">Terms are being updated — try again shortly.</li>
          )}
        </ul>
      </div>

      {/* Insurance disclosure — moved here so it sits with the other disclosures */}
      <div className="space-y-3 rounded-2xl border border-border p-4">
        <Label className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Do you currently have Commercial General Liability Insurance?
        </Label>
        <RadioGroup
          value={insurance}
          onValueChange={(val) => {
            setInsurance(val as InsuranceAnswer);
            onInsuranceAnswer?.(val as InsuranceAnswer);
            if (attested) setAgreed(false);
          }}
          className="grid grid-cols-3 gap-2"
          disabled={disabled || working}
        >
          {INSURANCE_ANSWERS.map((opt) => (
            <div key={opt.value} className="relative">
              <RadioGroupItem value={opt.value} id={`disc-ins-${opt.value}`} className="peer sr-only" />
              <Label
                htmlFor={`disc-ins-${opt.value}`}
                className={cn(
                  'flex cursor-pointer items-center justify-center rounded-xl border border-border p-3.5 text-sm transition-all',
                  'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5',
                  'hover:border-primary/50',
                )}
              >
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {(insurance === 'no' || insurance === 'unsure') && <InsuranceEducationCard />}
      </div>

      {/* Attestation */}
      <div className="space-y-3 rounded-2xl border border-border p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="disclosure-agree"
            checked={agreed}
            disabled={disabled || working}
            onCheckedChange={(checked) => setAgreed(checked === true)}
          />
          <Label htmlFor="disclosure-agree" className="cursor-pointer text-sm leading-relaxed">
            I have read and agree to the renter terms, refund and cancellation policy, and
            marketplace rules above, and my answers about insurance and intended use are accurate.
          </Label>
        </div>
        {attested ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <BadgeCheck className="h-4 w-4 text-primary" />
            Recorded {new Date(attestation!.attested_at).toLocaleString()} · version{' '}
            {attestation!.document_version}
          </p>
        ) : (
          <Button
            onClick={handleAttest}
            disabled={disabled || working || !insurance || !agreed || documents.length === 0}
            className="w-full sm:w-auto"
          >
            {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record my agreement
          </Button>
        )}
        {attestation?.stale && (
          <p className="text-sm text-amber-600">
            Our terms were updated since you last agreed. Please confirm again.
          </p>
        )}
      </div>

      {/* Identity */}
      {identity?.available && (
        <div className="space-y-3 rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">Identity check</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Free
            </span>
          </div>

          {identity.verified ? (
            <p className="text-sm text-muted-foreground">
              {identity.reused
                ? 'Your identity is already verified on Vendibook — nothing else to do.'
                : 'Identity verified. Thank you.'}
            </p>
          ) : identity.pending_review ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your check is under review. You can continue with your booking — we'll email you
                when it clears.
              </p>
              <Button variant="outline" size="sm" onClick={refreshIdentity} disabled={working}>
                <RefreshCw className={cn('mr-2 h-4 w-4', working && 'animate-spin')} />
                Check status
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Verify your identity with a photo ID. It takes about a minute and is free for
                renters.
              </p>
              <Button
                onClick={() => runIdentity(identity.can_retry)}
                disabled={disabled || working}
                variant={identity.can_retry ? 'outline' : 'default'}
              >
                {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {identity.can_retry ? 'Try the identity check again' : 'Start identity check'}
              </Button>
              {!identity.can_retry &&
                ['failed', 'expired', 'canceled'].includes(identity.status) && (
                  <p className="text-sm text-muted-foreground">
                    We couldn't confirm your identity. Message support and we'll help you finish.
                  </p>
                )}
            </div>
          )}
        </div>
      )}

      <Button
        className="h-12 w-full"
        disabled={disabled || working || !attested || !identityDone}
        onClick={() =>
          onComplete({ attested: true, identityStatus: identity?.status ?? 'not_available' })
        }
      >
        Continue to review
      </Button>
      {!identityDone && attested && (
        <p className="text-center text-xs text-muted-foreground">
          Finish the identity check to continue.
        </p>
      )}
    </div>
  );
}

export default DisclosureStep;
