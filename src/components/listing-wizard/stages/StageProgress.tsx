import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { visibleStages, type ListingStageId } from '@/lib/listings/stages';

export interface StageProgressProps {
  currentStage: ListingStageId;
  signedIn: boolean;
  className?: string;
}

/**
 * Six-stage seller-facing progress indicator. It groups the wizard's internal
 * steps so a seller sees six stages instead of a long form. The account stage
 * disappears entirely for signed-in sellers, so the count never inflates.
 */
export const StageProgress: React.FC<StageProgressProps> = ({
  currentStage,
  signedIn,
  className,
}) => {
  const stages = visibleStages({ signedIn });
  const currentIndex = Math.max(
    0,
    stages.findIndex((s) => s.id === currentStage),
  );
  const active = stages[currentIndex];

  return (
    <nav aria-label="Listing progress" className={cn('mb-6', className)}>
      <ol className="flex items-center gap-1.5">
        {stages.map((stage, i) => {
          const done = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <li key={stage.id} className="flex-1">
              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2 py-1.5 text-[11px] font-medium transition-colors sm:text-xs',
                  isCurrent && 'border-primary/60 bg-primary/10 text-foreground',
                  done && 'border-border bg-muted/60 text-muted-foreground',
                  !done && !isCurrent && 'border-dashed border-border text-muted-foreground',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]',
                    isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}
                  aria-hidden="true"
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="truncate">{stage.shortLabel}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">
        <span className="sr-only">
          Stage {currentIndex + 1} of {stages.length}:{' '}
        </span>
        {active?.helper}
      </p>
    </nav>
  );
};

export default StageProgress;
