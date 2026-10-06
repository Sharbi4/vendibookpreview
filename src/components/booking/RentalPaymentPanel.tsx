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
import PayPalEmbeddedPayment from '@/components/transaction/checkout/PayPalEmbeddedPayment';

/**
 * Rental payment step. The server decides the processor per booking:
 * Square when the host has connected Square (the default for rentals), PayPal
 * only while the transition fallback is on. The browser never decides a
 * booking is paid; it reports what the server verified with Square.
 */
type Config =
  | { provider: 'square'; environment: 'sandbox' | 'production'; application_id: string; location_id: string;
      amount_cents: number; currency: string; host_business_name?: string | null }
  | { provider: 'paypal'; reason?: string }
  | { provider: 'unavailable'; reason?: string };

export interface RentalPaymentPanelProps {
  bookingId: string;
  listingId: string;
  hostId: string;
  listingHref: string;
  /** Display-only estimate; the charged amount always comes from the server. */
  totalUsd: number;
  flow: 'instant' | 'request';
  /** Where PayPal (fallback) returns after approval. */
  paypalReturnUrl: string;
  heading?: string;
  /** Prefills Square's buyer verification (3-D Secure) contact. */
  billingContact?: { givenName?: string; familyName?: string; email?: string; phone?: string;
    addressLines?: string[]; city?: string; state?: string; postalCode?: string; countryCode?: string };
  onPaid: (bookingId: string) => void;
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
  const { bookingId, listingId, hostId, listingHref, totalUsd, flow, paypalReturnUrl, heading, billingContact, onPaid } = props;
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
    invoke({ action: 'config', booking_id: bookingId })
      .then((c) => { if (!cancelled) setConfig(c as Config); })
      .catch((e) => { if (!cancelled) setConfigError((e as Error).message); });
    return () => { cancelled = true; };
  }, [bookingId]);

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
      });
      if (response?.status === 'paid' || response?.payment_status === 'paid') finish(bookingId);
      else void poll();
    } catch (e) {
      const err = e as Error & { code?: string; squareCode?: string };
      trackRentalCheckout('square_payment_failed', { listingId, bookingId, flow, provider: 'square', errorCode: err.squareCode || err.code || 'unknown' });
      // A declined card is final for this attempt: the next try is a new charge.
      if (err.code === 'payment_failed' || err.code === 'tokenize_failed') attemptKey.current = newAttemptKey();
      setError(err.message);
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

  if (config.provider === 'paypal') {
    return (
      <PayPalEmbeddedPayment
        target={{ kind: 'booking', id: bookingId }}
        sellerId={hostId}
        counterparty="host"
        listingHref={listingHref}
        returnUrl={paypalReturnUrl}
        totalUsd={totalUsd}
        heading={heading ?? 'Confirm and pay'}
        intent={flow === 'instant'
          ? 'Your booking is confirmed the moment your payment is verified.'
          : 'Pay now that the host has approved your request.'}
      />
    );
  }

  if (config.provider === 'unavailable') {
    return (
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
        <p className="text-sm font-medium text-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4 text-muted-foreground" /> Card payments aren't ready for this host yet</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your booking is saved and nothing was charged. Message the host from your booking to let them
          know, and come back to pay from the booking once their payment setup is finished.
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
