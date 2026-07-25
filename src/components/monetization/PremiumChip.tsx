import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Small gold "PRO" chip used to visibly mark premium-gated controls without
 * hiding them. Placed inline next to labels/buttons across wizards & tools.
 * NOTE: memory bans sparkle/star icons — we use Crown as the tier mark.
 */
export function PremiumChip({
  label = 'PRO',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border-[1.5px] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase align-middle',
        'border-amber-400/50 bg-gradient-to-b from-amber-300/25 to-amber-500/15 text-amber-200',
        'shadow-[0_0_10px_-4px_rgba(251,191,36,0.6)]',
        className,
      )}
      aria-label={`${label} feature`}
    >
      <Crown className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

export default PremiumChip;
