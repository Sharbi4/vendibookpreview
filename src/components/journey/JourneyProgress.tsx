import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface JourneyStep {
  id: string;
  label: string;
  /** Short helper shown under label on the active step only. */
  hint?: string;
  optional?: boolean;
}

interface Props {
  steps: JourneyStep[];
  /** 0-based index of the current step. Steps before this are considered complete. */
  currentIndex: number;
  /** Estimated remaining effort, shown at the top. */
  estimate?: string;
  className?: string;
}

/**
 * Reusable multi-step progress indicator for guided workflows.
 * Orange is used only for the active/completed markers so the rest of the UI stays neutral.
 */
export function JourneyProgress({ steps, currentIndex, estimate, className }: Props) {
  const total = steps.length;
  const clamped = Math.max(0, Math.min(currentIndex, total - 1));
  const pct = total <= 1 ? 100 : Math.round((clamped / (total - 1)) * 100);

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-4 md:p-5',
        className,
      )}
      role="group"
      aria-label="Progress"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>Step {clamped + 1} of {total}</span>
          {estimate ? <span aria-hidden>·</span> : null}
          {estimate ? <span>{estimate}</span> : null}
        </div>
        <span className="text-[11px] font-semibold text-foreground/80" aria-hidden>
          {pct}%
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-1.5 rounded-full bg-muted overflow-hidden mb-4" aria-hidden>
        <div
          className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => {
          const isComplete = i < clamped;
          const isActive = i === clamped;
          return (
            <li
              key={step.id}
              className={cn(
                'flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors',
                isActive && 'border-primary/50 bg-primary/[0.04]',
                isComplete && 'border-border/60 bg-muted/40',
                !isActive && !isComplete && 'border-border/50 bg-transparent',
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              <span
                className={cn(
                  'mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0',
                  isComplete && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary/15 text-primary ring-1 ring-primary/40',
                  !isActive && !isComplete && 'bg-muted text-muted-foreground',
                )}
              >
                {isComplete ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      'text-sm font-medium truncate',
                      isActive ? 'text-foreground' : 'text-foreground/80',
                    )}
                  >
                    {step.label}
                  </span>
                  {step.optional && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Optional
                    </span>
                  )}
                </div>
                {isActive && step.hint && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.hint}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default JourneyProgress;
