import { Check, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StripeLogo } from '@/components/ui/StripeLogo';

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
  isLoading, 
  isOpeningDashboard,
  onOpenDashboard 
}: StripeStatusCardProps) => {
  if (isLoading) {
    return null;
  }

  // Only show when connected - as a small success badge row
  if (!isConnected) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl p-4 border-0 shadow-xl bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-2xl shadow-lg flex items-center justify-center">
            <Check className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <StripeLogo size="xs" />
              <span className="text-sm font-semibold text-foreground">Stripe connected</span>
            </div>
            <span className="text-xs text-muted-foreground">Payments enabled</span>
          </div>
        </div>
        {onOpenDashboard && (
          <Button 
            onClick={onOpenDashboard}
            size="sm"
            className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg rounded-xl"
            disabled={isOpeningDashboard}
          >
            {isOpeningDashboard ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                View Payouts
                <ExternalLink className="h-3 w-3" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default StripeStatusCard;
