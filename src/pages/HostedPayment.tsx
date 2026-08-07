import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import SEO from '@/components/SEO';
import PayPalPaymentPanel, { type PayPalCheckoutTarget } from '@/components/checkout/PayPalPaymentPanel';
import { formatUsd } from '@/lib/monetization/products';
import { useToast } from '@/hooks/use-toast';

const SUPPORTED = ['sale', 'booking', 'freight', 'notary', 'protected_sale_deposit', 'concierge'] as const;
type HostedKind = (typeof SUPPORTED)[number];

/**
 * Generic hosted checkout surface for a Vendibook charge that isn't a catalog
 * product (freight, notary, protected-sale deposit, sale, booking).
 *
 * Everything in the query string is display-only — the amount, the payer and
 * the eligibility rules are always re-derived server-side in
 * `paypal-create-order` before an order exists.
 */
const HostedPayment = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const kind = params.get('kind') as HostedKind | null;
  const id = params.get('id') ?? '';
  const successPath = params.get('success') ?? '/dashboard';
  const cancelPath = params.get('cancel') ?? '/dashboard';
  const label = params.get('label') ?? 'Vendibook payment';
  const amountCents = Number(params.get('amount_cents') ?? 0);

  const target = useMemo<PayPalCheckoutTarget | null>(
    () => (kind && SUPPORTED.includes(kind) && id ? ({ kind, id } as PayPalCheckoutTarget) : null),
    [kind, id],
  );

  if (!target) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">This payment link isn't valid</h1>
        <p className="mt-3 text-muted-foreground">
          Head back and start the payment again from your dashboard.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-6 rounded-full border border-border px-5 py-2 text-sm"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <>
      <SEO title="Secure checkout | Vendibook" description="Complete your Vendibook payment." noindex />
      <PayPalPaymentPanel
        target={target}
        totalUsd={amountCents > 0 ? amountCents / 100 : undefined}
        returnUrl={successPath}
        onClose={() => navigate(cancelPath)}
        onSuccess={(result) => {
          toast({
            title: result.pending ? 'Payment processing' : 'Payment complete',
            description: result.pending
              ? 'PayPal is still confirming this payment. We’ll update your order the moment it clears.'
              : `${label} is paid.`,
          });
          navigate(successPath);
        }}
        summary={
          <div className="space-y-1">
            <p className="text-sm font-medium">{label}</p>
            {amountCents > 0 && <p className="text-lg font-semibold">{formatUsd(amountCents)}</p>}
          </div>
        }
      />
    </>
  );
};

export default HostedPayment;
