import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, GraduationCap, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { parseEdgeError } from '@/lib/edgeErrors';
import { formatCurrency } from '@/lib/commissions';
import { normalizePartnerCode, trackCampusPartner } from '@/lib/campusPartnerAnalytics';

export interface AppliedPartnerCode {
  code: string;
  partnerName: string;
  promoCodeId?: string | null;
  /** Exact credit once the server has priced this transaction. */
  creditCents?: number;
  /** Rentals before the server quote: the code's percent and cap. */
  rentalPercent?: number;
  rentalCapCents?: number;
}

export interface PartnerCodeCheck {
  code: string;
  kind: 'rental' | 'purchase';
  listingId: string;
  bookingId?: string | null;
  saleTransactionId?: string | null;
  paymentMethod?: string | null;
}

interface CheckResult { ok: boolean; applied?: AppliedPartnerCode; reason?: string; message?: string }

/** Display check only; the payment functions re-validate before any charge. */
export async function checkPartnerCode(input: PartnerCodeCheck): Promise<CheckResult> {
  const { data, error } = await supabase.functions.invoke('campus-partner-code', {
    body: {
      code: input.code,
      kind: input.kind,
      listing_id: input.listingId,
      ...(input.bookingId ? { booking_id: input.bookingId } : {}),
      ...(input.saleTransactionId ? { sale_transaction_id: input.saleTransactionId } : {}),
      ...(input.paymentMethod ? { payment_method: input.paymentMethod } : {}),
    },
  });
  if (error) {
    const parsed = await parseEdgeError(error);
    return { ok: false, reason: parsed?.code ?? 'error', message: parsed?.message || "We couldn't check that code. Try again." };
  }
  if (!data?.valid) {
    return {
      ok: false,
      reason: data?.reason,
      message: data?.message || "That Campus Partner code isn't active. Check the code with your school or continue without it.",
    };
  }
  return {
    ok: true,
    applied: {
      code: data.code,
      partnerName: data.partner_name,
      promoCodeId: data.promo_code_id ?? null,
      creditCents: typeof data.credit_cents === 'number' ? data.credit_cents : undefined,
      rentalPercent: typeof data.rental_percent === 'number' ? data.rental_percent : undefined,
      rentalCapCents: typeof data.rental_cap_cents === 'number' ? data.rental_cap_cents : undefined,
    },
  };
}

const STORAGE_PREFIX = 'vb_campus_code:';

/**
 * Applied code kept for this browser tab (per booking or listing), so a reload
 * or a step change doesn't drop it. Storage can be unavailable; then it only
 * lives in memory.
 */
export function usePersistedPartnerCode(storageKey: string | null) {
  const read = (key: string | null): AppliedPartnerCode | null => {
    if (!key) return null;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed.code === 'string' && typeof parsed.partnerName === 'string' ? parsed : null;
    } catch {
      return null;
    }
  };
  const [applied, setAppliedState] = useState<AppliedPartnerCode | null>(() => read(storageKey));
  const keyRef = useRef(storageKey);
  useEffect(() => {
    if (keyRef.current !== storageKey) {
      keyRef.current = storageKey;
      setAppliedState(read(storageKey));
    }
  }, [storageKey]);
  const setApplied = useCallback((next: AppliedPartnerCode | null | ((prev: AppliedPartnerCode | null) => AppliedPartnerCode | null)) => {
    setAppliedState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      const key = keyRef.current;
      if (key) {
        try {
          if (value) window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
          else window.sessionStorage.removeItem(STORAGE_PREFIX + key);
        } catch { /* storage unavailable */ }
      }
      return value;
    });
  }, []);
  return [applied, setApplied] as const;
}

interface Props {
  kind: 'rental' | 'purchase';
  listingId: string;
  bookingId?: string | null;
  saleTransactionId?: string | null;
  paymentMethod?: string | null;
  applied: AppliedPartnerCode | null;
  onApply: (applied: AppliedPartnerCode | null) => void;
  /** Server message when the code was refused later (e.g. at payment). */
  externalError?: string | null;
  disabled?: boolean;
}

/**
 * Campus Partner code entry. Starts as a single "Have a school or partner
 * code?" link. Never clears the rest of checkout: an invalid code only shows
 * a message under this field.
 */
