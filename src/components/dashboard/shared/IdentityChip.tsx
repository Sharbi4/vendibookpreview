import { Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IdentityChipProps {
  verified: boolean;
  className?: string;
  /** Prominent (filled amber, 13px) variant for the sidebar profile block. */
  prominent?: boolean;
}

/**
 * Verification state chip. When verified: quiet green. When unverified: prominent
 * amber CTA that reads "Verify now".
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
        to="/verify-identity"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-semibold bg-amber-500 text-amber-950 border border-amber-400 hover:bg-amber-400 transition-colors shadow-[0_2px_8px_-2px_rgba(245,158,11,0.55)]',
          className,
        )}
      >
        <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2.4} />
        Verify now
      </Link>
    );
  }

  return (
    <Link
      to="/verify-identity"
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/40 hover:bg-amber-500/25 transition-colors',
        className,
      )}
    >
      <ShieldAlert className="h-3 w-3" />
      Verify now
    </Link>
  );
};

export default IdentityChip;
