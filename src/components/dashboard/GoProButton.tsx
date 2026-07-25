import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';

interface Props {
  className?: string;
  compact?: boolean;
}

/**
 * The single gold accent in the app. Free-tier → gold metallic "Go Pro" pill
 * with a slow shine sweep. Paid users see their tier as a gold-outlined chip.
 * Reduced-motion honored via .gold-shine CSS.
 */
export const GoProButton = ({ className, compact }: Props) => {
  const { tier, planLabel, isLoading } = useHostEntitlements();
  if (isLoading) return null;

  if (tier !== 'free') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] pro-chip',
          className,
        )}
        title={planLabel}
      >
        <Crown className="h-3 w-3" />
        {tier === 'premium' ? 'Premium' : 'Pro'}
      </span>
    );
  }

  return (
    <Link
      to="/pricing"
      aria-label="Upgrade to Vendibook Pro"
      className={cn(
        'gold-pill inline-flex items-center gap-1.5 rounded-full font-semibold',
        compact ? 'px-3 py-1 text-[12px]' : 'px-3.5 py-1.5 text-[13px]',
        className,
      )}
    >
      <Crown className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} strokeWidth={2.4} />
      <span>Go Pro</span>
    </Link>
  );
};

export default GoProButton;
