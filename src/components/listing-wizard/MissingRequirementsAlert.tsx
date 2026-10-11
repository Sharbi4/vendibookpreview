import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MissingRequirementsAlertProps {
  blockers: string[];
  className?: string;
}

/**
 * Top-of-step summary of everything still missing on the current step.
 *
 * Sellers told us a disabled "Continue" button with no explanation felt
 * broken — they could not tell which answer was missing. When a Continue or
 * Publish attempt fails we list every outstanding requirement here, at the top
 * of the step, in plain language.
 */
export const MissingRequirementsAlert: React.FC<MissingRequirementsAlertProps> = ({
  blockers,
  className,
}) => {
  if (!blockers.length) return null;

  return (
    <div
      id="wizard-missing-required"
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-xl border border-destructive/40 bg-destructive/10 p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {blockers.length === 1
              ? '1 required field is missing'
              : `${blockers.length} required fields are missing`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Fill these in to continue. Required fields are marked with a red asterisk (
            <span className="font-semibold text-destructive" aria-hidden="true">
              *
            </span>
            ).
          </p>
          <ul className="mt-2 space-y-1">
            {blockers.map((blocker) => (
              <li key={blocker} className="flex items-start gap-2 text-sm text-foreground">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MissingRequirementsAlert;
