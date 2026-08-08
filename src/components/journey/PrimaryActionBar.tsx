import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface JourneyAction extends Omit<ButtonProps, 'children'> {
  label: string;
  onClick?: () => void;
}

interface Props {
  /** The single most-important next action. Rendered as filled primary. */
  primary: JourneyAction;
  /** Recommended secondary action (visually available, doesn't compete). */
  secondary?: JourneyAction;
  /** Optional low-priority action rendered as a subtle text link. */
  tertiary?: JourneyAction;
  /** Short helper text — what happens after primary is clicked. */
  helper?: React.ReactNode;
  /** When the primary action is disabled, these explain exactly what's missing. */
  blockers?: string[];
  /** Stick to the bottom on mobile for tap accessibility. */
  sticky?: boolean;
  className?: string;
}

/**
 * Enforces the "one obvious primary action" hierarchy across guided journeys.
 * Primary = orange filled. Secondary = outline. Tertiary = ghost/link.
 */
export function PrimaryActionBar({
  primary,
  secondary,
  tertiary,
  helper,
  blockers,
  sticky = false,
  className,
}: Props) {
  const { label: pLabel, ...pRest } = primary;
  const showBlockers = !!blockers?.length;
  return (
    <div
      className={cn(
        'w-full',
        sticky &&
          'sticky bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] -mx-4 sm:-mx-0 lg:static lg:z-auto lg:mx-0 lg:border-0 lg:bg-transparent lg:backdrop-blur-none lg:p-0',
        className,
      )}
    >
      {showBlockers && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2">
          <p className="text-xs font-medium text-amber-500">Add these to continue</p>
          <ul className="mt-1 space-y-0.5">
            {blockers!.map((b) => (
              <li key={b} className="text-xs text-muted-foreground">• {b}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        {helper ? (
          <p className="text-xs text-muted-foreground max-w-sm">{helper}</p>
        ) : (
          <span aria-hidden />
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {tertiary && (
            <Button
              variant="ghost"
              size="sm"
              {...tertiary}
              className={cn('text-muted-foreground', tertiary.className)}
            >
              {tertiary.label}
            </Button>
          )}
          {secondary && (
            <Button variant="outline" {...secondary} className={cn('w-full sm:w-auto', secondary.className)}>
              {secondary.label}
            </Button>
          )}
          <Button
            {...pRest}
            className={cn(
              'w-full sm:w-auto min-w-[10rem] font-medium',
              pRest.className,
            )}
          >
            {pLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PrimaryActionBar;
