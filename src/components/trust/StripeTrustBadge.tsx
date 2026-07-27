import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import stripeWhiteAsset from '@/assets/brand/powered-by-stripe-white.svg.asset.json';
import stripeBlurpleAsset from '@/assets/brand/powered-by-stripe-blurple.svg.asset.json';

const stripeWhite = stripeWhiteAsset.url;
const stripeBlurple = stripeBlurpleAsset.url;

/**
 * Official "Powered by Stripe" trust badge.
 *
 * Rules:
 * - Uses only the official Stripe wordmark asset. Never recreated with CSS/text.
 * - Placed only on legitimate Stripe-powered surfaces (payments, payouts,
 *   Connect onboarding, subscription billing, Stripe Identity).
 * - One instance per viewport is the intent — callers are responsible for
 *   not stacking multiples on the same surface.
 */
export type StripeTrustContext = 'payments' | 'payouts' | 'identity' | 'combined' | 'subscription';
export type StripeTrustSurface = 'light' | 'dark';
export type StripeTrustSize = 'sm' | 'md';

interface StripeTrustBadgeProps {
  context?: StripeTrustContext;
  surface?: StripeTrustSurface;
  size?: StripeTrustSize;
  className?: string;
  /** Show short trust copy next to the wordmark. */
  withCopy?: boolean;
}

const COPY: Record<StripeTrustContext, string> = {
  payments: 'Secure payments powered by Stripe',
  payouts: 'Payouts powered by Stripe',
  identity: 'Identity verification powered by Stripe',
  combined: 'Payments, payouts & identity powered by Stripe',
  subscription: 'Recurring billing powered by Stripe',
};

const HEIGHT: Record<StripeTrustSize, string> = {
  sm: 'h-4',
  md: 'h-5',
};

export const StripeTrustBadge: React.FC<StripeTrustBadgeProps> = ({
  context = 'payments',
  surface = 'dark',
  size = 'sm',
  className,
  withCopy = true,
}) => {
  const src = surface === 'dark' ? stripeWhite : stripeBlurple;
  const copy = COPY[context];
  const textColor = surface === 'dark' ? 'text-white/70' : 'text-slate-600';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5',
        className,
      )}
      role="group"
      aria-label={copy}
    >
      {withCopy && (
        <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium', textColor)}>
          <Lock className="h-3 w-3" aria-hidden />
          {copy}
        </span>
      )}
      <img
        src={src}
        alt="Powered by Stripe"
        className={cn(HEIGHT[size], 'w-auto select-none')}
        draggable={false}
      />
    </div>
  );
};

export default StripeTrustBadge;
