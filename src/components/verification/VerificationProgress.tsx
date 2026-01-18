import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Shield, Building2, ChevronRight, Loader2 } from 'lucide-react';
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
    <div className="relative overflow-hidden p-4 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
      
      <div className="relative flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-primary to-amber-500 rounded-lg shadow-md">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-medium text-foreground">Trust & Verification</span>
        </div>
        <span className="text-xs font-semibold text-primary">
          {completedSteps} of {steps.length} complete
        </span>
      </div>
      <p className="relative text-xs text-muted-foreground mb-3">Complete these steps to unlock all features.</p>

      <div className="relative space-y-2">
        {steps.map((step) => {
          const isNext = !step.isComplete && steps.slice(0, steps.indexOf(step)).every(s => s.isComplete);
          
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center justify-between py-2 px-3 rounded-lg bg-card/60 backdrop-blur-sm",
                step.isComplete && "opacity-70",
                isNext && "bg-card border border-primary/50 shadow-sm"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center",
                  step.isComplete 
                    ? "bg-gradient-to-br from-primary to-amber-500" 
                    : "bg-muted border border-border"
                )}>
                  {step.isComplete ? (
                    <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                </div>
                <span className={cn(
                  "text-sm",
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
                  className="h-7 text-xs gap-1 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md"
                >
                  {step.isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      {step.actionLabel}
                      <ChevronRight className="h-3 w-3" />
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
