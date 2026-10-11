import React from 'react';
import { cn } from '@/lib/utils';

export interface RequiredMarkProps {
  className?: string;
}

/**
 * Visible "this field is required" marker.
 *
 * Sellers repeatedly told us they could not tell which fields were required
 * and which were nice-to-have, so every field needed to publish now carries a
 * visible asterisk plus a screen-reader-only word. Never communicate a
 * requirement through colour alone or inside a tooltip.
 */
export const RequiredMark: React.FC<RequiredMarkProps> = ({ className }) => (
  <span className={cn('ml-0.5 font-semibold text-destructive', className)}>
    <span aria-hidden="true">*</span>
    <span className="sr-only">(required)</span>
  </span>
);

/** Legend explaining the asterisk. Place once near the top of a form step. */
export const RequiredLegend: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className,
  children,
}) => (
  <p className={cn('text-xs text-muted-foreground', className)}>
    <span aria-hidden="true" className="font-semibold text-destructive">
      *
    </span>{' '}
    {children ?? 'Required to publish. Everything else is optional.'}
  </p>
);

export default RequiredMark;
