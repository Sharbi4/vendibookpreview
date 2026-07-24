import * as React from 'react';
import { cn } from '@/lib/utils';

interface JourneyCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle primary accent ring — reserve for the recommended card. */
  emphasized?: boolean;
  /** Padding preset. */
  padding?: 'sm' | 'md' | 'lg';
}

const PADDINGS = { sm: 'p-4', md: 'p-5', lg: 'p-6 md:p-7' } as const;

/**
 * Neutral glass card used across journey and monetization surfaces.
 * Keeps orange off the surface — it's reserved for CTAs, badges, and progress.
 */
export const JourneyCard = React.forwardRef<HTMLDivElement, JourneyCardProps>(
  ({ className, emphasized, padding = 'md', children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative rounded-2xl border bg-card/70 backdrop-blur-sm transition-colors',
        'border-border/70 hover:border-border',
        emphasized && 'border-primary/40 ring-1 ring-primary/15',
        PADDINGS[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  ),
);
JourneyCard.displayName = 'JourneyCard';

interface SectionHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned actions (e.g. filter, view-all link). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard section header — small eyebrow, title, optional description,
 * and right-aligned actions. Use above JourneyCard clusters.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
            {eyebrow}
          </div>
        )}
        <h2 className="text-lg md:text-xl font-semibold text-foreground truncate">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export default JourneyCard;
