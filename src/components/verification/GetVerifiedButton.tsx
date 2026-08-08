import { useState } from 'react';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSellerVerification } from '@/hooks/useSellerVerification';
import VerifiedSellerDialog from './VerifiedSellerDialog';
import { IDENTITY_VERIFIED_DISCLOSURE } from './IdentityVerifiedBadge';
import { cn } from '@/lib/utils';

interface GetVerifiedButtonProps {
  /** Compact height matches the dashboard listing-card action row. */
  size?: 'sm' | 'md';
  className?: string;
  /** Show the price in the label when the seller isn't verified yet. */
  showPrice?: boolean;
  /**
   * Render the metallic badge once verified. Default false: this is an offer
   * control, so it disappears entirely for sellers who already hold the badge.
   */
  badgeWhenVerified?: boolean;
}

/**
 * High-end green-shine "Get verified" action.
 *
 * One-time fee, never a subscription and never a requirement — sellers who
 * already hold the badge see the live badge state instead of an offer.
 */
export const GetVerifiedButton = ({
  size = 'sm',
  className,
  showPrice = true,
  badgeWhenVerified = false,
}: GetVerifiedButtonProps) => {
  const [open, setOpen] = useState(false);
  const v = useSellerVerification();

  if (!v.state || v.offer.enabled === false) return null;

  const verified = v.state.badge_active;
  const pending = v.state.status === 'pending_review';
  const inProgress = v.state.status === 'identity_in_progress';
  const paymentOnly = v.state.needs_payment_only;

  if (verified) {
    if (!badgeWhenVerified) return null;
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'verified-metallic inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tracking-tight',
                className,
              )}
            >
              <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
              Identity Verified
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[240px] text-xs">
            {IDENTITY_VERIFIED_DISCLOSURE}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const label = pending
    ? 'Verification in review'
    : paymentOnly
    ? 'Complete payment'
    : inProgress
    ? 'Resume verification'
    : showPrice
    ? `Get verified · ${v.offer.display_price}`
    : 'Get verified';

  return (
    <>
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => setOpen(true)}
              className={cn(
                'verified-cta rounded-md border-0',
                size === 'sm' ? 'h-10 px-4' : 'h-11 px-5',
                className,
              )}
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {label}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
            One-time {v.offer.display_price} identity check through Plaid. Adds an Identity
            Verified badge to your profile and listings. Not a subscription, never required.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <VerifiedSellerDialog open={open} onOpenChange={setOpen} onVerified={() => v.refresh()} />
    </>
  );
};

export default GetVerifiedButton;
