import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Shield, Building2, FileCheck, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useStripeConnect } from '@/hooks/useStripeConnect';

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
  action?: () => void;
  actionLabel?: string;
  isLoading?: boolean;
  badgeLabel: string;
  badgeColor: string;
}

const VerificationProgress = () => {
  const navigate = useNavigate();
  const { isVerified } = useAuth();
  const { isConnected, isOnboardingComplete, isLoading: stripeLoading, connectStripe, isConnecting } = useStripeConnect();
  const [isStartingVerification, setIsStartingVerification] = useState(false);

  // Define verification steps
  const steps: VerificationStep[] = [
    {
      id: 'stripe-connect',
      title: 'Connect Stripe Account',
      description: 'Set up your Stripe account to receive payments securely',
      icon: Building2,
      isComplete: isConnected && isOnboardingComplete,
      action: () => connectStripe(),
      actionLabel: isConnected ? 'Complete Setup' : 'Connect Stripe',
      isLoading: isConnecting,
      badgeLabel: 'Payments Enabled',
      badgeColor: 'from-blue-500 to-indigo-500',
    },
    {
      id: 'identity',
      title: 'Verify Your Identity',
      description: 'Complete Stripe Identity verification to earn your verified badge',
      icon: Shield,
      isComplete: isVerified,
      action: () => {
        setIsStartingVerification(true);
        navigate('/verify-identity');
      },
      actionLabel: 'Verify Identity',
      isLoading: isStartingVerification,
      badgeLabel: 'Identity Verified',
      badgeColor: 'from-amber-400 to-orange-500',
    },
    {
      id: 'documents',
      title: 'Submit Required Documents',
      description: 'Upload business licenses, certifications, or permits for your listings',
      icon: FileCheck,
      isComplete: false, // This would need a hook to check document status
      action: () => navigate('/dashboard'),
      actionLabel: 'View Documents',
      badgeLabel: 'Document Verified',
      badgeColor: 'from-emerald-500 to-teal-500',
    },
  ];

  const completedSteps = steps.filter(s => s.isComplete).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  if (stripeLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-border/50">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5" />
      
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Verification Progress
            </CardTitle>
            <CardDescription className="mt-1">
              Complete these steps to earn trust badges and unlock all features
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-foreground">{completedSteps}</span>
            <span className="text-muted-foreground">/{steps.length}</span>
            <p className="text-xs text-muted-foreground mt-1">Steps completed</p>
          </div>
        </div>
        
        <div className="mt-4">
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isNextStep = !step.isComplete && steps.slice(0, index).every(s => s.isComplete);
          
          return (
            <div
              key={step.id}
              className={cn(
                'relative flex items-start gap-4 p-4 rounded-xl transition-all',
                step.isComplete 
                  ? 'bg-gradient-to-r from-emerald-50/80 to-emerald-50/40 dark:from-emerald-950/30 dark:to-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/50'
                  : isNextStep
                    ? 'bg-gradient-to-r from-amber-50/80 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/10 border border-amber-200/50 dark:border-amber-800/50 shadow-sm'
                    : 'bg-muted/30 border border-border/50'
              )}
            >
              {/* Step Number / Check */}
              <div
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                  step.isComplete
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                    : isNextStep
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                      : 'bg-muted border-2 border-border text-muted-foreground'
                )}
              >
                {step.isComplete ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <StepIcon className="h-5 w-5" />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={cn(
                    'font-semibold',
                    step.isComplete ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                  )}>
                    {step.title}
                  </h4>
                  {step.isComplete && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      'bg-gradient-to-r text-white',
                      step.badgeColor
                    )}>
                      {step.badgeLabel}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                
                {/* Earned Badge Preview */}
                {step.isComplete && step.id === 'identity' && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-medium">Your verified badge is now visible on your profile and listings!</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="flex-shrink-0">
                {step.isComplete ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ) : step.action && (
                  <Button
                    size="sm"
                    onClick={step.action}
                    disabled={step.isLoading}
                    className={cn(
                      isNextStep 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25'
                        : ''
                    )}
                    variant={isNextStep ? 'default' : 'outline'}
                  >
                    {step.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {step.actionLabel}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* All Complete Banner */}
        {completedSteps === steps.length && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Check className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  🎉 Congratulations! All verifications complete!
                </p>
                <p className="text-sm text-muted-foreground">
                  Your profile now displays all trust badges, helping you build confidence with users.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Verification badges help build trust and can increase your booking rates by up to 40%
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default VerificationProgress;