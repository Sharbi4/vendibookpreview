import { Link } from 'react-router-dom';
import { ShieldCheck, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IdentityChipProps {
  verified: boolean;
  className?: string;
  /** Prominent (13px) variant for the sidebar profile block. */
  prominent?: boolean;
}

/**
 * Verification state chip. Verified sellers see a quiet green badge. Everyone
 * else sees a neutral, optional invitation — identity verification is a paid
 * add-on and is NEVER required to publish, sell, or buy.
 */
const IdentityChip = ({ verified, className, prominent }: IdentityChipProps) => {
  if (verified) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/12 text-emerald-400 border border-emerald-500/30',
          className,
        )}
      >
        <ShieldCheck className="h-3 w-3" />
        Verified
      </span>
    );
  }

  if (prominent) {
    return (
      <Link
        to="/identity-verification"
        title="Optional paid add-on — not required to publish"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium bg-muted/60 text-muted-foreground border border-border hover:text-foreground hover:bg-muted transition-colors',
          className,
        )}
      >
        <BadgeCheck className="h-3.5 w-3.5" />
        Get verified (optional)
      </Link>
    );
  }

  return (
    <Link
      to="/identity-verification"
      title="Optional paid add-on — not required to publish"
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted/60 text-muted-foreground border border-border hover:text-foreground hover:bg-muted transition-colors',
        className,
      )}
    >
      <BadgeCheck className="h-3 w-3" />
      Get verified
    </Link>
  );
};


export default IdentityChip;
