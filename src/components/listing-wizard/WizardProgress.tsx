import React from 'react';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface WizardProgressProps {
  currentStep: number;
  steps: string[];
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
}

// Estimated time per step in minutes
const STEP_TIMES: Record<number, number> = {
  1: 1,  // Type
  2: 3,  // Details
  3: 2,  // Location
  4: 2,  // Pricing
  5: 1,  // Documents
  6: 3,  // Photos
  7: 1,  // Review
};

export const WizardProgress: React.FC<WizardProgressProps> = ({
  currentStep,
  steps,
  onStepClick,
  completedSteps = [],
}) => {
  // Calculate progress percentage based on completed steps
  const totalSteps = steps.length;
  const completedCount = completedSteps.length;
  const progressPercentage = Math.round((completedCount / totalSteps) * 100);
  
  // Calculate estimated time remaining
  const remainingSteps = steps
    .map((_, i) => i + 1)
    .filter(step => step >= currentStep);
  const estimatedMinutes = remainingSteps.reduce(
    (total, step) => total + (STEP_TIMES[step] || 2),
    0
  );

  return (
    <div className="w-full mb-6 space-y-4">
      {/* Progress bar with percentage */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {progressPercentage}% complete
            </span>
            <span className="text-muted-foreground">
              • Step {currentStep} of {totalSteps}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs">~{estimatedMinutes} min left</span>
          </div>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = completedSteps.includes(stepNumber);
          const isCurrent = currentStep === stepNumber;
          const isPast = stepNumber < currentStep;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onStepClick?.(stepNumber)}
                  disabled={!onStepClick}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-medium transition-all text-sm",
                    isCompleted || isPast
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground",
                    onStepClick && "cursor-pointer hover:opacity-80"
                  )}
                >
                  {isCompleted || isPast ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    stepNumber
                  )}
                </button>
                <span
                  className={cn(
                    "text-[10px] mt-1.5 text-center max-w-[60px] leading-tight hidden sm:block",
                    isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1.5 rounded-full transition-colors",
                    isPast ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
