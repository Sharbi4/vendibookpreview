import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, Lock, ShieldCheck, X } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { loadPayPalSdk } from '@/lib/paypalClient';
import { parseEdgeError } from '@/lib/edgeErrors';
import { authPath } from '@/lib/auth/returnTo';
import { TRUST_COPY } from '@/lib/transactionVocabulary';

import { PayPalMonogram } from '@/components/brand/ProviderLogos';
import PayPalPayLaterMessage from '@/components/payments/PayPalPayLaterMessage';
import PaymentFormSkeleton from './PaymentFormSkeleton';
import WalletPayButtons from './WalletPayButtons';
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
  /**
   * Set from the server's create-order response. The server alone decides
   * whether this checkout captures now or places a temporary hold.
   */
  const intentRef = useRef<'CAPTURE' | 'AUTHORIZE'>('CAPTURE');
  const [holdMessage, setHoldMessage] = useState<string | null>(null);
  const stateRef = useRef<PanelState>('loading');
  stateRef.current = state;


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
        const parsed = await parseEdgeError(authErr, auth?.error ? auth : null);
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
      const parsed = await parseEdgeError(fnError, result?.error ? result : null);
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
        return loadPayPalSdk({ merchantId, pageType: 'checkout' });
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
            appSwitchWhenAvailable: true,
            createOrder: () => handlersRef.current.startOrder(),
            onApprove: (data: { orderID: string }) => handlersRef.current.finishOrder(data.orderID),
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
          if (!instance.isEligible?.()) return Promise.resolve(false);
          return instance
            .render(container)
            .then(() => true)
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
  }, []);

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
                  />

                  {state === 'loading' ? <PaymentFormSkeleton /> : null}

                  <div className={state === 'loading' || state === 'processing' ? 'hidden' : 'paypal-funding-stack'}>
                    <div ref={paypalButtonRef} data-funding-source="PayPal" />
                    <div ref={venmoButtonRef} data-funding-source="Venmo" />
                    <div ref={payLaterButtonRef} data-funding-source="Pay Later" />
                    <div ref={cardButtonRef} data-funding-source="Debit or Credit Card" />
                  </div>

                  {state !== 'loading' && state !== 'processing' ? (
                    <p className="paypal-powered-by">
                      Powered by <PayPalMonogram className="h-3.5" /> PayPal
                    </p>
                  ) : null}

                  {state !== 'processing' ? (
                    <>
                      {walletsAvailable ? (
                        <div className="paypal-alternate-divider" aria-hidden="true">
                          <span /> <small>or</small> <span />
                        </div>
                      ) : null}
                      <WalletPayButtons
                        totalUsd={totalUsd}
                        startOrder={() => handlersRef.current.startOrder()}
                        finishOrder={(orderId) => handlersRef.current.finishOrder(orderId)}
                        onFailure={(title, detail) => handlersRef.current.fail(title, detail)}
                        onAvailable={setWalletsAvailable}
                      />
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
