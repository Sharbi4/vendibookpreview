import { Banknote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Premium black-shine glass badge shown only when BOTH the global launch flag
 * and the seller's per-listing opt-in are true. Links to the public /financing
 * explainer. Never implies approval or a Vendibook lending relationship.
 */
export function FinancingAvailableBadge({
  className,
  compact = false,
  asLink = true,
}: {
  className?: string;
  compact?: boolean;
  asLink?: boolean;
}) {
  const content = (
    <span
      className={cn(
        'relative inline-flex items-center overflow-hidden rounded-full font-semibold uppercase tracking-wide whitespace-nowrap',
        'border-2 border-white/25 bg-[linear-gradient(135deg,#101014_0%,#08080a_55%,#17171d_100%)]',
        'text-white/95 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.14)]',
        'backdrop-blur-md',
        compact ? 'text-[10px] px-2 py-[3px] gap-1' : 'text-xs px-3 py-1.5 gap-1.5',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.18)_50%,transparent_65%)]"
      />
      <Banknote className={cn('relative shrink-0', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-hidden="true" />
      <span className="relative">Financing options available</span>
    </span>
  );

  if (!asLink) return content;

  return (
    <Link
      to="/financing"
      onClick={(e) => e.stopPropagation()}
      aria-label="Financing options available — learn more"
      className="inline-flex"
    >
      {content}
    </Link>
  );
}

export default FinancingAvailableBadge;
