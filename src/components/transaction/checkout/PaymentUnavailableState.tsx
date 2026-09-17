import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';

interface PaymentUnavailableStateProps {
  title: string;
  detail: string;
  /** Back-to-listing href. */
  listingHref: string;
  /** Opens the message composer for this seller/host. */
  onMessage?: () => void;
  messageLabel?: string;
}

/**
 * Shown instead of an actionable PayPal control when the counterparty cannot
 * receive marketplace money yet. Never renders a payment button.
 */
const PaymentUnavailableState = ({
  title,
  detail,
  listingHref,
  onMessage,
  messageLabel = 'Message seller',
}: PaymentUnavailableStateProps) => (
  <div className="v2-checkout-unavailable" role="status">
    <span className="v2-checkout-unavailable-icon">
      <Info aria-hidden />
    </span>
    <div className="min-w-0">
      <p className="v2-checkout-unavailable-title">{title}</p>
      <p className="v2-checkout-unavailable-detail">{detail}</p>
      <div className="v2-checkout-unavailable-actions">
        {onMessage ? (
          <button type="button" className="v2-btn-outline" onClick={onMessage}>
            {messageLabel}
          </button>
        ) : null}
        <Link to={listingHref} className="v2-btn-quiet">
          Back to listing
        </Link>
      </div>
    </div>
  </div>
);

export default PaymentUnavailableState;
