import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { parseEdgeError } from '@/lib/edgeErrors';
import { formatCurrency } from '@/lib/commissions';
import { loadSquareWebSdk, type SquareCard } from '@/lib/squareWebSdk';
import { trackRentalCheckout } from '@/lib/rentalCheckoutAnalytics';
import PaymentFormSkeleton from '@/components/checkout/PaymentFormSkeleton';
import CampusPartnerCodeField, { type AppliedPartnerCode } from '@/components/checkout/CampusPartnerCodeField';
import { trackCampusPartner } from '@/lib/campusPartnerAnalytics';

/**
 * Rental payment step: card payment through Square only. The server picks the
 * Square account (the host's own when connected, otherwise Vendibook's) and
 * the amount. The browser never decides a booking is paid; it reports what
 * the server verified with Square.
 */
type Config =
  | { provider: 'square'; environment: 'sandbox' | 'production'; application_id: string; location_id: string;
      amount_cents: number; currency: string; host_business_name?: string | null;
      partner?: { valid: true; code: string; partner_name: string; credit_cents: number }
        | { valid: false; reason?: string; message?: string } | null }
  | { provider: 'unavailable'; reason?: string };

export interface RentalPaymentPanelProps {
  bookingId: string;
  listingId: string;
  hostId: string;
  listingHref: string;
  /** Display-only estimate; the charged amount always comes from the server. */
  totalUsd: number;
  flow: 'instant' | 'request';
  heading?: string;
  /** Prefills Square's buyer verification (3-D Secure) contact. */
  billingContact?: { givenName?: string; familyName?: string; email?: string; phone?: string;
    addressLines?: string[]; city?: string; state?: string; postalCode?: string; countryCode?: string };
  onPaid: (bookingId: string) => void;
  /** Server-quoted total and Campus Partner credit, for the order summary. */
  onQuoteChange?: (quote: { amountCents: number; creditCents: number; partnerName: string | null }) => void;
}

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('square-rental-payment', { body });
  if (error) {
    const parsed = await parseEdgeError(error);
    const err = new Error(parsed?.message || 'Payment is unavailable right now. Nothing was charged.') as Error & { code?: string; squareCode?: string };
    err.code = parsed?.code ?? undefined;
    err.squareCode = (parsed?.raw as { square_code?: string } | null)?.square_code;
    throw err;
  }
  return data;
}

const newAttemptKey = () => crypto.randomUUID();

