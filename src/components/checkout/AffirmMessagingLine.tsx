import { Elements, PaymentMethodMessagingElement } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripeClient';

interface AffirmMessagingLineProps {
  /** Amount in USD dollars. Rounded to cents inside. */
  amountUsd: number;
}

const stripePromise = getStripe();

/**
 * "Buy in 4 payments with Afterpay" / "As low as $X/mo with Affirm"
 * static promotional message rendered pre-checkout. Hidden below $50
 * (below Affirm/Klarna minimums) and above $30k (above Affirm max).
 *
 * Uses classic Elements provider (not Checkout Elements) because
 * PaymentMethodMessagingElement is a stand-alone promotional element.
 */
const AffirmMessagingLine = ({ amountUsd }: AffirmMessagingLineProps) => {
  if (!amountUsd || amountUsd < 50 || amountUsd > 30000) return null;
  const amountCents = Math.round(amountUsd * 100);
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-3">
      <Elements stripe={stripePromise}>
        <PaymentMethodMessagingElement
          options={{
            amount: amountCents,
            currency: 'USD',
            countryCode: 'US',
            paymentMethodTypes: ['affirm', 'afterpay_clearpay', 'klarna'],
          }}
        />
      </Elements>
    </div>
  );
};

export default AffirmMessagingLine;
