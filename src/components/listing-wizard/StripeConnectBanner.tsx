import { CreditCard, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { cn } from '@/lib/utils';

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
      <div className={cn(
        "flex items-center justify-between gap-3 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg",
        className
      )}>
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            {hasAccountStarted ? 'Complete Stripe setup to publish' : 'Connect Stripe to publish listings'}
          </span>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={connectStripe}
          disabled={isConnecting}
          className="h-7 text-xs gap-1 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"
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
    );
  }

  // Full variant with more details
  return (
    <div className={cn(
      "p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground">
            {hasAccountStarted ? 'Complete Your Stripe Setup' : 'Connect Stripe to Get Paid'}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {hasAccountStarted 
              ? 'Finish your Stripe onboarding to start accepting payments and publish listings.'
              : 'You\'ll need to connect a Stripe account before you can publish. Takes about 5 minutes.'}
          </p>
          <Button 
            size="sm" 
            onClick={connectStripe}
            disabled={isConnecting}
            className="mt-3 gap-1"
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
        </div>
      </div>
    </div>
  );
};

export default StripeConnectBanner;
