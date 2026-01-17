import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, FileText, UserCheck, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useAuth } from '@/contexts/AuthContext';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';

interface NextStepConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
  priority: number;
}

interface NextStepCardProps {
  onConnectStripe: () => void;
  isConnectingStripe: boolean;
}

export const NextStepCard = ({ onConnectStripe, isConnectingStripe }: NextStepCardProps) => {
  const { user } = useAuth();
  const { isConnected, isLoading: stripeLoading } = useStripeConnect();
  const { stats, isLoading: listingsLoading } = useHostListings();
  const { stats: bookingStats, isLoading: bookingsLoading } = useHostBookings();

  const isIdentityVerified = user?.user_metadata?.identity_verified || false;
  const hasDrafts = stats.drafts > 0;
  const hasPendingRequests = bookingStats.pending > 0;

  // Define all possible next steps in priority order
  const possibleSteps: NextStepConfig[] = [
    {
      id: 'stripe',
      title: 'Connect Stripe to get paid',
      description: 'Set up payments to start receiving earnings from your listings.',
      icon: CreditCard,
      action: {
        label: 'Connect Stripe',
        onClick: onConnectStripe,
      },
      priority: 1,
    },
    {
      id: 'bookings',
      title: `${bookingStats.pending} booking request${bookingStats.pending > 1 ? 's' : ''} need${bookingStats.pending === 1 ? 's' : ''} your response`,
      description: 'Respond now to avoid missed revenue.',
      icon: Calendar,
      action: {
        label: 'Review Requests',
        to: '/dashboard?tab=bookings',
      },
      priority: 2,
    },
    {
      id: 'drafts',
      title: `Publish your draft listing${stats.drafts > 1 ? 's' : ''}`,
      description: `You have ${stats.drafts} unpublished listing${stats.drafts > 1 ? 's' : ''} ready to go live.`,
      icon: FileText,
      action: {
        label: 'Publish Draft',
        to: '/dashboard?tab=listings',
      },
      priority: 3,
    },
    {
      id: 'verify',
      title: 'Verify your identity',
      description: 'Build trust with renters through ID verification.',
      icon: UserCheck,
      action: {
        label: 'Verify Identity',
        to: '/verify-identity',
      },
      priority: 4,
    },
    {
      id: 'listing',
      title: 'Create your first listing',
      description: 'List your asset to start earning on Vendibook.',
      icon: FileText,
      action: {
        label: 'Create Listing',
        to: '/create-listing',
      },
      priority: 5,
    },
  ];

  // Filter to only applicable steps
  const applicableSteps = possibleSteps.filter(step => {
    switch (step.id) {
      case 'stripe':
        return !isConnected;
      case 'bookings':
        return hasPendingRequests;
      case 'drafts':
        return hasDrafts && isConnected;
      case 'verify':
        return !isIdentityVerified && isConnected;
      case 'listing':
        return stats.total === 0 && isConnected;
      default:
        return false;
    }
  });

  // Get the highest priority (lowest number) step
  const nextStep = applicableSteps.sort((a, b) => a.priority - b.priority)[0];

  // Loading state
  if (stripeLoading || listingsLoading || bookingsLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // No next step - all done
  if (!nextStep) {
    return null;
  }

  const Icon = nextStep.icon;

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background shadow-sm">
      <CardContent className="flex items-center gap-4 py-4 px-5">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm leading-tight">
            {nextStep.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {nextStep.description}
          </p>
        </div>

        <div className="flex-shrink-0">
          {nextStep.action.to ? (
            <Button size="sm" asChild className="gap-1.5">
              <Link to={nextStep.action.to}>
                {nextStep.action.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={nextStep.action.onClick}
              disabled={isConnectingStripe}
              className="gap-1.5"
            >
              {isConnectingStripe ? 'Connecting...' : nextStep.action.label}
              {!isConnectingStripe && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NextStepCard;
