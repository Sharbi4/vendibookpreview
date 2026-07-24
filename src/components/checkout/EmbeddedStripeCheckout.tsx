import { useEffect, useState, type ReactNode } from 'react';
import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckout,
} from '@stripe/react-stripe-js/checkout';
import { Loader2, Lock, ShieldCheck, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getStripe } from '@/lib/stripeClient';
import { stripeAppearance, stripeFonts } from '@/lib/stripeAppearance';
import { TRUST_COPY } from '@/lib/transactionVocabulary';

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
}

const stripePromise = getStripe();

/**
 * Vendibook-branded Stripe Custom Checkout (ui_mode: 'custom') mounted
 * inside a full-screen dark modal so buyers never leave vendibook.com
 * for card / Apple Pay / Google Pay flows.
 */
const EmbeddedStripeCheckout = ({
  clientSecret,
  summary,
  onClose,
  returnUrl,
  onSuccess,
}: EmbeddedStripeCheckoutProps) => {
  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md overflow-y-auto">
      <div className="min-h-full flex items-start md:items-center justify-center py-6 px-4">
        <div className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="px-6 pt-6 pb-4 border-b border-border/60">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-base font-semibold">Secure checkout</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> {TRUST_COPY.short}
            </p>
          </div>

          {summary ? (
            <div className="px-6 py-4 border-b border-border/60">{summary}</div>
          ) : null}

          <div className="px-6 py-5">
            <CheckoutElementsProvider
              stripe={stripePromise}
              options={{
                clientSecret,
                elementsOptions: {
                  appearance: stripeAppearance,
                  fonts: stripeFonts,
                  loader: 'auto',
                },
              }}
            >
              <PayForm returnUrl={returnUrl} onSuccess={onSuccess} />
            </CheckoutElementsProvider>
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (checkoutState.type === 'error') {
      setErrorMessage(checkoutState.error.message);
    }
  }, [checkoutState]);

  if (checkoutState.type === 'loading') {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
        Loading secure payment…
      </div>
    );
  }

  if (checkoutState.type === 'error') {
    return (
      <div className="text-sm text-destructive py-4">
        {checkoutState.error.message}
      </div>
    );
  }

  const { checkout } = checkoutState;
  const formattedTotal = checkout.total?.total?.amount ?? '';


  const handlePay = async () => {
    setErrorMessage(null);
    setIsPaying(true);
    try {
      const result = await checkout.confirm({ returnUrl });
      if (result.type === 'error') {
        setErrorMessage(result.error.message ?? 'Payment could not be completed.');
      } else if (result.type === 'success') {
        onSuccess?.();
        // For non-redirect methods (card, Apple/Google Pay), navigate to the
        // return URL ourselves so the app lands on /payment-success.
        if (returnUrl) {
          window.location.href = returnUrl;
        }
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {errorMessage ? (
        <div className="text-sm text-destructive" role="alert">
          {errorMessage}
        </div>
      ) : null}
      <Button
        type="button"
        onClick={handlePay}
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
      <p className="text-[11px] text-muted-foreground text-center">
        Payments are processed securely by Stripe. Vendibook never sees your full card number.
      </p>
    </div>
  );
};

export default EmbeddedStripeCheckout;
