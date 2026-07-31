import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Loader2, Lock, ShieldCheck, X } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { loadPayPalSdk } from '@/lib/paypalClient';
import { TRUST_COPY } from '@/lib/transactionVocabulary';
import PaymentFormSkeleton from './PaymentFormSkeleton';
import TrustRow from './TrustRow';

export type PayPalCheckoutTarget =
  | { kind: 'sale'; id: string }
  | { kind: 'booking'; id: string }
  | { kind: 'product'; slug: string; listing_id?: string };

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
  onSuccess?: (result: { reference?: string; capture_id?: string; pending?: boolean }) => void;
  /** Total in USD — used for Pay Later messaging. */
  totalUsd?: number;
}

type PanelState = 'loading' | 'ready' | 'processing' | 'success' | 'pending' | 'error';

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
  const [state, setState] = useState<PanelState>('loading');
  const [error, setError] = useState<{ title: string; detail: string } | null>(null);
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

  // Mount the PayPal Buttons once.
  useEffect(() => {
    let cancelled = false;
    let instance: any = null;

    const fail = (title: string, detail: string) => {
      if (cancelled) return;
      setError({ title, detail });
      setState('error');
    };

    loadPayPalSdk()
      .then((paypal) => {
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

        instance = paypal.Buttons({
          style: { layout: 'vertical', shape: 'rect', height: 48, label: 'pay' },

          createOrder: async () => {
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
            return data.order_id as string;
          },

          onApprove: async (data: { orderID: string }) => {
            setState('processing');
            const { data: result, error: fnError } = await supabase.functions.invoke(
              'paypal-capture-order',
              { body: { order_id: data.orderID } },
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
          },

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

                  <p className="text-[11px] text-muted-foreground text-center">
                    Payments are processed securely by PayPal. Vendibook never sees your card number.
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
