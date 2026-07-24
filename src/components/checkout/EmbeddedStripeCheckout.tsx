import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  CheckoutElementsProvider,
  ExpressCheckoutElement,
  PaymentElement,
  useCheckout,
} from '@stripe/react-stripe-js/checkout';
import { CheckCircle2, Loader2, Lock, ShieldCheck, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getStripe } from '@/lib/stripeClient';
import { stripeAppearance, getStripeFonts } from '@/lib/stripeAppearance';
import { resolveStripeErrorCopy, type StripeErrorCopy } from '@/lib/stripeErrorCopy';
import { TRUST_COPY } from '@/lib/transactionVocabulary';
import PaymentFormSkeleton from './PaymentFormSkeleton';
import TrustRow from './TrustRow';
import AffirmMessagingLine from './AffirmMessagingLine';

interface EmbeddedStripeCheckoutProps {
  clientSecret: string;
  /** Optional order-summary node rendered above the Payment Element. */
  summary?: ReactNode;
  /** Called when the user dismisses the modal without paying. */
  onClose: () => void;
  /** Return URL sent to Stripe for redirect payment methods (Klarna, Affirm…). */
  returnUrl?: string;
  /** Called on same-page confirmation success before navigating to return URL. */
  onSuccess?: () => void;
  /** Total in USD (dollars) — drives Affirm/Afterpay messaging above the tabs. */
  totalUsd?: number;
}

const stripePromise = getStripe();

/**
 * Vendibook-branded Stripe Custom Checkout (ui_mode: 'custom') mounted
 * inside a full-screen dark modal on desktop and a full-height bottom
 * sheet on mobile so buyers never leave vendibook.com for card /
 * Apple Pay / Google Pay / Link flows.
 */
const EmbeddedStripeCheckout = ({
  clientSecret,
  summary,
  onClose,
  returnUrl,
  onSuccess,
  totalUsd,
}: EmbeddedStripeCheckoutProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // ESC to close + lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Lightweight focus trap: keep Tab inside the panel.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = el.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener('keydown', handler as EventListener);
    return () => el.removeEventListener('keydown', handler as EventListener);
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
            aria-label="Close checkout"
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors z-10"
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
            {summary ? (
              <div className="px-6 py-4 border-b border-border/60">{summary}</div>
            ) : null}

            <div className="px-6 py-5 space-y-4">
              {typeof totalUsd === 'number' && totalUsd >= 50 ? (
                <AffirmMessagingLine amountUsd={totalUsd} />
              ) : null}
              <CheckoutElementsProvider
                stripe={stripePromise}
                options={{
                  clientSecret,
                  elementsOptions: {
                    appearance: stripeAppearance,
                    fonts: getStripeFonts(typeof window !== 'undefined' ? window.location.origin : ''),
                    loader: 'auto',
                  },
                }}
              >
                <PayForm returnUrl={returnUrl} onSuccess={onSuccess} />
              </CheckoutElementsProvider>
              <TrustRow />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PayForm = ({
  returnUrl,
  onSuccess,
}: {
  returnUrl?: string;
  onSuccess?: () => void;
}) => {
  const checkoutState = useCheckout();
  const [isPaying, setIsPaying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorCopy, setErrorCopy] = useState<StripeErrorCopy | null>(null);
  const [expressAvailable, setExpressAvailable] = useState(false);

  useEffect(() => {
    if (checkoutState.type === 'error') {
      setErrorCopy(resolveStripeErrorCopy({ message: checkoutState.error.message }));
    }
  }, [checkoutState]);

  if (checkoutState.type === 'loading') {
    return <PaymentFormSkeleton />;
  }

  if (checkoutState.type === 'error') {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/[0.06] px-4 py-3 text-sm">
        <p className="font-semibold text-foreground">Payment could not be set up.</p>
        <p className="text-muted-foreground text-xs mt-1">
          {checkoutState.error.message}
        </p>
      </div>
    );
  }

  const { checkout } = checkoutState;
  const formattedTotal = checkout.total?.total?.amount ?? '';

  const runConfirm = async () => {
    setErrorCopy(null);
    setIsPaying(true);
    try {
      const result = await checkout.confirm({ returnUrl });
      if (result.type === 'error') {
        setErrorCopy(resolveStripeErrorCopy(result.error as never));
      } else if (result.type === 'success') {
        setIsSuccess(true);
        onSuccess?.();
        // Brief confirmed state, then hand off to return URL.
        setTimeout(() => {
          if (returnUrl) window.location.href = returnUrl;
        }, 900);
      }
    } catch (err) {
      setErrorCopy(
        resolveStripeErrorCopy({
          message: err instanceof Error ? err.message : undefined,
        }),
      );
    } finally {
      setIsPaying(false);
    }
  };

  if (isSuccess) {
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      {/* Express row — Apple Pay / Google Pay / Link. Hidden if
          no wallets are available on this device / domain. */}
      <div className={expressAvailable ? 'space-y-3' : 'hidden'}>
        <ExpressCheckoutElement
          options={{
            buttonHeight: 48,
            buttonTheme: { applePay: 'black', googlePay: 'black' },
            buttonType: { applePay: 'plain', googlePay: 'plain' },
            layout: { maxColumns: 3, maxRows: 1, overflow: 'auto' },
            paymentMethodOrder: ['apple_pay', 'google_pay', 'link'],
            paymentMethods: { applePay: 'auto', googlePay: 'auto', link: 'auto' },
          }}
          onReady={(event) => {
            setExpressAvailable(
              Boolean(event.availablePaymentMethods && Object.keys(event.availablePaymentMethods).length > 0),
            );
          }}
          onConfirm={async () => {
            await runConfirm();
          }}
        />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            or pay with card
          </span>
          <div className="h-px flex-1 bg-border/60" />
        </div>
      </div>

      <PaymentElement options={{ layout: 'tabs' }} />

      {errorCopy ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/[0.06] px-4 py-3 text-sm space-y-1"
        >
          <p className="font-semibold text-foreground">{errorCopy.title}</p>
          <p className="text-xs text-muted-foreground">{errorCopy.why}</p>
          <p className="text-xs text-foreground/90">{errorCopy.fix}</p>
        </div>
      ) : null}

      {/* Sticky pay button — pinned inside modal scroll on mobile via
          safe-area padding; static on desktop. */}
      <div className="sticky bottom-0 -mx-6 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-card border-t border-border/60 md:border-0 md:pb-0 md:bg-transparent md:static md:mx-0 md:px-0 md:pt-2">
        <Button
          type="button"
          onClick={runConfirm}
          disabled={isPaying}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          {isPaying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing…
            </>
          ) : (
            <>Pay {formattedTotal}</>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Payments processed securely by Stripe. Vendibook never sees your full card number.
        </p>
      </div>
    </div>
  );
};

export default EmbeddedStripeCheckout;