export default function RentalPaymentPanel(props: RentalPaymentPanelProps) {
  const { bookingId, listingId, flow, heading, billingContact, onPaid, onQuoteChange } = props;
  const [partner, setPartner] = useState<AppliedPartnerCode | null>(null);
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [cardReady, setCardReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const card = useRef<SquareCard | null>(null);
  const lock = useRef(false);
  /** Same key for retries of one attempt; a new key after a definitive decline. */
  const attemptKey = useRef(newAttemptKey());

  useEffect(() => {
    let cancelled = false;
    setConfig(null);
    setConfigError(null);
    invoke({ action: 'config', booking_id: bookingId, ...(partner ? { partner_code: partner.code } : {}) })
      .then((c) => {
        if (cancelled) return;
        const next = c as Config;
        if (next.provider === 'square' && partner) {
          if (next.partner?.valid) {
            trackCampusPartner('partner_credit_applied', { kind: 'rental', code: partner.code, listingId, creditCents: next.partner.credit_cents });
            setPartner((p) => p && { ...p, creditCents: next.partner && next.partner.valid ? next.partner.credit_cents : 0 });
          } else {
            // Keep checkout intact; only the code is dropped.
            trackCampusPartner('partner_code_invalid', { kind: 'rental', code: partner.code, listingId, reason: next.partner?.reason });
            setPartnerError(next.partner?.message || "That code can't be used on this booking.");
            setPartner(null);
            return;
          }
        }
        setConfig(next);
        if (next.provider === 'square') {
          const credit = next.partner && next.partner.valid ? next.partner.credit_cents : 0;
          onQuoteChange?.({ amountCents: next.amount_cents, creditCents: credit, partnerName: next.partner && next.partner.valid ? next.partner.partner_name : null });
        }
      })
      .catch((e) => { if (!cancelled) setConfigError((e as Error).message); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, partner?.code]);

  useEffect(() => {
    if (config?.provider !== 'square') return;
    let cancelled = false;
    let instance: SquareCard | undefined;
    setCardReady(false);
    void (async () => {
      const sdk = await loadSquareWebSdk(config.environment);
      if (cancelled) return;
      instance = await sdk.payments(config.application_id, config.location_id).card();
      if (cancelled) { await instance.destroy(); return; }
      await instance.attach(container.current);
      card.current = instance;
      setCardReady(true);
    })().catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; card.current = null; void instance?.destroy?.(); };
  }, [config]);

  const finish = useCallback((id: string) => {
    setPaid(true);
    trackRentalCheckout('payment_completed', { listingId, bookingId: id, flow, provider: 'square' });
    onPaid(id);
  }, [flow, listingId, onPaid]);

  /** Server-verified status polling for a payment Square is still settling. */
  const poll = useCallback(async () => {
    setVerifying(true);
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const s = await invoke({ action: 'status', booking_id: bookingId });
        if (s?.payment_status === 'paid') { setVerifying(false); finish(bookingId); return; }
        if (s?.record_status === 'failed' || s?.record_status === 'declined' || s?.record_status === 'cancelled') {
          setVerifying(false);
          attemptKey.current = newAttemptKey();
          setError("Your payment didn't go through and nothing was charged. Try again or use another card.");
          return;
        }
      } catch { /* keep polling */ }
    }
    setVerifying(false);
  }, [bookingId, finish]);

  const pay = async () => {
    if (lock.current || !card.current || config?.provider !== 'square') return;
    lock.current = true;
    setBusy(true);
    setError(null);
    trackRentalCheckout('payment_started', { listingId, bookingId, flow, provider: 'square', totalCents: config.amount_cents });
    if (partner) trackCampusPartner('partner_checkout_started', { kind: 'rental', code: partner.code, listingId, creditCents: partner.creditCents });
    try {
      const result = await card.current.tokenize({
        amount: (config.amount_cents / 100).toFixed(2),
        currencyCode: config.currency,
        intent: 'CHARGE',
        customerInitiated: true,
        sellerKeyedIn: false,
        ...(billingContact ? { billingContact } : {}),
      });
      if (result?.status !== 'OK' || !result.token) {
        throw Object.assign(new Error('Check your card details and try again.'), { code: 'tokenize_failed' });
      }
      const response = await invoke({
        action: 'pay',
        booking_id: bookingId,
        source_id: result.token,
        idempotency_key: attemptKey.current,
        ...(partner ? { partner_code: partner.code } : {}),
      });
      if (response?.status === 'paid' || response?.payment_status === 'paid') finish(bookingId);
      else void poll();
    } catch (e) {
      const err = e as Error & { code?: string; squareCode?: string };
      trackRentalCheckout('square_payment_failed', { listingId, bookingId, flow, provider: 'square', errorCode: err.squareCode || err.code || 'unknown' });
      // A declined card is final for this attempt: the next try is a new charge.
      if (err.code === 'payment_failed' || err.code === 'tokenize_failed') attemptKey.current = newAttemptKey();
      if (err.code === 'partner_code_invalid') {
        attemptKey.current = newAttemptKey();
        setPartnerError(err.message);
        setPartner(null);
      } else if (err.code === 'quote_changed') {
        attemptKey.current = newAttemptKey();
        setError(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  if (configError) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Payment couldn't load</p>
        <p className="mt-1 text-muted-foreground">{configError}</p>
        <Button variant="outline" className="mt-3" onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }
  if (!config) return <PaymentFormSkeleton />;

  if (config.provider === 'unavailable') {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
        <p className="text-sm font-medium text-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4 text-muted-foreground" /> Card payment is temporarily unavailable</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your booking is saved and nothing was charged. Please try again shortly from your booking,
          or contact support@vendibook.com and we'll help you finish.
        </p>
        <Link className="text-xs underline" to={`/dashboard/bookings/${bookingId}`}>Open your booking</Link>
      </div>
    );
  }

  if (paid) {
    return (
      <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        <p className="font-medium flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Payment confirmed</p>
        <p className="mt-1">Taking you to your booking…</p>
      </div>
    );
  }

  return (
    <section aria-label="Card payment" className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{heading ?? 'Pay with card'}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {config.host_business_name ? `Paid to ${config.host_business_name} through Square. ` : 'Processed securely by Square. '}
          Vendibook never sees or stores your card number.
        </p>
      </div>

      <CampusPartnerCodeField
        kind="rental"
        listingId={listingId}
        applied={partner}
        onApply={(next) => { setPartnerError(null); setPartner(next); attemptKey.current = newAttemptKey(); }}
        externalError={partnerError}
        disabled={busy || verifying}
      />
      {partner && partner.creditCents ? (
        <p className="text-xs text-muted-foreground">
          Campus Partner credit: <span className="font-medium text-foreground">-{formatCurrency(partner.creditCents / 100)}</span>, funded by Vendibook.
        </p>
      ) : null}

      <div ref={container} className="min-h-[96px]" aria-busy={!cardReady} />
      {!cardReady && !error ? <p className="text-xs text-muted-foreground">Loading secure card entry…</p> : null}

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-foreground">{error}</p>
      ) : null}

      {verifying ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Confirming your payment with Square. Please keep this page open.
        </p>
      ) : null}

      <Button
        type="button"
        className="checkout-primary-action w-full h-14 text-base rounded-xl font-semibold"
        onClick={pay}
        disabled={!cardReady || busy || verifying}
      >
        {busy ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing…</> : `Pay ${formatCurrency(config.amount_cents / 100)}`}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" /> Encrypted card entry by Square. You're charged once, only when you press Pay.
      </p>
    </section>
  );
}
