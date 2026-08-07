import paypalWordmarkWhite from '@/assets/brand/paypal-wordmark-white.png.asset.json';
import paypalMonogram from '@/assets/brand/paypal-monogram-color.png.asset.json';
import plaidLogoWhite from '@/assets/brand/plaid-logo-white.png.asset.json';
import plaidLogoDark from '@/assets/brand/plaid-logo-dark.png.asset.json';
import { cn } from '@/lib/utils';

/**
 * Official provider brand marks (PayPal, Plaid) served from the CDN.
 * Use the monogram for tight inline spots and the wordmark for attribution
 * lines. Plaid ships in a light and a dark variant — pick the one that
 * contrasts with the surface it sits on.
 */

export function PayPalMonogram({ className }: { className?: string }) {
  return (
    <img
      src={paypalMonogram.url}
      alt="PayPal"
      loading="lazy"
      className={cn('h-4 w-auto', className)}
    />
  );
}

export function PayPalWordmark({ className }: { className?: string }) {
  return (
    <img
      src={paypalWordmarkWhite.url}
      alt="PayPal"
      loading="lazy"
      className={cn('h-4 w-auto', className)}
    />
  );
}

export function PlaidLogo({
  surface = 'dark',
  className,
}: {
  /** `dark` = dark background, render the white lettering. */
  surface?: 'dark' | 'light';
  className?: string;
}) {
  return (
    <img
      src={surface === 'dark' ? plaidLogoWhite.url : plaidLogoDark.url}
      alt="Plaid"
      loading="lazy"
      className={cn('h-3.5 w-auto', className)}
    />
  );
}
