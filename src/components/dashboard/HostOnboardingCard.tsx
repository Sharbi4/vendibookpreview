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
        to: '/create-listing',
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
    <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
      
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Get Started</CardTitle>
          <span className="text-sm font-semibold text-primary">
            {completedSteps}/{steps.length} complete
          </span>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="relative space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isNext = step.id === nextStep?.id;
          
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg transition-colors bg-card/60 backdrop-blur-sm",
                isNext && "bg-card border border-primary/50 shadow-sm",
                step.isComplete && "opacity-60"
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                step.isComplete 
                  ? "bg-gradient-to-br from-primary to-amber-500" 
                  : isNext 
                    ? "bg-gradient-to-br from-primary to-amber-500"
                    : "bg-muted"
              )}>
                {step.isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-white" />
                ) : (
                  <Icon className={cn(
                    "h-4 w-4",
                    isNext ? "text-white" : "text-muted-foreground"
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
                      asChild 
                      className="gap-1 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md"
                    >
                      <Link to={step.action.to}>
                        {step.action.label}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={step.action.onClick}
                      disabled={isConnecting}
                      className="gap-1 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md"
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
