import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Provider-neutral payment trust badge.
 *
 * Vendibook processes buyer payments through PayPal and releases seller
 * payouts manually. This badge replaces the retired Stripe wordmark badge and
 * never renders a third-party logo asset.
 */
export type PaymentTrustContext =
  | 'payments'
  | 'payouts'
  | 'identity'
  | 'combined'
  | 'subscription';
export type PaymentTrustSurface = 'light' | 'dark';
export type PaymentTrustSize = 'sm' | 'md';

interface PaymentTrustBadgeProps {
  context?: PaymentTrustContext;
  surface?: PaymentTrustSurface;
  size?: PaymentTrustSize;
  className?: string;
  /** Show the trust copy next to the lock. */
  withCopy?: boolean;
}

const COPY: Record<PaymentTrustContext, string> = {
  payments: 'Secure payments powered by PayPal',
  payouts: 'Payouts reviewed and released by Vendibook',
  identity: 'Identity verification by Vendibook',
  combined: 'Payments by PayPal · payouts released by Vendibook',
  subscription: 'Recurring billing powered by PayPal',
};

const SHORT: Record<PaymentTrustContext, string> = {
  payments: 'PayPal',
  payouts: 'Payouts',
  identity: 'Verified',
  combined: 'PayPal',
  subscription: 'PayPal',
};

const TEXT_SIZE: Record<PaymentTrustSize, string> = {
  sm: 'text-[11px]',
  md: 'text-xs',
};

export const PaymentTrustBadge: React.FC<PaymentTrustBadgeProps> = ({
  context = 'payments',
  surface = 'dark',
  size = 'sm',
  className,
  withCopy = true,
}) => {
  const copy = COPY[context];
  const textColor = surface === 'dark' ? 'text-white/70' : 'text-muted-foreground';

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 font-medium', TEXT_SIZE[size], textColor, className)}
      role="group"
      aria-label={copy}
    >
      <Lock className="h-3 w-3" aria-hidden />
      {withCopy ? copy : SHORT[context]}
    </span>
  );
};

export default PaymentTrustBadge;
