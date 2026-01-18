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
    <div className="relative overflow-hidden rounded-xl p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary to-amber-500 rounded-xl shadow-md flex items-center justify-center">
            <Check className="h-5 w-5 text-white" strokeWidth={2.5} />
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
            className="h-8 text-xs gap-1.5 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md"
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
