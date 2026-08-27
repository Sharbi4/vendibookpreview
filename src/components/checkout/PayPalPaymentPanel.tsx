import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, Lock, ShieldCheck, X } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { loadPayPalSdk } from '@/lib/paypalClient';
import { TRUST_COPY } from '@/lib/transactionVocabulary';
import { PayPalMonogram } from '@/components/brand/ProviderLogos';
import PaymentFormSkeleton from './PaymentFormSkeleton';
import TrustRow from './TrustRow';

export type PayPalCheckoutTarget =
  | { kind: 'sale'; id: string }
  | { kind: 'booking'; id: string }
  | { kind: 'product'; slug: string; listing_id?: string }
  | { kind: 'freight'; id: string }
  | { kind: 'notary'; id: string }
  | { kind: 'protected_sale_deposit'; id: string }
  | { kind: 'concierge'; id: string };


interface PayPalPaymentPanelProps {
  /** What is being paid for. Amounts are always re-derived server-side. */
  target: PayPalCheckoutTarget;
  /** Optional order-summary node rendered above the PayPal buttons. */
  summary?: ReactNode;
  /** Called when the buyer dismisses the panel without paying. */
  onClose: () => void;
  /** Where to send the buyer after a verified capture. */
  returnUrl?: string;
  /** Called once the server confirms the capture. */
  onSuccess?: (result: {
    reference?: string;
    capture_id?: string;
    pending?: boolean;
    authorized?: boolean;
    message?: string;
  }) => void;
  /** Total in USD — used for Pay Later messaging. */
  totalUsd?: number;
}

type PanelState =
  | 'loading'
  /** No session — PayPal cannot be started until the payer signs in. */
  | 'signin'

  | 'ready'
  | 'processing'
  | 'success'
  | 'pending'
  /** PayPal is holding the funds; nothing has been charged yet. */
  | 'authorized'
  | 'error';

/**
 * Vendibook-branded PayPal checkout in a dark-glass modal. Buyers pay with
 * PayPal, Venmo, Pay Later or a card through PayPal's hosted fields without
 * leaving vendibook.com. Nothing is confirmed until the server verifies the
 * capture — the SDK's onApprove callback alone is never treated as payment.
 */
