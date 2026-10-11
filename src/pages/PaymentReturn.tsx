import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import SEO from '@/components/SEO';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { parseEdgeError } from '@/lib/edgeErrors';
import { isSafeInternalPath } from '@/lib/originNav';
import { authPath } from '@/lib/auth/returnTo';
import PayPalReviewAuthorize, { type ReviewData } from '@/components/checkout/PayPalReviewAuthorize';


type Outcome =
  | { kind: 'working' }
  | { kind: 'signin' }
  /** Approved at PayPal, nothing captured — final capture review. */
  | { kind: 'review'; data: ReviewData }
  | { kind: 'failed'; title: string; detail: string };


/**
 * Where PayPal sends the payer back after a redirect or app-switch approval.
 *
 * The browser's return alone is never treated as payment: the server
 * re-checks the order with PayPal and finishes it through the canonical
 * capture endpoint. A completed payment lands on the receipt; every
 * other result stays here with a recoverable next step and an honest statement
 * about whether anything was charged.
 */
const PaymentReturn = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get('token') ?? params.get('order_id') ?? '';
  const reference = params.get('ref') ?? '';
  const retryParam = params.get('returnTo');
  const storedRetry = (() => {
    try {
      return sessionStorage.getItem('pp-checkout-return');
    } catch {
      return null;
    }
  })();
  const retryTo = isSafeInternalPath(retryParam)
    ? retryParam
    : isSafeInternalPath(storedRetry)
      ? storedRetry
      : null;


  const [outcome, setOutcome] = useState<Outcome>({ kind: 'working' });
  const [attempt, setAttempt] = useState(0);


  /**
   * A declined or unfinished payment is never a confirmation. Send the payer
   * back to the payment step they came from with the reason, so it shows in
   * red above the PayPal buttons; only fall back to this page's own failure
   * screen when we have no safe checkout path to return to.
   */
  const failWith = (title: string, detail: string) => {
    if (retryTo) {
      try {
        sessionStorage.setItem('pp-decline', detail);
        sessionStorage.removeItem('pp-checkout-return');
      } catch {
        /* storage unavailable — the checkout still reopens */
      }
      navigate(retryTo, { replace: true });
      return;
    }
    setOutcome({ kind: 'failed', title, detail });
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setOutcome({ kind: 'working' });
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        if (!cancelled) setOutcome({ kind: 'signin' });

        return;
      }

      // Read-only: approval alone never captures. We look at where the order
      // stands and either resolve an already-finished payment to its receipt
      // or present the final final payment review.
      const { data, error } = await supabase.functions.invoke('paypal-order-review', {
        body: { order_id: orderId || undefined, reference: reference || undefined },
      });

      if (cancelled) return;


      if (error || !data?.reference) {
        const parsed = await parseEdgeError(error, data?.error ? data : null);
        failWith(
          'We could not confirm this payment',
          parsed.message ||
            'We could not reach PayPal to confirm this payment. Nothing has been charged twice — please try again.',
        );
        return;
      }

      const review = data as ReviewData;
      const ref = review.reference;
       if (review.record_status === 'completed' || review.record_status === 'pending') {
        try {
          sessionStorage.removeItem('pp-checkout-return');
        } catch {
          /* ignore */
        }
        navigate(`/receipt/${ref}`, { replace: true });
        return;
      }
      if (review.record_status === 'cancelled' || review.order_status === 'VOIDED') {
        navigate(`/payment-cancelled${retryTo ? `?returnTo=${encodeURIComponent(retryTo)}` : ''}`, {
          replace: true,
        });
        return;
      }
      if (['failed', 'declined'].includes(review.record_status)) {
        failWith('Payment not completed', review.provider_reason ?? 'PayPal declined this payment. Choose another payment method.');
        return;
      }
      if (review.order_status === 'APPROVED' || review.order_status === 'SAVED') {
        setOutcome({ kind: 'review', data: review });
        return;
      }

      failWith(
        'This payment was not completed',
        'Your payment was not approved and nothing has been charged. You can go back and try again or use another method.',
      );

    })().catch(() => { if (!cancelled) setOutcome({ kind: 'failed', title: 'Payment status unavailable', detail: 'We could not check PayPal. Check again before trying another payment.' }); });


    return () => {
      cancelled = true;
    };
  }, [orderId, reference, attempt, navigate, retryTo]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Finishing your payment | Vendibook" description="Confirming your PayPal payment." noindex />
      <Header />

      <main className="flex-1 flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-lg rounded-[26px] border border-border/70 bg-card p-8 text-center shadow-[0_40px_120px_-70px_rgba(24,20,16,0.45)]">
          {outcome.kind === 'working' ? (
            <div className="paypal-return-skeleton" aria-busy="true" role="status">
              <span className="sr-only">Loading payment review</span>
              <div className="mx-auto h-7 w-52 rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
              <div className="mx-auto h-4 w-72 max-w-full rounded bg-muted/30 animate-pulse" aria-hidden="true" />
              <div className="h-24 rounded-2xl bg-muted/30 animate-pulse" aria-hidden="true" />
              <div className="h-36 rounded-2xl bg-muted/30 animate-pulse" aria-hidden="true" />
            </div>
          ) : outcome.kind === 'signin' ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Sign in to finish this payment
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in with the account you started checkout from and we'll pick this back up.
              </p>
              <Button asChild className="mt-6 w-full">
                {/* Preserve the ENTIRE return URL so reconciliation resumes
                    on exactly this order after signing back in. */}
                <Link to={authPath(`${window.location.pathname}${window.location.search}`)}>
                  Sign in
                </Link>
              </Button>
            </>
          ) : outcome.kind === 'review' ? (
            <div className="text-left">
              <PayPalReviewAuthorize
                orderId={outcome.data.order_id ?? orderId}
                initialData={outcome.data}
                onAuthorized={(result) => {
                  if (result.status !== 'completed' && result.status !== 'pending') {
                    failWith(
                      'This payment is not complete',
                      result.message ?? 'PayPal has not completed this payment. Return to checkout and try again.',
                    );
                    return;
                  }
                  try {
                    sessionStorage.removeItem('pp-checkout-return');
                  } catch {
                    /* ignore */
                  }
                  navigate(`/receipt/${result.reference ?? outcome.data.reference}`, { replace: true });
                }}
                onChangeMethod={() => {
                  if (retryTo) navigate(retryTo);
                  else navigate('/dashboard');
                }}
              />
            </div>
          ) : (
            <>
              <AlertTriangle className="mx-auto h-9 w-9 text-primary" />
              <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                {outcome.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{outcome.detail}</p>
              <div className="mt-6 space-y-2.5">
                <Button className="w-full" onClick={() => setAttempt((n) => n + 1)}>
                  Check again
                </Button>
                {retryTo ? (
                  <Button variant="outline" className="w-full" onClick={() => navigate(retryTo)}>
                    Back to checkout
                  </Button>
                ) : null}
                <Button variant="outline" asChild className="w-full">
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
                <Link
                  to="/contact"
                  className="block pt-1 text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Need help with this payment?
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentReturn;
