import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, CreditCard, FileText, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useAuth } from '@/contexts/AuthContext';
import { useHostListings } from '@/hooks/useHostListings';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
}

export const HostOnboardingCard = () => {
  const { user } = useAuth();
  const { isConnected, isLoading: stripeLoading, connectStripe, isConnecting } = useStripeConnect();
  const { stats, isLoading: listingsLoading } = useHostListings();

  // Determine step completion
  const hasListing = stats.total > 0;
  const hasPublishedListing = stats.published > 0;
  
  // Check identity verification from user metadata or profile
  const isIdentityVerified = user?.user_metadata?.identity_verified || false;

  const steps: OnboardingStep[] = [
    {
      id: 'stripe',
      title: 'Connect Stripe',
      description: 'Set up payments to receive earnings',
      icon: CreditCard,
      isComplete: isConnected,
      action: !isConnected ? {
        label: isConnecting ? 'Connecting...' : 'Connect Stripe',
        onClick: connectStripe,
      } : undefined,
    },
    {
      id: 'listing',
      title: 'Create a Listing',
      description: 'List your first asset to start earning',
      icon: FileText,
      isComplete: hasListing,
      action: !hasListing ? {
        label: 'Create Listing',
        to: '/list',
      } : undefined,
    },
    {
      id: 'verify',
      title: 'Verify Identity',
      description: 'Build trust with verification',
      icon: UserCheck,
      isComplete: isIdentityVerified,
      action: !isIdentityVerified ? {
        label: 'Verify Now',
        to: '/verify-identity',
      } : undefined,
    },
  ];

  const completedSteps = steps.filter(s => s.isComplete).length;
  const progress = (completedSteps / steps.length) * 100;
  const allComplete = completedSteps === steps.length;

  // Don't show if loading or all steps complete
  if (stripeLoading || listingsLoading) return null;
  if (allComplete) return null;

  // Find the next incomplete step
  const nextStep = steps.find(s => !s.isComplete);

  return (
    <Card className="border border-border shadow-md overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground shadow-lg flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            Get Started
          </CardTitle>
          <span className="text-sm font-semibold text-primary">
            {completedSteps}/{steps.length} complete
          </span>
        </div>
        <Progress value={progress} className="h-2 mt-3" />
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isNext = step.id === nextStep?.id;
          
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl transition-colors bg-muted/30 border border-border",
                isNext && "bg-card border-primary/50 shadow-sm",
                step.isComplete && "opacity-60"
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center",
                step.isComplete 
                  ? "bg-primary text-primary-foreground" 
                  : isNext 
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
              )}>
                {step.isComplete ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className={cn(
                    "h-4 w-4",
                    isNext ? "text-primary-foreground" : "text-muted-foreground"
                  )} />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-sm",
                  step.isComplete && "line-through text-muted-foreground"
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              </div>

              {step.action && isNext && (
                <div className="flex-shrink-0">
                  {step.action.to ? (
                    <Button 
                      size="sm" 
                      variant="dark-shine"
                      asChild 
                      className="gap-1 rounded-xl shadow-lg"
                    >
                      <Link to={step.action.to}>
                        {step.action.label}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="dark-shine"
                      onClick={step.action.onClick}
                      disabled={isConnecting}
                      className="gap-1 rounded-xl shadow-lg"
                    >
                      {step.action.label}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default HostOnboardingCard;