const PayPalPaymentPanel = ({
  target,
  summary,
  onClose,
  returnUrl,
  onSuccess,
  totalUsd,
}: PayPalPaymentPanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const cardNameRef = useRef<HTMLDivElement>(null);
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const cardExpiryRef = useRef<HTMLDivElement>(null);
  const cardCvvRef = useRef<HTMLDivElement>(null);
  const cardFieldsRef = useRef<any>(null);
  const [state, setState] = useState<PanelState>('loading');
  const [error, setError] = useState<{ title: string; detail: string } | null>(null);
  /** Card entry (no PayPal account needed) — mounted lazily when opened. */
  const [cardEligible, setCardEligible] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardSubmitting, setCardSubmitting] = useState(false);
  /**
   * Set from the server's create-order response. The server alone decides
   * whether this checkout captures now or places a temporary hold.
   */
  const intentRef = useRef<'CAPTURE' | 'AUTHORIZE'>('CAPTURE');
  const [holdMessage, setHoldMessage] = useState<string | null>(null);
  const stateRef = useRef<PanelState>('loading');
  stateRef.current = state;


  // ESC to close + lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stateRef.current !== 'processing') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // ── Shared payment handlers (used by both the PayPal buttons and the
  //    "pay with a card" fields, so a card payer follows the exact same
  //    server-verified create → capture path). ─────────────────────────────
  const fail = (title: string, detail: string) => {
    setError({ title, detail });
    setState('error');
  };

  const startOrder = async (): Promise<string> => {
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke('paypal-create-order', {
      body: target,
    });
    if (fnError || !data?.order_id) {
      const message = data?.message || fnError?.message ||
        'We could not start this payment. Please try again.';
      fail('Payment could not be started', message);
      throw new Error(message);
    }
    intentRef.current = data.payment_intent === 'AUTHORIZE' ? 'AUTHORIZE' : 'CAPTURE';
    setHoldMessage(typeof data.buyer_message === 'string' ? data.buyer_message : null);
    return data.order_id as string;
  };

  const finishOrder = async (orderID: string) => {
    setState('processing');

    // AUTHORIZE flow: place the temporary hold. No money moves until the
    // transaction is confirmed and the hold is captured server-side.
    if (intentRef.current === 'AUTHORIZE') {
      const { data: auth, error: authErr } = await supabase.functions.invoke(
        'paypal-authorize-order',
        { body: { order_id: orderID } },
      );
      if (authErr || !auth || (auth.status !== 'authorized' && auth.status !== 'completed')) {
        setState('error');
        setError({
          title: 'Payment not authorized',
          detail: auth?.message || authErr?.message ||
            'We could not authorize this payment and nothing has been charged. Please try again or use another method.',
        });
        return;
      }
      setHoldMessage(auth.message ?? null);
      setState('authorized');
      onSuccess?.({ reference: auth.reference, authorized: true, message: auth.message });
      setTimeout(() => {
        if (returnUrl) window.location.href = returnUrl;
      }, 1400);
      return;
    }

    const { data: result, error: fnError } = await supabase.functions.invoke(
      'paypal-capture-order',
      { body: { order_id: orderID } },
    );

    if (fnError || !result || (result.status !== 'completed' && !result.pending)) {
      setState('error');
      setError({
        title: 'Payment not completed',
        detail: result?.message || fnError?.message ||
          'Your payment was not completed and nothing has been confirmed. You have not been charged twice — try again or use another method.',
      });
      return;
    }

    if (result.pending) {
      setState('pending');
      onSuccess?.(result);
      return;
    }

    setState('success');
    onSuccess?.(result);
    setTimeout(() => {
      if (returnUrl) window.location.href = returnUrl;
    }, 900);
  };

  const handlersRef = useRef({ startOrder, finishOrder, fail });
  handlersRef.current = { startOrder, finishOrder, fail };

  // Mount the PayPal Buttons once — but only for a signed-in payer. Every
  // `paypal-create-order` call requires a session, so rendering the buttons to
  // a signed-out visitor would open PayPal and then fail after the fact.
  useEffect(() => {
    let cancelled = false;
    let instance: any = null;

    const fail = (title: string, detail: string) => {
      if (cancelled) return;
      setError({ title, detail });
      setState('error');
    };


    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return null;
        if (!data.session) {
          setState('signin');
          return null;
        }
        return loadPayPalSdk();
      })
      .then((paypal) => {
        if (!paypal) return;

        if (cancelled || !buttonsRef.current) return;

        if (paypal.Messages && messagesRef.current && (totalUsd ?? 0) >= 50) {
          try {
            paypal
              .Messages({ amount: totalUsd, placement: 'payment', style: { layout: 'text' } })
              .render(messagesRef.current);
          } catch {
            /* Pay Later messaging is non-critical. */
          }
        }

        if (paypal.CardFields) {
          try {
            const cf = paypal.CardFields({
              style: {
                input: { 'font-size': '16px', color: '#111111' },
                '.invalid': { color: '#b3261e' },
              },
              createOrder: () => handlersRef.current.startOrder(),
              onApprove: (d: { orderID: string }) => handlersRef.current.finishOrder(d.orderID),
              onError: () =>
                handlersRef.current.fail(
                  'Card payment failed',
                  'That card could not be charged. No money was taken — check the details or try another card.',
                ),
            });
            if (cf.isEligible?.()) {
              cardFieldsRef.current = cf;
              if (!cancelled) setCardEligible(true);
            }
          } catch {
            /* Card fields are an enhancement; PayPal buttons still work. */
          }
        }

        instance = paypal.Buttons({
          style: { layout: 'vertical', shape: 'rect', height: 48, label: 'pay' },

          createOrder: () => handlersRef.current.startOrder(),

          onApprove: (data: { orderID: string }) => handlersRef.current.finishOrder(data.orderID),

          onCancel: () => {
            setState('ready');
            setError({
              title: 'Payment cancelled',
              detail: 'You closed the PayPal window. Nothing has been charged or confirmed.',
            });
          },

          onError: () => {
            fail(
              'PayPal had a problem',
              'PayPal could not complete this payment right now. No charge was made — please try again in a moment.',
            );
          },
        });

        if (!instance.isEligible?.()) {
          fail('PayPal unavailable', 'PayPal checkout is not available in this browser.');
          return;
        }

        return instance.render(buttonsRef.current).then(() => {
          if (!cancelled) setState('ready');
        });

      })
      .catch((err: unknown) => {
        fail(
          'Checkout unavailable',
          err instanceof Error ? err.message : 'We could not load PayPal. Please try again.',
        );
      });

    return () => {
      cancelled = true;
      try {
        instance?.close?.();
      } catch {
        /* already unmounted */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render the hosted card inputs only once the payer opens the card option.
  useEffect(() => {
    if (!cardOpen || !cardFieldsRef.current) return;
    const cf = cardFieldsRef.current;
    if (cf.__mounted) return;
    cf.__mounted = true;
    try {
      cf.NameField().render(cardNameRef.current);
      cf.NumberField().render(cardNumberRef.current);
      cf.ExpiryField().render(cardExpiryRef.current);
      cf.CVVField().render(cardCvvRef.current);
    } catch {
      cf.__mounted = false;
      setCardEligible(false);
    }
  }, [cardOpen]);

  const submitCard = async () => {
    if (!cardFieldsRef.current) return;
    setCardSubmitting(true);
    setError(null);
    try {
      await cardFieldsRef.current.submit();
    } catch {
      fail(
        'Card details could not be submitted',
        'Please double-check the card number, expiry and security code, then try again.',
      );
    } finally {
      setCardSubmitting(false);
    }
  };



  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Secure checkout"
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md overflow-y-auto"
    >
      <div className="min-h-full flex items-stretch md:items-center justify-center md:py-6 md:px-4">
        <div
          ref={containerRef}
          className="relative w-full md:max-w-lg md:rounded-2xl rounded-t-2xl border border-border/60 bg-card shadow-2xl mt-6 md:mt-0 flex flex-col max-h-[calc(100dvh-1.5rem)] md:max-h-[calc(100dvh-3rem)]"
        >
          <button
            type="button"
            onClick={onClose}
            disabled={state === 'processing'}
            aria-label="Close checkout"
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors z-10 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="px-6 pt-6 pb-4 border-b border-border/60 flex-shrink-0">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-base font-semibold">Secure checkout</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> {TRUST_COPY.short}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {summary ? <div className="px-6 py-4 border-b border-border/60">{summary}</div> : null}

            <div className="px-6 py-5 space-y-4">
              {state === 'success' ? (
                <div className="py-10 flex flex-col items-center justify-center text-center animate-fade-in">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    <div className="relative h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center border border-primary/30">
                      <CheckCircle2 className="h-9 w-9 text-primary" />
                    </div>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-foreground">Payment confirmed</p>
                  <p className="text-xs text-muted-foreground mt-1">Redirecting to your receipt…</p>
                </div>
              ) : state === 'authorized' ? (
                <div className="py-10 flex flex-col items-center justify-center text-center animate-fade-in">
                  <div className="relative h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center border border-primary/30">
                    <ShieldCheck className="h-9 w-9 text-primary" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-foreground">
                    Payment authorized — not charged yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {holdMessage ??
                      'PayPal is holding these funds temporarily. You are only charged once this transaction is confirmed.'}
                  </p>
                </div>
              ) : state === 'pending' ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-base font-semibold text-foreground">Payment is being reviewed</p>
                  <p className="text-xs text-muted-foreground">
                    PayPal is still clearing this payment. We'll email you the moment it settles —
                    nothing further is needed from you.
                  </p>
                </div>

              ) : (
                <>
                  <div ref={messagesRef} />

                  {state === 'loading' ? <PaymentFormSkeleton /> : null}

                  <div
                    ref={buttonsRef}
                    className={state === 'loading' || state === 'processing' ? 'hidden' : ''}
                  />

                  {cardEligible && state !== 'loading' && state !== 'processing' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="h-px flex-1 bg-border/60" />
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          or
                        </span>
                        <span className="h-px flex-1 bg-border/60" />
                      </div>

                      {!cardOpen ? (
                        <button
                          type="button"
                          onClick={() => setCardOpen(true)}
                          className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
                        >
                          Pay with debit or credit card
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground">
                            No PayPal account needed. Your card is entered directly with PayPal.
                          </p>
                          <div ref={cardNameRef} className="paypal-card-field" />
                          <div ref={cardNumberRef} className="paypal-card-field" />
                          <div className="grid grid-cols-2 gap-3">
                            <div ref={cardExpiryRef} className="paypal-card-field" />
                            <div ref={cardCvvRef} className="paypal-card-field" />
                          </div>
                          <button
                            type="button"
                            onClick={submitCard}
                            disabled={cardSubmitting}
                            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 transition-opacity"
                          >
                            {cardSubmitting ? 'Processing…' : 'Pay with card'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}



                  {state === 'processing' ? (
                    <div className="py-8 flex flex-col items-center gap-3 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-sm font-medium text-foreground">Confirming your payment…</p>
                      <p className="text-xs text-muted-foreground">
                        Please keep this window open. Don't refresh or press back.
                      </p>
                    </div>
                  ) : null}

                  {error ? (
                    <div
                      role="alert"
                      className="rounded-xl border border-destructive/40 bg-destructive/[0.06] px-4 py-3 text-sm space-y-1"
                    >
                      <p className="font-semibold text-foreground">{error.title}</p>
                      <p className="text-xs text-muted-foreground">{error.detail}</p>
                    </div>
                  ) : null}

                  <p className="text-[11px] text-muted-foreground text-center inline-flex w-full items-center justify-center gap-1.5">
                    Payments are processed securely by
                    <PayPalMonogram className="h-3.5" />
                    PayPal. Vendibook never sees your card number.
                  </p>
                </>
              )}

              <TrustRow />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayPalPaymentPanel;
