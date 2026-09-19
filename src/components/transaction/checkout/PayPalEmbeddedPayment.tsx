import type { ReactNode } from 'react';

import PayPalPaymentPanel, {
  type PayPalCheckoutTarget,
} from '@/components/checkout/PayPalPaymentPanel';
import { PayPalMonogram, PayPalWordmark } from '@/components/brand/ProviderLogos';
import { useSellerPaymentReadiness } from '@/hooks/useSellerPaymentReadiness';
import PaymentFormSkeleton from '@/components/checkout/PaymentFormSkeleton';
import PaymentUnavailableState from './PaymentUnavailableState';

interface PayPalEmbeddedPaymentProps {
  /** What is being paid for. Amounts are always re-derived server-side. */
  target: PayPalCheckoutTarget;
  /** Seller/host whose readiness gates marketplace payment. */
  sellerId?: string | null;
  /** Listing route used by the unavailable state. */
  listingHref: string;
  /** Opens the message composer for this seller/host. */
  onMessage?: () => void;
  /** Wording for the counterparty in gated copy. */
  counterparty?: 'seller' | 'host';
  /** Blocks the payment control until required inputs are valid. */
  blocked?: boolean;
  blockedReason?: string;
  /** Final money breakdown rendered above the PayPal action. */
  breakdown?: ReactNode;
  /** Where to send the payer after a verified capture. */
  returnUrl?: string;
  onSuccess?: (result: {
    reference?: string;
    capture_id?: string;
    pending?: boolean;
    authorized?: boolean;
    message?: string;
  }) => void;
  /** Total in USD — PayPal Pay Later messaging only. */
  totalUsd?: number;
  /** Heading copy; booking flows may say "Secure your booking with PayPal". */
  heading?: string;
  /** Short line under the heading describing what happens on approval. */
  intent?: string;
}

/**
 * The embedded PayPal section used by both checkout flows.
 *
 * Money rules preserved: the order is created server-side by the canonical
 * `paypal-create-order` endpoint, capture/authorize is verified server-side,
 * and the SDK's onApprove callback alone is never treated as payment.
 * Connected-path gating is respected: when `gatingActive` is true and the
 * counterparty is not ready, no actionable payment control is rendered. When
 * gating is inactive, today's first-party checkout behaviour is unchanged.
 */
const PayPalEmbeddedPayment = ({
  target,
  sellerId,
  listingHref,
  onMessage,
  counterparty = 'seller',
  blocked = false,
  blockedReason,
  breakdown,
  returnUrl,
  onSuccess,
  totalUsd,
  heading = 'Pay securely with PayPal',
  intent = 'Your payment details are handled by PayPal. Vendibook keeps the order, agreement, and fulfillment details together.',
}: PayPalEmbeddedPaymentProps) => {
  const readiness = useSellerPaymentReadiness(sellerId);
  const gatedOut = readiness.gatingActive && !readiness.ready;

  return (
    <div className="v2-pay-panel is-silver">
      <div className="v2-pay-head">
        <div className="min-w-0">
          <h3>{heading}</h3>
          {intent ? <p>{intent}</p> : null}
        </div>
        <PayPalWordmark surface="light" className="v2-pay-mark" />
      </div>

      {breakdown ? <div className="v2-pay-breakdown">{breakdown}</div> : null}

      {readiness.loading ? (
        <PaymentFormSkeleton />
      ) : gatedOut ? (
        <PaymentUnavailableState
          title={
            counterparty === 'host'
              ? "This host hasn't finished payment setup yet."
              : "This seller hasn't finished payment setup yet."
          }
          detail={`Online payment isn't available for this listing until the ${counterparty} completes their payment setup. Nothing has been charged.`}
          listingHref={listingHref}
          onMessage={onMessage}
          messageLabel={counterparty === 'host' ? 'Message host' : 'Message seller'}
        />
      ) : blocked ? (
        blockedReason ? (
          <div className="v2-pay-blocked" role="status">{blockedReason}</div>
        ) : (
          <PaymentFormSkeleton />
        )
      ) : (
        <div className="v2-pay-embed">
          <PayPalPaymentPanel
            variant="embedded"
            target={target}
            onClose={() => undefined}
            returnUrl={returnUrl}
            onSuccess={onSuccess}
            totalUsd={totalUsd}
            merchantId={readiness.merchantId}
          />
        </div>
      )}

      <p className="v2-pay-foot">
        <PayPalMonogram aria-hidden className="h-3.5" />
        Powered by PayPal
        <span className="v2-pay-foot-links">
          <a href="/terms" target="_blank" rel="noreferrer">Terms</a>
          <a href="/privacy" target="_blank" rel="noreferrer">Privacy</a>
        </span>
      </p>
    </div>
  );
};

export default PayPalEmbeddedPayment;
