import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/commissions';
import {
  CAMPUS_FALLBACK_ERROR,
  campusCodeRequest,
  type CampusCheckoutKind,
  type CampusCodeState,
  trackCampus,
} from '@/lib/campusPartner';

interface PartnerCodeFieldProps {
  kind: CampusCheckoutKind;
  /** booking_requests.id or sale_transactions.id */
  targetId: string;
  listingId?: string | null;
  disabled?: boolean;
  /** Called with the server's view whenever the applied code changes. */
  onChange?: (state: CampusCodeState | null) => void;
}

/**
 * Optional "School or partner code" section. A bad or expired code only
 * shows a short message: checkout state is never cleared, and the shopper
 * can always continue without a code.
 */
export default function PartnerCodeField({ kind, targetId, listingId, disabled, onChange }: PartnerCodeFieldProps) {
  const [value, setValue] = useState('');
  const [applied, setApplied] = useState<CampusCodeState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Restore a code applied earlier (refresh, back navigation).
  useEffect(() => {
    let cancelled = false;
    campusCodeRequest('status', kind, targetId)
      .then((s) => {
        if (cancelled) return;
        if (s.applied) {
          setApplied(s);
          onChangeRef.current?.(s);
        } else if (s.notice) {
          setMessage(s.notice);
          onChangeRef.current?.(null);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [kind, targetId]);

  const apply = async () => {
    const code = value.trim();
    if (!code || busy) return;
    setBusy(true);
    setMessage(null);
    trackCampus('partner_code_entered', { kind, targetId, listingId });
    try {
      const s = await campusCodeRequest('apply', kind, targetId, code);
      if (s.ok && s.applied) {
        setApplied(s);
        setValue('');
        trackCampus('partner_code_valid', { kind, targetId, listingId, codeId: s.code_id, partnerSlug: s.partner_slug });
        trackCampus('partner_credit_applied', {
          kind, targetId, listingId, codeId: s.code_id, partnerSlug: s.partner_slug, creditCents: s.credit_cents,
        });
        onChange?.(s);
      } else {
        setMessage(s.message || CAMPUS_FALLBACK_ERROR);
        trackCampus('partner_code_invalid', { kind, targetId, listingId, reason: s.code_error ?? 'invalid' });
        // An earlier valid code stays applied.
        if (s.applied) { setApplied(s); onChange?.(s); }
      }
    } catch {
      setMessage("We couldn't check that code right now. You can continue without it or try again.");
      trackCampus('partner_code_invalid', { kind, targetId, listingId, reason: 'unavailable' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await campusCodeRequest('remove', kind, targetId);
      trackCampus('partner_credit_removed', {
        kind, targetId, listingId, codeId: applied?.code_id, partnerSlug: applied?.partner_slug,
      });
      setApplied(null);
      onChange?.(null);
    } catch {
      setMessage("We couldn't remove the code right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="School or partner code" className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h4 className="text-sm font-medium text-foreground">School or partner code</h4>
        <span className="text-xs text-muted-foreground">Optional</span>
      </div>

      {applied?.applied ? (
        <div role="status" className="flex items-start justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
          <div className="min-w-0 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              {applied.partner_name ? `${applied.partner_name} Campus Partner benefit applied` : 'Campus Partner benefit applied'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Code {applied.code} · Campus Partner credit −{formatCurrency(applied.credit_cents / 100)}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-foreground underline underline-offset-2 disabled:opacity-50"
            onClick={remove}
            disabled={busy || disabled}
          >
            Remove
          </button>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); void apply(); }}
        >
          <label htmlFor={`partner-code-${targetId}`} className="sr-only">School or partner code</label>
          <Input
            id={`partner-code-${targetId}`}
            value={value}
            onChange={(e) => { setValue(e.target.value); if (message) setMessage(null); }}
            placeholder="e.g. PIMA27"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            disabled={busy || disabled}
            aria-invalid={!!message}
            aria-describedby={message ? `partner-code-msg-${targetId}` : undefined}
            className="h-10 uppercase placeholder:normal-case"
          />
          <Button type="submit" variant="outline" className="h-10 shrink-0" disabled={busy || disabled || !value.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Checking code" /> : 'Apply'}
          </Button>
        </form>
      )}

      {message ? (
        <p id={`partner-code-msg-${targetId}`} role="alert" className="text-xs text-muted-foreground">{message}</p>
      ) : null}
    </section>
  );
}
