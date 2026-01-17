import { Link } from 'react-router-dom';
import { 
  Shield, 
  CreditCard, 
  FileEdit, 
  MessageSquare, 
  PlusSquare,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NextStepConfig {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  actionOnClick?: () => void;
  priority: number;
}

interface ProfileNextStepCardProps {
  isVerified: boolean;
  stripeConnected: boolean;
  isHost: boolean;
  draftCount: number;
  pendingRequestCount: number;
  isLoadingStripe?: boolean;
  onConnectStripe?: () => void;
  isConnectingStripe?: boolean;
}

const ProfileNextStepCard = ({
  isVerified,
  stripeConnected,
  isHost,
  draftCount,
  pendingRequestCount,
  isLoadingStripe,
  onConnectStripe,
  isConnectingStripe,
}: ProfileNextStepCardProps) => {
  // Define all possible next steps with priority
  const allSteps: NextStepConfig[] = [
    {
      id: 'verify',
      icon: Shield,
      title: 'Verify your identity',
      description: 'Build trust with renters and hosts by verifying your identity.',
      actionLabel: 'Verify Now',
      actionHref: '/identity-verification',
      priority: 1,
    },
    {
      id: 'stripe',
      icon: CreditCard,
      title: 'Connect Stripe to get paid',
      description: 'Set up payouts so you can receive payments for your listings.',
      actionLabel: 'Connect Stripe',
      actionOnClick: onConnectStripe,
      priority: 2,
    },
    {
      id: 'drafts',
      icon: FileEdit,
      title: `Finish your draft${draftCount > 1 ? 's' : ''}`,
      description: `You have ${draftCount} unpublished listing${draftCount > 1 ? 's' : ''} waiting to go live.`,
      actionLabel: 'View Drafts',
      actionHref: '/dashboard',
      priority: 3,
    },
    {
      id: 'requests',
      icon: MessageSquare,
      title: 'Respond to booking requests',
      description: `You have ${pendingRequestCount} pending request${pendingRequestCount > 1 ? 's' : ''} waiting for your response.`,
      actionLabel: 'View Requests',
      actionHref: '/dashboard',
      priority: 4,
    },
    {
      id: 'create',
      icon: PlusSquare,
      title: 'Create your first listing',
      description: 'Start earning by listing your food truck, trailer, or kitchen.',
      actionLabel: 'Create Listing',
      actionHref: '/create',
      priority: 5,
    },
  ];

  // Determine which step to show based on conditions
  const getApplicableStep = (): NextStepConfig | null => {
    // Priority 1: Not verified
    if (!isVerified) {
      return allSteps.find(s => s.id === 'verify')!;
    }

    // Priority 2: Host without Stripe connected
    if (isHost && !stripeConnected && !isLoadingStripe) {
      return allSteps.find(s => s.id === 'stripe')!;
    }

    // Priority 3: Has drafts
    if (draftCount > 0) {
      return allSteps.find(s => s.id === 'drafts')!;
    }

    // Priority 4: Has pending requests
    if (pendingRequestCount > 0) {
      return allSteps.find(s => s.id === 'requests')!;
    }

    // Priority 5: Create first listing (only if not a host yet)
    if (!isHost) {
      return allSteps.find(s => s.id === 'create')!;
    }

    return null;
  };

  const step = getApplicableStep();

  // Don't render if no applicable step
  if (!step) return null;

  const Icon = step.icon;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">{step.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
          </div>

          {step.actionHref ? (
            <Button size="sm" className="flex-shrink-0" asChild>
              <Link to={step.actionHref}>
                {step.actionLabel}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="flex-shrink-0" 
              onClick={step.actionOnClick}
              disabled={isConnectingStripe}
            >
              {isConnectingStripe ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  {step.actionLabel}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileNextStepCard;
