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
    <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
          <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <StripeLogo size="xs" />
            <span className="text-sm font-medium text-foreground">Stripe connected</span>
          </div>
          <span className="text-xs text-muted-foreground">Payments enabled</span>
        </div>
      </div>
      {onOpenDashboard && (
        <Button 
          onClick={onOpenDashboard}
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
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
  );
};

export default StripeStatusCard;
