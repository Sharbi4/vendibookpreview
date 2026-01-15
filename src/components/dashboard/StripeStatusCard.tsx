import { Check, Loader2, ArrowRight, ExternalLink } from 'lucide-react';
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
  hasAccountStarted, 
  isLoading, 
  isOpeningDashboard,
  onConnect,
  onOpenDashboard 
}: StripeStatusCardProps) => {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Checking payment status...</span>
        </div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <StripeLogo size="sm" />
                <p className="font-semibold text-emerald-800 dark:text-emerald-200">Connected</p>
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">You can receive payments and payouts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onOpenDashboard && (
              <Button 
                onClick={onOpenDashboard}
                variant="outline"
                className="border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                disabled={isOpeningDashboard}
              >
                {isOpeningDashboard ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                <StripeLogo size="xs" />
                <span className="ml-1.5">Dashboard</span>
              </Button>
            )}
            <StripeLogo size="md" />
          </div>
        </div>
      </div>
    );
  }

  // User started onboarding but didn't complete it
  if (hasAccountStarted) {
    return (
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <StripeLogo size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-blue-800 dark:text-blue-200">Complete Your</p>
                <StripeLogo size="sm" />
                <p className="font-semibold text-blue-800 dark:text-blue-200">Setup</p>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">You're almost there! Finish setup to start accepting payments.</p>
            </div>
          </div>
          <Button 
            onClick={onConnect}
            className="bg-[#635bff] hover:bg-[#635bff]/90"
          >
            Continue Setup
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
            <StripeLogo size="sm" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-amber-800 dark:text-amber-200">Connect</p>
              <StripeLogo size="sm" />
              <p className="font-semibold text-amber-800 dark:text-amber-200">to Publish</p>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">Set up payouts to start accepting bookings</p>
          </div>
        </div>
        <Button 
          onClick={onConnect}
          className="bg-[#635bff] hover:bg-[#635bff]/90"
        >
          Connect Stripe
        </Button>
      </div>
    </div>
  );
};

export default StripeStatusCard;
