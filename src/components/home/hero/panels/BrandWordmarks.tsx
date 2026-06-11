import stripeLogo from '@/assets/stripe-logo.svg.asset.json';
import affirmLogo from '@/assets/affirm-logo.svg.asset.json';
import afterpayLogo from '@/assets/afterpay-logo.svg.asset.json';

/**
 * Official partner brand logos (SVG assets served from CDN).
 * Rendered as <img> because Lovable assets serve SVGs with
 * Content-Disposition: attachment, which precludes inline <use>.
 */

export const StripeWordmark = ({ className = '' }: { className?: string }) => (
  <img
    src={stripeLogo.url}
    alt="Stripe"
    className={className}
    draggable={false}
  />
);

export const AffirmWordmark = ({ className = '' }: { className?: string }) => (
  <img
    src={affirmLogo.url}
    alt="Affirm"
    className={className}
    draggable={false}
  />
);

export const AfterpayWordmark = ({ className = '' }: { className?: string }) => (
  <img
    src={afterpayLogo.url}
    alt="Afterpay"
    className={className}
    draggable={false}
  />
);
