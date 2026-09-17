import { useState } from 'react';
import paypalWordmarkWhite from '@/assets/brand/paypal-wordmark-white.png.asset.json';
import paypalMonogram from '@/assets/brand/paypal-monogram-color.png.asset.json';
import plaidLogoWhite from '@/assets/brand/plaid-logo-white.png.asset.json';
import plaidLogoDark from '@/assets/brand/plaid-logo-dark.png.asset.json';
import equinoxLogo from '@/assets/brand/equinox-funding-logo.png.asset.json';
import { cn } from '@/lib/utils';

/**
 * Official provider brand marks (PayPal, Plaid) served from the CDN.
 * Use the monogram for tight inline spots and the wordmark for attribution
 * lines. Plaid ships in a light and a dark variant — pick the one that
 * contrasts with the surface it sits on.
 */

/** Text fallback in official PayPal colours, readable on light or dark. */
function PayPalTextMark({ surface, className }: { surface: 'dark' | 'light'; className?: string }) {
  return (
    <span className={cn('inline-flex items-center font-bold tracking-tight', className)}>
      <span style={{ color: '#009cde' }}>Pay</span>
      <span style={{ color: surface === 'dark' ? '#ffffff' : '#012169' }}>Pal</span>
    </span>
  );
}

export function PayPalMonogram({
  surface = 'light',
  className,
}: {
  surface?: 'dark' | 'light';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <PayPalTextMark surface={surface} className={cn('text-xs', className)} />;
  return (
    <img
      src={paypalMonogram.url}
      alt="PayPal"
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('h-4 w-auto', className)}
    />
  );
}

export function PayPalWordmark({
  surface = 'dark',
  className,
}: {
  surface?: 'dark' | 'light';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  // Never show a broken image: fall back to the PayPal name in brand type.
  if (failed || surface === 'light') {
    return <PayPalTextMark surface={surface} className={cn('text-sm', className)} />;
  }
  return (
    <img
      src={paypalWordmarkWhite.url}
      alt="PayPal"
      onError={() => setFailed(true)}
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

export function EquinoxFundingLogo({ className }: { className?: string }) {
  return (
    <img
      src={equinoxLogo.url}
      alt="Equinox Funding"
      loading="eager"
      decoding="async"
      className={cn('h-6 w-auto', className)}
    />
  );
}
