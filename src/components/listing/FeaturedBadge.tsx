import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { featuredDaysRemaining, isListingFeatured, type FeaturedFields } from '@/lib/featured';

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { wrap: string; icon: string }> = {
  sm: { wrap: 'text-[10px] px-2 py-[3px] gap-1', icon: 'h-3 w-3' },
  md: { wrap: 'text-xs px-2.5 py-1 gap-1.5', icon: 'h-3.5 w-3.5' },
  lg: { wrap: 'text-sm px-3.5 py-1.5 gap-2', icon: 'h-4 w-4' },
};

interface FeaturedBadgeProps {
  /** Pass the listing to derive live featured state, or use `force` for static contexts. */
  listing?: FeaturedFields | null;
  force?: boolean;
  size?: Size;
  /** `card` renders inside listing card overlays (already gated by the caller). */
  variant?: 'default' | 'card';
  /** Compact card layouts render the smaller pill. */
  compact?: boolean;
  /** Show "· 12d left" when the boost window is known. */
  showDaysLeft?: boolean;
  className?: string;
}


/**
 * Single source of truth for the Featured Boost badge.
 * Gold gradient, soft glow, and a slow specular sweep so a paid boost
 * reads as premium wherever it appears (detail page, dashboard, cards).
 */
export function FeaturedBadge({
  listing,
  force,
  size,
  variant = 'default',
  compact = false,
  showDaysLeft = false,
  className,
}: FeaturedBadgeProps) {
  // `card` usage is gated by the caller (no listing prop) — treat as active.
  const active = force ?? (listing ? isListingFeatured(listing) : variant === 'card');
  if (!active) return null;

  const days = listing ? featuredDaysRemaining(listing) : 0;
  const sz = SIZES[size ?? (compact ? 'sm' : 'md')];


  return (
    <span
      className={cn(
        'featured-gold inline-flex items-center rounded-full font-semibold uppercase tracking-wide whitespace-nowrap',
        sz.wrap,
        className,
      )}
      title={days > 0 ? `Featured boost · ${days} day${days === 1 ? '' : 's'} left` : 'Featured listing'}
    >
      <Crown className={cn(sz.icon, 'shrink-0 fill-current')} aria-hidden="true" />
      Featured
      {showDaysLeft && days > 0 && (
        <span className="font-medium opacity-80">· {days}d left</span>
      )}
    </span>
  );
}

export default FeaturedBadge;
