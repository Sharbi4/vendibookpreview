import { useState, useEffect, forwardRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, CreditCard, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Initialize Stripe outside component to avoid recreating on each render
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
// IMPORTANT: Never fall back to a hardcoded key (mismatched keys will cause Elements to never mount)
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  isInstantBook?: boolean;
  bookingId: string;
}

interface PaymentFormInnerProps {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  isInstantBook?: boolean;
  bookingId: string;
}

const PaymentFormInner = forwardRef<HTMLFormElement, PaymentFormInnerProps>(({ 
  amount, 
  onSuccess, 
  onError, 
  isInstantBook,
  bookingId,
}, ref) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isElementReady, setIsElementReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !isElementReady) {
      setErrorMessage('Payment form is still loading. Please wait...');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?booking_id=${bookingId}&hold=${!isInstantBook}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent) {
        // Payment succeeded or requires capture (authorization hold)
        if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
          onSuccess(paymentIntent.id);
        } else {
          setErrorMessage(`Payment status: ${paymentIntent.status}`);
          onError(`Payment status: ${paymentIntent.status}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(message);
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Payment Details</h3>
        </div>

        <div className="relative min-h-[180px]">
          {!isElementReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/60">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Loading payment form...</span>
            </div>
          )}

          <div className={cn(!isElementReady && 'opacity-0 pointer-events-none')}>
            <PaymentElement
              onReady={() => setIsElementReady(true)}
              onLoadError={({ error }) => {
                const message = error?.message || 'Failed to load payment form';
                setErrorMessage(message);
                onError(message);
              }}
              options={{
                layout: 'tabs',
                business: { name: 'VendiBook' },
              }}
            />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-3">
        <Button
          type="submit"
          disabled={!stripe || !elements || !isElementReady || isProcessing}
          className={cn(
            "w-full h-14 text-base font-semibold",
            "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              {isInstantBook ? `Pay $${amount.toFixed(2)}` : `Authorize $${amount.toFixed(2)}`}
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          {isInstantBook 
            ? 'Your card will be charged immediately'
            : 'Your card will be authorized but not charged until the host approves'}
        </p>
      </div>
    </form>
  );
});

PaymentFormInner.displayName = 'PaymentFormInner';

export const EmbeddedPaymentForm = ({
  clientSecret,
  amount,
  onSuccess,
  onError,
  isInstantBook = false,
  bookingId,
}: PaymentFormProps) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (clientSecret) {
      setIsReady(true);
    }
  }, [clientSecret]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stripePublishableKey) {
    return (
      <div className="p-4 rounded-lg border border-border bg-card text-sm">
        <div className="flex items-start gap-2 text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <div>
            <p className="font-medium">Payment configuration missing</p>
            <p className="text-muted-foreground">
              The Stripe publishable key is not available in the frontend environment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const appearance: import('@stripe/stripe-js').Appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: 'hsl(24, 100%, 50%)',
      colorBackground: 'hsl(0, 0%, 100%)',
      colorText: 'hsl(0, 0%, 9%)',
      colorDanger: 'hsl(0, 84%, 60%)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      borderRadius: '8px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        border: '1px solid hsl(0, 0%, 90%)',
        boxShadow: 'none',
        padding: '12px',
      },
      '.Input:focus': {
        border: '1px solid hsl(24, 100%, 50%)',
        boxShadow: '0 0 0 1px hsl(24, 100%, 50%)',
      },
      '.Label': {
        fontWeight: '500',
        marginBottom: '8px',
      },
      '.Tab': {
        border: '1px solid hsl(0, 0%, 90%)',
        borderRadius: '8px',
      },
      '.Tab--selected': {
        borderColor: 'hsl(24, 100%, 50%)',
        backgroundColor: 'hsl(24, 100%, 97%)',
      },
    },
  };

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance,
        loader: 'auto',
      }}
    >
      <PaymentFormInner
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
        isInstantBook={isInstantBook}
        bookingId={bookingId}
      />
    </Elements>
  );
};

export default EmbeddedPaymentForm;
