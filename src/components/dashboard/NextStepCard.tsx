import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, FileText, UserCheck, Calendar, Loader2, Search, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const { user, profile } = useAuth();
  const { isConnected, isLoading: stripeLoading } = useStripeConnect();
  const { stats, isLoading: listingsLoading } = useHostListings();
  const { stats: bookingStats, isLoading: bookingsLoading } = useHostBookings();

  const isIdentityVerified = profile?.identity_verified || false;
  const hasDrafts = stats.drafts > 0;
  const hasPendingRequests = bookingStats.pending > 0;

  // Define all possible next steps in priority order
  const possibleSteps: NextStepConfig[] = [
    {
      id: 'stripe',
      title: 'Connect Stripe to get paid',
      description: 'Set up payouts so you can accept bookings and sales.',
      icon: CreditCard,
      action: {
        label: 'Connect Stripe',
        onClick: onConnectStripe,
      },
      priority: 1,
    },
    {
      id: 'bookings',
      title: 'Respond to booking requests',
      description: `You have ${bookingStats.pending} request${bookingStats.pending > 1 ? 's' : ''} waiting for your decision.`,
      icon: Calendar,
      action: {
        label: 'Review Requests',
        to: '/dashboard?tab=bookings',
      },
      priority: 2,
    },
    {
      id: 'drafts',
      title: 'Publish your draft listing',
      description: 'Finish setup and go live in minutes.',
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
      description: 'Earn your verified badge and build trust.',
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
      description: 'Add a truck, trailer, kitchen, or lot.',
      icon: FileText,
      action: {
        label: 'New Listing',
        to: '/list',
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
      <div className="flex items-center justify-center py-4 rounded-xl bg-card border border-border">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No next step - all done
  if (!nextStep) {
    return null;
  }

  const Icon = nextStep.icon;

  return (
    <div className="relative overflow-hidden rounded-xl p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
      
      <div className="relative flex items-center gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 shadow-md flex items-center justify-center">
          <Icon className="h-5 w-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm leading-tight">
            {nextStep.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {nextStep.description}
          </p>
        </div>

        <div className="flex-shrink-0">
          {nextStep.action.to ? (
            <Button 
              size="sm" 
              asChild 
              className="gap-1.5 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md"
            >
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
              className="gap-1.5 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md"
            >
              {isConnectingStripe ? 'Connecting...' : nextStep.action.label}
              {!isConnectingStripe && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NextStepCard;
