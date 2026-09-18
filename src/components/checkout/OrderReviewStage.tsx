import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Pencil, UserRound } from 'lucide-react';
import { PayPalWordmark } from '@/components/brand/ProviderLogos';
import MoneyBreakdown, { type MoneyLine } from '@/components/transaction/checkout/MoneyBreakdown';

export interface OrderReviewSpec {
  label: string;
  value: string;
}

interface OrderReviewStageProps {
  /** Cover image for the single high-value asset. Never a retail cart. */
  imageUrl?: string | null;
  title: string;
  categoryLabel?: string | null;
  counterpartyLabel?: string | null;
  location?: string | null;
  /** Make / model / year, rental dates, duration — only real values. */
  specs?: OrderReviewSpec[];
  priceLabel: string;
  priceNote?: string | null;
  /** Fulfillment currently selected for this transaction. */
  fulfillmentLabel: string;
  fulfillmentDetail?: string | null;
  onEditFulfillment: () => void;
  moneyLines: MoneyLine[];
  total: string;
  totalLabel?: string;
  totalNote?: string;
  /** Extra factual context (host rules, documents needed, etc). */
  children?: ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  backHref: string;
  backLabel?: string;
}

/**
 * Stage 1 of checkout. A single premium asset card, an unambiguous money
 * hierarchy and the selected fulfillment — everything the buyer needs to
 * understand the transaction before entering the checkout stage. No payment
 * controls here: only a factual PayPal preview.
 */
const OrderReviewStage = ({
  imageUrl,
  title,
  categoryLabel,
  counterpartyLabel,
  location,
  specs = [],
  priceLabel,
  priceNote,
  fulfillmentLabel,
  fulfillmentDetail,
  onEditFulfillment,
  moneyLines,
  total,
  totalLabel,
  totalNote,
  children,
  onContinue,
  continueLabel = 'Continue to checkout',
  continueDisabled = false,
  backHref,
  backLabel = 'Back to listing',
}: OrderReviewStageProps) => (
  <div className="order-review">
    <section className="order-review-asset">
      {imageUrl ? <img src={imageUrl} alt={title} /> : null}
      <div className="order-review-asset-body">
        {categoryLabel ? <span className="order-review-eyebrow">{categoryLabel}</span> : null}
        <h2>{title}</h2>
        {counterpartyLabel ? (
          <p className="order-review-seller">
            <UserRound aria-hidden /> {counterpartyLabel}
          </p>
        ) : null}
        {location ? (
          <p className="order-review-location">
            <MapPin aria-hidden /> {location}
          </p>
        ) : null}
        {specs.length > 0 ? (
          <dl className="order-review-specs">
            {specs.map((spec) => (
              <div key={`${spec.label}-${spec.value}`}>
                <dt>{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="order-review-price">
          <strong>{priceLabel}</strong>
          {priceNote ? <span>{priceNote}</span> : null}
        </p>
      </div>
    </section>

    <section className="order-review-fulfillment">
      <div>
        <h3>Fulfillment</h3>
        <p>
          <strong>{fulfillmentLabel}</strong>
          {fulfillmentDetail ? <span>{fulfillmentDetail}</span> : null}
        </p>
      </div>
      <button type="button" className="v2-btn-quiet" onClick={onEditFulfillment}>
        <Pencil aria-hidden /> Edit
      </button>
    </section>

    <section className="order-review-money">
      <h3>Order summary</h3>
      <MoneyBreakdown lines={moneyLines} total={total} totalLabel={totalLabel} totalNote={totalNote} />
    </section>

    {children}

    <section className="order-review-paypal">
      <PayPalWordmark surface="light" className="text-base" />
      <div>
        <strong>Checkout with PayPal</strong>
        <span>Eligible payment options are shown in the next step.</span>
      </div>
    </section>

    <div className="order-review-actions">
      <button
        type="button"
        className="checkout-primary-action order-review-continue"
        onClick={onContinue}
        disabled={continueDisabled}
      >
        {continueLabel}
      </button>
      <Link to={backHref} className="v2-btn-quiet order-review-back">
        {backLabel}
      </Link>
    </div>
  </div>
);

export default OrderReviewStage;
