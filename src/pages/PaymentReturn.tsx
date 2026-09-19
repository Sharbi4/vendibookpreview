import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Clock, Loader2, ShieldCheck } from 'lucide-react';

import SEO from '@/components/SEO';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { parseEdgeError } from '@/lib/edgeErrors';
import { isSafeInternalPath } from '@/lib/originNav';

type Outcome =
  | { kind: 'working' }
  | { kind: 'signin' }
  | { kind: 'authorized'; reference: string; message?: string | null }
  | { kind: 'pending'; reference: string; message?: string | null }
  | { kind: 'failed'; title: string; detail: string };

/**
 * Where PayPal sends the payer back after a redirect or app-switch approval.
 *
 * The browser's return alone is never treated as payment: the server
 * re-checks the order with PayPal and finishes it through the canonical
 * capture/authorize endpoints. A completed payment lands on the receipt; every
 * other result stays here with a recoverable next step and an honest statement
 * about whether anything was charged.
 */
const PaymentReturn = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get('token') ?? params.get('order_id') ?? '';
  const reference = params.get('ref') ?? '';
  const retryParam = params.get('returnTo');
  const retryTo = isSafeInternalPath(retryParam) ? retryParam : null;

  const [outcome, setOutcome] = useState<Outcome>({ kind: 'working' });
  const [attempt, setAttempt] = useState(0);
  const running = useRef(false);

  useEffect(() => {
    if (running.current) return;
    running.current = true;
    let cancelled = false;

    (async () => {
      setOutcome({ kind: 'working' });
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        if (!cancelled) setOutcome({ kind: 'signin' });
        running.current = false;
        return;
      }

      const { data, error } = await supabase.functions.invoke('paypal-finalize-order', {
        body: { order_id: orderId || undefined, reference: reference || undefined },
      });

      if (cancelled) return;
      running.current = false;

      if (error || !data?.status) {
        const parsed = await parseEdgeError(error, data?.error ? data : null);
        setOutcome({
          kind: 'failed',
          title: 'We could not confirm this payment',
          detail: parsed.message ||
            'We could not reach PayPal to confirm this payment. Nothing has been charged twice — please try again.',
        });
        return;
      }

      const ref = data.reference as string | undefined;
      if (data.status === 'completed' && ref) {
        navigate(`/receipt/${ref}`, { replace: true });
        return;
      }
      if (data.status === 'authorized' && ref) {
        setOutcome({ kind: 'authorized', reference: ref, message: data.message });
        return;
      }
      if (data.status === 'pending' && ref) {
        setOutcome({ kind: 'pending', reference: ref, message: data.message });
        return;
      }
      if (data.status === 'cancelled') {
        navigate(`/payment-cancelled${retryTo ? `?returnTo=${encodeURIComponent(retryTo)}` : ''}`, {
          replace: true,
        });
        return;
      }

      setOutcome({
        kind: 'failed',
        title: 'This payment was not completed',
        detail: (data.message as string) ||
          'Your payment was not completed and nothing has been charged. You can go back and try again or use another method.',
      });
    })();

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
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
                Confirming your payment with PayPal…
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Please keep this page open. This usually takes a few seconds.
              </p>
            </>
          ) : outcome.kind === 'signin' ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Sign in to finish this payment
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in with the account you started checkout from and we'll pick this back up.
              </p>
              <Button asChild className="mt-6 w-full">
                <Link to="/auth">Sign in</Link>
              </Button>
            </>
          ) : outcome.kind === 'authorized' ? (
            <>
              <ShieldCheck className="mx-auto h-9 w-9 text-primary" />
              <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                Payment authorized — not charged yet
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {outcome.message ??
                  'PayPal is holding these funds. You are only charged once this transaction is confirmed.'}
              </p>
              <Button asChild className="mt-6 w-full">
                <Link to={`/receipt/${outcome.reference}`}>
                  View your receipt <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </>
          ) : outcome.kind === 'pending' ? (
            <>
              <Clock className="mx-auto h-9 w-9 text-primary" />
              <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                PayPal is still clearing this payment
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {outcome.message ??
                  'Nothing further is needed from you. We will email you the moment it settles.'}
              </p>
              <Button asChild className="mt-6 w-full">
                <Link to={`/receipt/${outcome.reference}`}>View your receipt</Link>
              </Button>
            </>
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
