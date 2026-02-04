import { Check, Loader2, ExternalLink, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StripeStatusCardProps {
  isConnected: boolean;
  hasAccountStarted: boolean;
  isLoading: boolean;
  isOpeningDashboard?: boolean;
  onConnect: () => void;
  onOpenDashboard?: () => void;
}

const StripeStatusCard = ({ 
  isConnected, 
  hasAccountStarted,
  isLoading, 
  isOpeningDashboard,
  onConnect,
  onOpenDashboard 
}: StripeStatusCardProps) => {
  if (isLoading) {
    return null;
  }

  // Not connected state - Airbnb style setup card
  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border p-5 bg-card">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
            <CreditCard className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">Set up payouts</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a payout method so we can send you money when you receive bookings or sales.
            </p>
            <Button 
              onClick={onConnect}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Set up payouts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Connected state - Airbnb style success card
  return (
    <div className="rounded-xl border border-border p-5 bg-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Check className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-semibold text-foreground">Stripe connected</p>
            <p className="text-sm text-muted-foreground">Payments enabled. Funds will be deposited to your account.</p>
          </div>
        </div>
        {onOpenDashboard && (
          <Button 
            onClick={onOpenDashboard}
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={isOpeningDashboard}
          >
            {isOpeningDashboard ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                View in Stripe
                <ExternalLink className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default StripeStatusCard;
