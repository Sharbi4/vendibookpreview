import { Check, CreditCard, FileText, FileCheck, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstantBookTimelineProps {
  isPaid: boolean;
  documentsSubmitted: boolean;
  documentsApproved: boolean;
  documentsRejected: boolean;
  bookingConfirmed: boolean;
  bookingCancelled: boolean;
  className?: string;
  compact?: boolean;
}

interface TimelineStep {
  id: string;
  label: string;
  icon: React.ElementType;
  status: 'completed' | 'current' | 'pending' | 'error';
}

const InstantBookTimeline = ({
  isPaid,
  documentsSubmitted,
  documentsApproved,
  documentsRejected,
  bookingConfirmed,
  bookingCancelled,
  className,
  compact = false,
}: InstantBookTimelineProps) => {
  // Determine steps based on state
  const steps: TimelineStep[] = [
    {
      id: 'payment',
      label: 'Payment',
      icon: CreditCard,
      status: isPaid ? 'completed' : 'current',
    },
    {
      id: 'upload',
      label: 'Documents',
      icon: FileText,
      status: documentsRejected 
        ? 'error' 
        : isPaid 
          ? (documentsSubmitted ? 'completed' : 'current')
          : 'pending',
    },
    {
      id: 'review',
      label: 'Review',
      icon: FileCheck,
      status: documentsRejected
        ? 'error'
        : documentsApproved 
          ? 'completed' 
          : documentsSubmitted 
            ? 'current' 
            : 'pending',
    },
    {
      id: 'confirmed',
      label: bookingCancelled ? 'Cancelled' : 'Confirmed',
      icon: bookingCancelled ? XCircle : CheckCircle2,
      status: bookingCancelled 
        ? 'error' 
        : bookingConfirmed 
          ? 'completed' 
          : documentsApproved 
            ? 'current' 
            : 'pending',
    },
  ];

  const getStatusStyles = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return {
          circle: 'bg-emerald-500 text-white border-emerald-500',
          line: 'bg-emerald-500',
          label: 'text-emerald-600 dark:text-emerald-400 font-medium',
        };
      case 'current':
        return {
          circle: 'bg-primary text-primary-foreground border-primary animate-pulse',
          line: 'bg-muted',
          label: 'text-primary font-medium',
        };
      case 'error':
        return {
          circle: 'bg-destructive text-destructive-foreground border-destructive',
          line: 'bg-destructive/30',
          label: 'text-destructive font-medium',
        };
      default:
        return {
          circle: 'bg-muted text-muted-foreground border-muted',
          line: 'bg-muted',
          label: 'text-muted-foreground',
        };
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <Zap className="h-3.5 w-3.5 text-amber-500" />
        <div className="flex items-center gap-0.5">
          {steps.map((step, index) => {
            const styles = getStatusStyles(step.status);
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center border",
                    styles.circle
                  )}
                >
                  {step.status === 'completed' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Icon className="h-2.5 w-2.5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn("w-3 h-0.5", styles.line)} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("py-3", className)}>
      <div className="flex items-center gap-1.5 mb-3">
        <Zap className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium text-foreground">Instant Book Progress</span>
      </div>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const styles = getStatusStyles(step.status);
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                    styles.circle
                  )}
                >
                  {step.status === 'completed' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className={cn("text-xs mt-1.5 whitespace-nowrap", styles.label)}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2">
                  <div
                    className={cn(
                      "h-0.5 w-full transition-colors",
                      step.status === 'completed' ? 'bg-emerald-500' : 'bg-muted'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InstantBookTimeline;