export default function CampusPartnerCodeField({
  kind, listingId, bookingId, saleTransactionId, paymentMethod, applied, onApply, externalError, disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revalidated = useRef(false);

  // A purchase code restored from this tab is re-checked once so the shown
  // credit matches what the server will charge.
  useEffect(() => {
    if (revalidated.current || !applied || kind !== 'purchase') return;
    revalidated.current = true;
    void checkPartnerCode({ code: applied.code, kind, listingId, saleTransactionId, paymentMethod }).then((res) => {
      if (res.ok && res.applied) onApply({ ...applied, ...res.applied });
      else { onApply(null); setError(res.message ?? null); setOpen(true); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied?.code, kind]);

  const apply = async () => {
    const code = normalizePartnerCode(value);
    if (code.length < 3) { setError('Enter your Campus Partner code.'); return; }
    setChecking(true);
    setError(null);
    trackCampusPartner('partner_code_entered', { kind, code, listingId });
    try {
      const res = await checkPartnerCode({ code, kind, listingId, bookingId, saleTransactionId, paymentMethod });
      if (!res.ok || !res.applied) {
        trackCampusPartner('partner_code_invalid', { kind, code, listingId, reason: res.reason });
        setError(res.message ?? null);
        return;
      }
      const ctx = { kind, code: res.applied.code, listingId, promoCodeId: res.applied.promoCodeId, partnerName: res.applied.partnerName };
      trackCampusPartner('partner_code_valid', ctx);
      // Rental credits are confirmed (and tracked) by the payment panel's server quote.
      if (kind === 'purchase' && typeof res.applied.creditCents === 'number') {
        trackCampusPartner('partner_credit_applied', { ...ctx, creditCents: res.applied.creditCents });
      }
      revalidated.current = true;
      onApply(res.applied);
      setValue('');
    } finally {
      setChecking(false);
    }
  };

  const remove = () => {
    if (applied) {
      trackCampusPartner('partner_credit_removed', {
        kind, code: applied.code, listingId, promoCodeId: applied.promoCodeId, partnerName: applied.partnerName, creditCents: applied.creditCents,
      });
    }
    onApply(null);
    setError(null);
  };

  if (applied) {
    const credit = applied.creditCents ?? 0;
    const pending = !credit && kind === 'rental' && applied.rentalPercent
      ? `${applied.rentalPercent}% off the rental subtotal${applied.rentalCapCents ? `, up to ${formatCurrency(applied.rentalCapCents / 100)}` : ''}`
      : null;
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-sm" role="status" data-testid="campus-partner-applied">
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-start gap-1.5 font-medium text-foreground">
            <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
            <span>{applied.partnerName} <span className="font-normal text-muted-foreground">Campus Partner benefit applied</span></span>
          </p>
          <button
            type="button"
            onClick={remove}
            disabled={disabled}
            className="shrink-0 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
          >
            Remove
          </button>
        </div>
        <div className="mt-1 pl-[22px] text-xs text-muted-foreground space-y-0.5">
          {credit > 0 ? (
            <p>Campus Partner credit: <span className="font-semibold text-foreground">-{formatCurrency(credit / 100)}</span></p>
          ) : pending ? <p>{pending}</p> : null}
          <p>Code <span className="font-mono">{applied.code}</span> · Funded by Vendibook</p>
        </div>
      </div>
    );
  }

  const shownError = error ?? externalError ?? null;
  if (!open && !shownError) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
      >
        <GraduationCap className="h-4 w-4" aria-hidden /> Have a school or partner code?
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`campus-code-${kind}`} className="text-sm">
        School or partner code <span className="text-muted-foreground font-normal">(optional)</span>
      </Label>
      <div className="flex gap-2">
        <Input
          id={`campus-code-${kind}`}
          value={value}
          onChange={(e) => { setValue(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void apply(); } }}
          placeholder="e.g. SCHOOL27"
          className="font-mono uppercase tracking-wider"
          style={{ fontSize: '16px' }}
          maxLength={40}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={disabled || checking}
          aria-invalid={!!shownError}
          aria-describedby={shownError ? `campus-code-${kind}-error` : undefined}
        />
        <Button type="button" variant="outline" onClick={apply} disabled={disabled || checking || !value.trim()}>
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
        </Button>
      </div>
      {shownError ? <p id={`campus-code-${kind}-error`} role="alert" className="text-xs text-destructive">{shownError}</p> : null}
    </div>
  );
}
