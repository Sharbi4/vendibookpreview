import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Premium "Featured" badge. Single source of truth for the visual.
 *
 * Variants:
 *   - card:   compact pill for listing cards (top-left overlay)
 *   - detail: larger ribbon for the listing detail hero
 *   - row:    inline pill for the homepage featured row card
 *
 * Both paid and complimentary featured listings render the same badge —
 * users see no distinction.
 */
export type FeaturedBadgeVariant = 'card' | 'detail' | 'row';

interface FeaturedBadgeProps {
  variant?: FeaturedBadgeVariant;
  compact?: boolean;
  className?: string;
  label?: string;
}

const FeaturedBadge = ({
  variant = 'card',
  compact = false,
  className,
  label = 'Featured',
}: FeaturedBadgeProps) => {
  const sizeClasses =
    variant === 'detail'
      ? 'text-sm px-3 py-1.5 gap-1.5'
      : compact
      ? 'text-[10px] px-2 py-0.5 gap-1'
      : 'text-xs px-2.5 py-1 gap-1.5';

  const iconSize =
    variant === 'detail' ? 'h-4 w-4' : compact ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span
      className={cn(
        'relative inline-flex items-center font-semibold uppercase tracking-[0.08em] rounded-full',
        'text-[#1a1208] border border-amber-200/50',
        // Gradient gold→amber with subtle inner highlight
        'bg-gradient-to-br from-[#fde68a] via-[#f5c042] to-[#d97706]',
        // Soft warm outer glow
        'shadow-[0_0_18px_-2px_rgba(245,158,11,0.55),inset_0_1px_0_rgba(255,255,255,0.6)]',
        // Shimmer sweep (subtle, non-distracting)
        'overflow-hidden',
        'before:content-[""] before:absolute before:inset-0 before:rounded-full',
        'before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent',
        'before:translate-x-[-150%] hover:before:translate-x-[150%] before:transition-transform before:duration-1000 before:ease-out',
        sizeClasses,
        className,
      )}
      aria-label="Featured listing"
    >
      <Crown className={cn('relative drop-shadow-sm', iconSize)} aria-hidden="true" />
      {!(variant === 'card' && compact) && (
        <span className="relative">{label}</span>
      )}
    </span>
  );
};

export default FeaturedBadge;
