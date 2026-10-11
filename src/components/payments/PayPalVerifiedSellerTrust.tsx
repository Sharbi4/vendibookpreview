import { ShieldCheck } from 'lucide-react';

type PayPalVerifiedSellerTrustProps = {
  className?: string;
  compact?: boolean;
};

/** Buyer-facing claim rendered only from the marketplace checkout readiness rule. */
export default function PayPalVerifiedSellerTrust({
  className = '',
  compact = false,
}: PayPalVerifiedSellerTrustProps) {
  return (
    <div
      className={`inline-flex items-start gap-2 text-emerald-700 ${compact ? 'text-xs' : 'text-sm'} ${className}`}
      aria-label="PayPal-verified seller"
    >
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Identity verified by PayPal as a business before accepting payment.</span>
    </div>
  );
}