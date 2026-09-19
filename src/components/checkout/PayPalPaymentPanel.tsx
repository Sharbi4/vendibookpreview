import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, Lock, ShieldCheck, X } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { loadPayPalAuthorizeSdk, loadPayPalSdk } from '@/lib/paypalClient';
import { parseEdgeError } from '@/lib/edgeErrors';
import { authPath } from '@/lib/auth/returnTo';
import { TRUST_COPY } from '@/lib/transactionVocabulary';

import PayPalPayLaterMessage from '@/components/payments/PayPalPayLaterMessage';
import WalletPayButtons from './WalletPayButtons';

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
  /**
   * 'modal' (default) keeps the historic dark-glass overlay. 'embedded' renders
   * the exact same server-verified flow inline inside a checkout page section.
   */
  variant?: 'modal' | 'embedded';
  /** Connected seller's PayPal merchant id, when the order is routed to them. */
  merchantId?: string | null;
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
  variant = 'modal',
  merchantId,
}: PayPalPaymentPanelProps) => {
  const embedded = variant === 'embedded';
  const containerRef = useRef<HTMLDivElement>(null);
  const paypalButtonRef = useRef<HTMLDivElement>(null);
  const venmoButtonRef = useRef<HTMLDivElement>(null);
  const payLaterButtonRef = useRef<HTMLDivElement>(null);
  const cardButtonRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PanelState>('loading');
  const [error, setError] = useState<{ title: string; detail: string } | null>(null);
  const [walletsAvailable, setWalletsAvailable] = useState(false);
  /** Funding sources PayPal actually rendered for this buyer/device. */
  const [eligible, setEligible] = useState<Record<string, boolean>>({});
  const [reloadKey, setReloadKey] = useState(0);
  // null until `paypal-checkout-intent` answers. Nothing intent-specific
  // (Pay Later messaging, wallets) may load before that, or the browser would
  // pull a CAPTURE bundle into an AUTHORIZE checkout.
  const [sdkIntent, setSdkIntent] = useState<'CAPTURE' | 'AUTHORIZE' | null>(null);
  /**
   * Set from the server's create-order response. The server alone decides
   * whether this checkout captures now or places a temporary hold.
   */
  const intentRef = useRef<'CAPTURE' | 'AUTHORIZE'>('CAPTURE');
  const [holdMessage, setHoldMessage] = useState<string | null>(null);
  const stateRef = useRef<PanelState>('loading');
  stateRef.current = state;

  // A payer sent back here after PayPal declined or abandoned the payment
  // arrives with the reason stashed by the return page. Surface it in red on
  // the payment step, then clear it so a reload doesn't repeat a stale notice.
  useEffect(() => {
    let stashed: string | null = null;
    try {
      stashed = sessionStorage.getItem('pp-decline');
      if (stashed) sessionStorage.removeItem('pp-decline');
    } catch {
      stashed = null;
    }
    if (stashed) {
      setError({ title: 'Payment declined', detail: stashed });
    }
  }, []);




  // ESC to close + lock body scroll while open (modal presentation only).
  useEffect(() => {
    if (embedded) return;
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
  }, [onClose, embedded]);

  // ── Shared payment handlers (used by both the PayPal buttons and the
  //    "pay with a card" fields, so a card payer follows the exact same
  //    server-verified create → capture path). ─────────────────────────────
  const fail = (title: string, detail: string) => {
    setError({ title, detail });
    setState('error');
  };

  const startOrder = async (): Promise<string> => {
    setError(null);
    // Remember where the payer left so a declined/abandoned PayPal return can
    // put them straight back on this payment step instead of a dead end.
    try {
      sessionStorage.setItem(
        'pp-checkout-return',
        `${window.location.pathname}${window.location.search}`,
      );
    } catch {
      /* storage unavailable — the return page falls back to its own screen */
    }

    // Re-check the session right before creating the order: a token that
    // expired while the panel sat open would otherwise surface as a generic
    // PayPal failure after the payer already opened the window.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setState('signin');
      throw new Error('Please sign in to continue.');
    }
    const { data, error: fnError } = await supabase.functions.invoke('paypal-create-order', {
      body: target,
    });
    if (fnError || !data?.order_id) {
      // A non-2xx response hides the server's reason inside `fnError.context`,
      // so parse it — otherwise every failure reads "please try again".
      const parsed = await parseEdgeError(fnError, data?.error ? data : null);
      if (parsed.code === 'unauthenticated' || parsed.status === 401) {
        setState('signin');
        throw new Error('Please sign in to continue.');
      }
      const message = parsed.message ||
        'We could not start this payment. Please try again.';
      fail('Payment could not be started', message);
      throw new Error(message);
    }


    intentRef.current = data.payment_intent === 'AUTHORIZE' ? 'AUTHORIZE' : 'CAPTURE';
    setHoldMessage(typeof data.buyer_message === 'string' ? data.buyer_message : null);
    return data.order_id as string;
  };

  /**
   * Last-resort reconciliation. The payer already approved at PayPal, so a
   * failed authorize/capture call is not proof that nothing happened: ask the
   * server to re-check the order against PayPal before telling the buyer it
   * failed. Returns true when the payment is in fact settled or held.
   */
  /**
   * A verified payment always resolves to the real receipt for its reference.
   * `returnUrl` is only a fallback for flows that produce no payment record.
   */
  const goToResult = (reference?: string) => {
    const destination = reference ? `/receipt/${reference}` : returnUrl;
    if (destination) window.location.href = destination;
  };

  const reconcile = async (orderID: string): Promise<boolean> => {
    const { data, error } = await supabase.functions.invoke('paypal-finalize-order', {
      body: { order_id: orderID },
    });
    if (error || !data?.status) return false;

    if (data.status === 'completed') {
      setState('success');
      onSuccess?.({ reference: data.reference, capture_id: undefined });
      setTimeout(() => goToResult(data.reference), 900);
      return true;
    }
    if (data.status === 'authorized') {
      setHoldMessage(data.message ?? null);
      setState('authorized');
      onSuccess?.({ reference: data.reference, authorized: true, message: data.message });
      setTimeout(() => goToResult(data.reference), 1400);
      return true;
    }
    if (data.status === 'pending') {
      setState('pending');
      onSuccess?.({ reference: data.reference, pending: true, message: data.message });
      // Pending is not paid, but it IS a real record: the receipt states the
      // pending status honestly rather than a second confirmation screen.
      setTimeout(() => goToResult(data.reference), 1400);
      return true;
    }
    return false;
  };

  /**
   * Returns 'restart' when PayPal reported a recoverable funding failure
   * (e.g. INSTRUMENT_DECLINED): the payer keeps the PayPal window open and
   * picks another funding source via `actions.restart()`. Nothing is marked
   * paid in that case.
   */
  const finishOrder = async (orderID: string): Promise<'restart' | void> => {
    setState('processing');

    // AUTHORIZE flow: place the temporary hold. No money moves until the
    // transaction is confirmed and the hold is captured server-side.
    if (intentRef.current === 'AUTHORIZE') {
      const { data: auth, error: authErr } = await supabase.functions.invoke(
        'paypal-authorize-order',
        { body: { order_id: orderID } },
      );
      if (authErr || !auth || (auth.status !== 'authorized' && auth.status !== 'completed')) {
        if (await reconcile(orderID)) return;
        const parsed = await parseEdgeError(authErr, auth?.error ? auth : null);
        if (parsed.raw?.recoverable === true) {
          setState('ready');
          setError({
            title: 'That payment method was declined',
            detail: parsed.message ||
              'PayPal declined that payment method. Nothing was charged — choose another one.',
          });
          return 'restart';
        }
        setState('error');
        setError({
          title: 'Payment not authorized',
          detail: auth?.message || parsed.message ||
            'We could not authorize this payment and nothing has been charged. Please try again or use another method.',
        });
        return;
      }
      setHoldMessage(auth.message ?? null);
      setState('authorized');
      onSuccess?.({ reference: auth.reference, authorized: true, message: auth.message });
      setTimeout(() => goToResult(auth.reference), 1400);
      return;
    }

    const { data: result, error: fnError } = await supabase.functions.invoke(
      'paypal-capture-order',
      { body: { order_id: orderID } },
    );

    if (fnError || !result || (result.status !== 'completed' && !result.pending)) {
      if (await reconcile(orderID)) return;
      const parsed = await parseEdgeError(fnError, result?.error ? result : null);
      if (parsed.raw?.recoverable === true) {
        setState('ready');
        setError({
          title: 'That payment method was declined',
          detail: parsed.message ||
            'PayPal declined that payment method. Nothing was charged — choose another one.',
        });
        return 'restart';
      }
      setState('error');
      setError({
        title: 'Payment not completed',
        detail: result?.message || parsed.message ||
          'Your payment was not completed and nothing has been confirmed. You have not been charged twice — try again or use another method.',
      });
      return;
    }


    if (result.pending) {
      setState('pending');
      onSuccess?.(result);
      setTimeout(() => goToResult(result.reference), 1400);
      return;
    }

    setState('success');
    onSuccess?.(result);
    setTimeout(() => goToResult(result.reference), 900);
  };

  const handlersRef = useRef({ startOrder, finishOrder, fail });
  handlersRef.current = { startOrder, finishOrder, fail };

  // Mount the PayPal Buttons once — but only for a signed-in payer. Every
  // `paypal-create-order` call requires a session, so rendering the buttons to
  // a signed-out visitor would open PayPal and then fail after the fact.
  useEffect(() => {
    let cancelled = false;
    const instances: any[] = [];

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
        // Cached per-target for a few minutes so returning to the payment
        // step doesn't re-wait on the intent check before the SDK loads.
        const cacheKey = `pp-intent:${target.kind}:${'id' in target ? target.id : target.slug}`;
        try {
          const raw = sessionStorage.getItem(cacheKey);
          if (raw) {
            const cached = JSON.parse(raw) as { intent?: string; at?: number };
            if ((cached.intent === 'AUTHORIZE' || cached.intent === 'CAPTURE') &&
                typeof cached.at === 'number' && Date.now() - cached.at < 5 * 60_000) {
              return { data: { intent: cached.intent }, error: null };
            }
          }
        } catch { /* cache unreadable — fetch fresh */ }
        return supabase.functions.invoke('paypal-checkout-intent', { body: target })
          .then((res) => {
            if (!res.error && (res.data?.intent === 'AUTHORIZE' || res.data?.intent === 'CAPTURE')) {
              try {
                sessionStorage.setItem(cacheKey, JSON.stringify({ intent: res.data.intent, at: Date.now() }));
              } catch { /* storage full/blocked — ignore */ }
            }
            return res;
          });
      })
      .then(async (result) => {
        if (!result) return null;
        if (result.error || !result.data?.intent) {
          const parsed = await parseEdgeError(result.error, result.data?.error ? result.data : null);
          throw new Error(parsed.message || 'We could not check payment availability. Please try again.');
        }
        const intent = result.data.intent === 'AUTHORIZE' ? 'AUTHORIZE' : 'CAPTURE';
        intentRef.current = intent;
        setSdkIntent(intent);
        return intent === 'AUTHORIZE'
          ? loadPayPalAuthorizeSdk({ merchantId, pageType: 'checkout' })
          : loadPayPalSdk({ merchantId, pageType: 'checkout', wallets: true });
      })
      .then((paypal) => {
        if (!paypal) return;

        if (cancelled || !paypalButtonRef.current) return;

        const sources = [
          { key: 'paypal', source: paypal.FUNDING.PAYPAL, container: paypalButtonRef.current, name: 'PayPal', color: 'silver' },
          { key: 'venmo', source: paypal.FUNDING.VENMO, container: venmoButtonRef.current, name: 'Venmo', color: undefined },
          { key: 'paylater', source: paypal.FUNDING.PAYLATER, container: payLaterButtonRef.current, name: 'Pay Later', color: 'silver' },
          { key: 'card', source: paypal.FUNDING.CARD, container: cardButtonRef.current, name: 'debit or credit card', color: 'black' },
        ];

        const renders = sources.map(({ key, source, container, name, color }) => {
          if (!source || !container) return Promise.resolve(false);
          const instance = paypal.Buttons({
            fundingSource: source,
            style: {
              layout: 'vertical',
              shape: 'pill',
              height: 50,
              tagline: false,
              ...(color ? { color } : {}),
            },
            // App Switch is intentionally DISABLED. PayPal's documented flow
            // requires the return/cancel URL to match the initiating checkout
            // page plus a unique session and a buttons.resume() handler; we
            // implement none of that yet, and a half-configured App Switch
            // creates ambiguous returns.
            // TODO(paypal-app-switch): implement same-URL return + resume()
            // end-to-end as its own change before re-enabling.
            createOrder: () => handlersRef.current.startOrder(),
            onApprove: async (
              data: { orderID: string },
              actions?: { restart?: () => void },
            ) => {
              const outcome = await handlersRef.current.finishOrder(data.orderID);
              // Recoverable funding failure — let the payer pick another
              // funding source inside the PayPal window, per PayPal docs.
              if (outcome === 'restart') actions?.restart?.();
            },
            onCancel: () => {
              setState('ready');
              setError({
                title: 'Payment cancelled',
                detail: `You closed ${name} checkout. Nothing has been charged or confirmed.`,
              });
            },
            onError: () => {
              fail(
                `${name} had a problem`,
                `${name} could not complete this payment right now. No charge was made — please try again or use another option.`,
              );
            },
          });
          instances.push(instance);
          // Only genuinely eligible funding sources are ever rendered — no
          // decorative pills for methods PayPal will not offer this buyer.
          if (!instance.isEligible?.()) return Promise.resolve(false);
          return instance
            .render(container)
            .then(() => {
              if (!cancelled) setEligible((prev) => ({ ...prev, [key]: true }));
              return true;
            })
            .catch(() => {
              fail(
                `${name} could not load`,
                `${name} is unavailable right now. No charge was made — please try another option.`,
              );
              return false;
            });
        });

        return Promise.all(renders).then((rendered) => {
          if (cancelled) return;
          if (!rendered[0]) {
            fail('PayPal unavailable', 'PayPal checkout is not available in this browser.');
            return;
          }
          setState('ready');
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
        instances.forEach((instance) => instance?.close?.());
      } catch {
        /* already unmounted */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  return (
    <div
      role={embedded ? undefined : 'dialog'}
      aria-modal={embedded ? undefined : 'true'}
      aria-label="Secure checkout"
      className={
        embedded
          ? 'w-full'
          : 'fixed inset-0 z-[100] bg-foreground/25 backdrop-blur-md overflow-y-auto'
      }
    >
      <div
        className={
          embedded
            ? ''
            : 'min-h-full flex items-stretch md:items-center justify-center md:py-6 md:px-4'
        }
      >
        <div
          ref={containerRef}
          className={
            embedded
              ? 'sale-light relative w-full'
              : 'sale-light relative w-full md:max-w-lg md:rounded-[26px] rounded-t-[26px] border border-border/70 bg-card shadow-[0_40px_120px_-40px_rgba(24,20,16,0.55)] mt-6 md:mt-0 flex flex-col max-h-[calc(100dvh-1.5rem)] md:max-h-[calc(100dvh-3rem)]'
          }
        >
          {!embedded ? (
            <button
              type="button"
              onClick={onClose}
              disabled={state === 'processing'}
              aria-label="Close checkout"
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors z-10 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          {!embedded ? (
            <div className="px-7 pt-7 pb-5 border-b border-border/70 flex-shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Vendibook</p>
              <div className="mt-1.5 flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="text-xl font-semibold tracking-tight">Secure checkout</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> {TRUST_COPY.short}
              </p>
            </div>
          ) : null}

          <div className={embedded ? '' : 'flex-1 overflow-y-auto'}>
            {summary ? (
              <div
                className={
                  embedded
                    ? 'pb-5'
                    : 'px-7 py-5 border-b border-border/70 bg-muted/25'
                }
              >
                {summary}
              </div>
            ) : null}


            <div className={embedded ? 'space-y-5' : 'px-7 py-6 space-y-5'}>
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

              ) : state === 'signin' ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-base font-semibold text-foreground">Sign in to pay securely</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Payments are tied to your Vendibook account so we can send your receipt and keep
                    this purchase on your dashboard. Nothing has been charged.
                  </p>
                  <a
                    href={authPath()}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_16px_36px_-20px_hsl(var(--primary)/0.8)] transition-opacity hover:opacity-95"
                  >
                    Sign in to continue
                  </a>
                </div>

              ) : (

                <>
                  <PayPalPayLaterMessage
                    amount={totalUsd}
                    placement="checkout"
                    merchantId={merchantId}
                    intent={sdkIntent}
                    wallets={sdkIntent === 'CAPTURE'}
                  />

                  {/* The funding slots are mounted from first paint so the
                      surface never jumps: PayPal renders the real controls
                      straight into these fixed-height containers. */}
                  <div className="paypal-funding-stack" aria-busy={state === 'loading'}>
                    <div ref={paypalButtonRef} data-funding-source="PayPal" />
                    <div ref={venmoButtonRef} data-funding-source="Venmo" />
                    <div ref={payLaterButtonRef} data-funding-source="Pay Later" />
                    <div ref={cardButtonRef} data-funding-source="Debit or Credit Card" />
                  </div>

                  {state === 'loading' ? (
                    <div className="paypal-funding-cold" aria-hidden="true" />
                  ) : null}

                  {/* Single "Powered by PayPal" line lives in the embedded
                      payment footer (PayPalEmbeddedPayment) — not here. */}

                  {state !== 'processing' ? (
                    <>
                      {walletsAvailable ? (
                        <div className="paypal-alternate-divider" aria-hidden="true">
                          <span /> <small>or</small> <span />
                        </div>
                      ) : null}
                      {sdkIntent === 'CAPTURE' ? (
                        <WalletPayButtons
                          totalUsd={totalUsd}
                          startOrder={() => handlersRef.current.startOrder()}
                          finishOrder={(orderId) =>
                            handlersRef.current.finishOrder(orderId).then(() => undefined)
                          }
                          onFailure={(title, detail) => handlersRef.current.fail(title, detail)}
                          onAvailable={setWalletsAvailable}
                          merchantId={merchantId}
                        />
                      ) : null}
                    </>
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
                      className="rounded-xl border border-destructive/40 bg-destructive/[0.06] px-4 py-3 text-sm space-y-2"
                    >
                      <p className="font-semibold text-destructive">{error.title}</p>
                      <p className="text-xs text-destructive/90">{error.detail}</p>

                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setEligible({});
                          setState('loading');
                          setReloadKey((k) => k + 1);
                        }}
                        className="text-xs font-semibold underline underline-offset-2 text-foreground"
                      >
                        Try again
                      </button>
                    </div>
                  ) : null}

                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayPalPaymentPanel;
