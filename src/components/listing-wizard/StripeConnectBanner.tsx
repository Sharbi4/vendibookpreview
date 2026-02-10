import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { cn } from '@/lib/utils';
import stripeWordmark from '@/assets/stripe-wordmark-blurple.png';

interface StripeConnectBannerProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const StripeConnectBanner = ({ className, variant = 'compact' }: StripeConnectBannerProps) => {
  const { 
    isConnected, 
    hasAccountStarted, 
    isLoading, 
    isConnecting, 
    connectStripe 
  } = useStripeConnect();

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking payment status...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg",
        className
      )}>
        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Stripe connected — ready to publish
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[#635bff]/5 border border-[#635bff]/20 rounded-lg">
          <div className="flex items-center gap-2">
            <img src={stripeWordmark} alt="Stripe" className="h-4 w-auto" />
            <span className="text-sm text-[#635bff] dark:text-[#a8a4ff]">
              {hasAccountStarted ? 'Complete setup to get paid' : 'Connect to get paid from your listings'}
            </span>
          </div>
          <Button 
            size="sm" 
            variant="dark-shine"
            onClick={() => connectStripe()}
            disabled={isConnecting}
            className="h-7 text-xs gap-1 rounded-xl"
          >
            {isConnecting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                {hasAccountStarted ? 'Complete' : 'Connect'}
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground px-3">
          ⚠️ Stripe opens in a new tab — please disable your pop-up blocker if it doesn't open.
        </p>
      </div>
    );
  }

  // Full variant with more details
  return (
    <div className={cn(
      "p-4 bg-[#635bff]/5 border border-[#635bff]/20 rounded-xl",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-[#635bff]/10 rounded-lg flex items-center justify-center">
          <img src={stripeWordmark} alt="Stripe" className="h-5 w-auto" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground">
            {hasAccountStarted ? 'Complete Your Stripe Setup' : 'Connect to Get Paid from Your Listings'}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {hasAccountStarted 
              ? 'Finish your Stripe onboarding to start accepting payments and publish listings.'
              : 'You\'ll need to connect a Stripe account before you can publish. Takes about 5 minutes.'}
          </p>
          <Button 
            size="sm" 
            variant="dark-shine"
            onClick={() => connectStripe()}
            disabled={isConnecting}
            className="mt-3 gap-1 rounded-xl"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                {hasAccountStarted ? 'Complete Setup' : 'Connect Stripe'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Stripe opens in a new tab — please disable your pop-up blocker if it doesn't open.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StripeConnectBanner;
