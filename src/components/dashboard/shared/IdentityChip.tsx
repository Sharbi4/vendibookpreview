import { Link } from 'react-router-dom';
import { ShieldCheck, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSellerVerifiedBadge } from '@/hooks/useSellerVerifiedBadge';

interface IdentityChipProps {
  verified: boolean;
  className?: string;
  /** Prominent (13px) variant for the sidebar profile block. */
  prominent?: boolean;
}

/**
 * Verification state chip. Verified sellers see the high-end metallic Identity
 * Verified badge. Everyone else sees a neutral, optional invitation — identity
 * verification is a paid add-on and is NEVER required to publish, sell, or buy.
 */
const IdentityChip = ({ verified, className, prominent }: IdentityChipProps) => {
  const { user } = useAuth();
  // Authoritative, server-derived badge state (paid + Plaid success + not revoked).
  const { verified: badgeActive } = useSellerVerifiedBadge(user?.id);
  const isVerified = verified || badgeActive;

  if (isVerified) {
    return (
      <span
        className={cn(
          'verified-metallic inline-flex items-center rounded-full font-semibold tracking-tight',
          prominent ? 'gap-1.5 px-2.5 py-1 text-[12px]' : 'gap-1 px-2 py-[3px] text-[10px]',
          className,
        )}
        title="Identity Verified seller"
      >
        <BadgeCheck
          className={prominent ? 'h-3.5 w-3.5' : 'h-3 w-3'}
          strokeWidth={2.4}
          aria-hidden="true"
        />
        Identity Verified
      </span>
    );
  }

  if (prominent) {
    return (
      <Link
        to="/identity-verification"
        title="Optional paid add-on — not required to publish. See details on the identity verification page."
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium bg-muted/60 text-muted-foreground border border-border hover:text-foreground hover:bg-muted transition-colors',
          className,
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Get verified*
      </Link>
    );
  }

  return (
    <Link
      to="/identity-verification"
      title="Optional paid add-on — not required to publish. See details on the identity verification page."
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted/60 text-muted-foreground border border-border hover:text-foreground hover:bg-muted transition-colors',
        className,
      )}
    >
      <ShieldCheck className="h-3 w-3" />
      Get verified
    </Link>
  );
};


export default IdentityChip;
