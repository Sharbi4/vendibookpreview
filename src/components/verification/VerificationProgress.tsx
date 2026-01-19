import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Shield, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useStripeConnect } from '@/hooks/useStripeConnect';

interface VerificationStep {
  id: string;
  title: string;
  isComplete: boolean;
  action?: () => void;
  actionLabel?: string;
  isLoading?: boolean;
}

const VerificationProgress = () => {
  const navigate = useNavigate();
  const { isVerified, hasRole } = useAuth();
  const { isConnected, isOnboardingComplete, isLoading: stripeLoading, connectStripe, isConnecting } = useStripeConnect();
  const [isStartingVerification, setIsStartingVerification] = useState(false);

  const isHost = hasRole('host');

  const steps: VerificationStep[] = [
    {
      id: 'stripe',
      title: 'Stripe connected',
      isComplete: isConnected && isOnboardingComplete,
      action: () => connectStripe(),
      actionLabel: 'Connect Stripe',
      isLoading: isConnecting,
    },
    {
      id: 'identity',
      title: 'Identity verified',
      isComplete: isVerified,
      action: () => {
        setIsStartingVerification(true);
        navigate('/verify-identity');
      },
      actionLabel: 'Verify Identity',
      isLoading: isStartingVerification,
    },
  ];

  const completedSteps = steps.filter(s => s.isComplete).length;
  const allComplete = completedSteps === steps.length;

  // Don't show if loading or all complete
  if (stripeLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allComplete) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Trust & Verification</h3>
            <p className="text-xs text-muted-foreground">Complete these steps to unlock all features.</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          {completedSteps} of {steps.length}
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step) => {
          const isNext = !step.isComplete && steps.slice(0, steps.indexOf(step)).every(s => s.isComplete);
          
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50",
                step.isComplete && "opacity-70",
                isNext && "bg-card border border-primary/30 shadow-sm"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  step.isComplete 
                    ? "bg-primary" 
                    : "bg-muted border border-border"
                )}>
                  {step.isComplete ? (
                    <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  step.isComplete ? "text-muted-foreground line-through" : "text-foreground"
                )}>
                  {step.title}
                </span>
              </div>

              {!step.isComplete && step.action && isNext && (
                <Button
                  size="sm"
                  onClick={step.action}
                  disabled={step.isLoading}
                  className="h-8 text-xs gap-1.5"
                >
                  {step.isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      {step.actionLabel}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VerificationProgress;
