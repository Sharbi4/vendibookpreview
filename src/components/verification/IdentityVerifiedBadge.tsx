import { BadgeCheck, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * The disclosure that must accompany the badge everywhere it appears.
 * Identity only — never ownership, condition, permits or transaction safety.
 */
export const IDENTITY_VERIFIED_DISCLOSURE =
  "Identity verification confirms the seller's identity. It does not verify ownership, title, liens, listing accuracy, equipment condition, licensing, permits, financing eligibility, or transaction safety.";

interface IdentityVerifiedBadgeProps {
  /** Server-derived eligibility. Never pass a client-side guess. */
  verified: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Renders the tooltip affordance. Off for dense card overlays. */
  withDetails?: boolean;
  verifiedAt?: string | null;
  className?: string;
}

const SIZES = {
  sm: 'text-[11px] px-2 py-[3px] gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
} as const;

const ICONS = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
} as const;

/**
 * Public "Identity Verified" badge.
 *
 * Only ever rendered for a completed, paid, non-revoked verification. There is
 * deliberately NO unverified/negative variant — sellers who haven't bought the
 * check are shown nothing at all.
 */
const IdentityVerifiedBadge = ({
  verified,
  size = 'md',
  withDetails = true,
  verifiedAt,
  className,
}: IdentityVerifiedBadgeProps) => {
  if (!verified) return null;

  const badge = (
    <span
      className={cn(
        'verified-metallic inline-flex items-center rounded-full font-semibold tracking-tight',
        SIZES[size],
        className,
      )}
    >
      <BadgeCheck className={ICONS[size]} strokeWidth={2.4} aria-hidden="true" />
      Identity Verified
      {withDetails && <Info className="h-3 w-3 opacity-70" aria-hidden="true" />}
    </span>
  );

  if (!withDetails) {
    return (
      <>
        {badge}
        <span className="sr-only">
          Identity Verified seller. {IDENTITY_VERIFIED_DISCLOSURE}
        </span>
      </>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Identity Verified seller. ${IDENTITY_VERIFIED_DISCLOSURE}`}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {badge}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          <p className="font-semibold mb-1">Identity Verified</p>
          <p>{IDENTITY_VERIFIED_DISCLOSURE}</p>
          {verifiedAt && (
            <p className="mt-1 opacity-70">
              Verified{' '}
              {new Date(verifiedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default IdentityVerifiedBadge;
