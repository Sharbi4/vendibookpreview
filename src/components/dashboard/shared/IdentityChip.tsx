import { Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IdentityChipProps {
  verified: boolean;
  className?: string;
}

/**
 * Compact chip that shows identity verification state in the sidebar profile
 * block. Tap → /verify-identity when unverified.
 */
const IdentityChip = ({ verified, className }: IdentityChipProps) => {
  if (verified) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
          className,
        )}
      >
        <ShieldCheck className="h-3 w-3" />
        Verified
      </span>
    );
  }

  return (
    <Link
      to="/verify-identity"
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/15 transition-colors',
        className,
      )}
    >
      <ShieldAlert className="h-3 w-3" />
      Verify now
    </Link>
  );
};

export default IdentityChip;
