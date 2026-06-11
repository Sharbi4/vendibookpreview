/**
 * Brand wordmark placeholders for partner logos.
 * TODO: Replace with official SVG/PNG logo assets when uploaded.
 *   - Stripe: https://stripe.com/newsroom/brand-assets
 *   - Affirm: https://www.affirm.com/brand
 *   - Afterpay: https://www.afterpay.com/brand-assets
 */

export const StripeWordmark = ({ className = '' }: { className?: string }) => (
  // TODO: Replace with official Stripe logo asset
  <span
    className={`font-extrabold tracking-tight text-neutral-900 ${className}`}
    style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.04em' }}
  >
    stripe
  </span>
);

export const AffirmWordmark = ({ className = '' }: { className?: string }) => (
  // TODO: Replace with official Affirm logo asset
  <span
    className={`font-bold tracking-tight text-neutral-900 lowercase ${className}`}
    style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.03em' }}
  >
    affirm
  </span>
);

export const AfterpayWordmark = ({ className = '' }: { className?: string }) => (
  // TODO: Replace with official Afterpay logo asset
  <span
    className={`font-bold tracking-tight text-neutral-900 lowercase ${className}`}
    style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.03em' }}
  >
    afterpay
  </span>
);
