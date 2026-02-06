import { CreditCard, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StripeNotificationBubbleProps {
  isConnected: boolean;
  hasAccountStarted?: boolean;
  isPayoutsEnabled?: boolean;
  isLoading: boolean;
  onConnect: () => void;
  isConnecting?: boolean;
}

const StripeNotificationBubble = ({ 
  isConnected, 
  hasAccountStarted,
  isPayoutsEnabled,
  isLoading,
  onConnect,
  isConnecting
}: StripeNotificationBubbleProps) => {
  if (isLoading) return null;

  if (isConnected) {
    const showWarning = isPayoutsEnabled === false;

    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        showWarning
          ? "bg-muted border border-border text-foreground"
          : "bg-emerald-50 border border-emerald-200 text-emerald-700"
      )}>
        <Check className={cn("h-3.5 w-3.5", showWarning ? "text-muted-foreground" : "text-emerald-700")} />
        {showWarning ? 'Stripe connected (payouts pending)' : 'Stripe connected'}
      </div>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={isConnecting}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
      )}
    >
      <AlertCircle className="h-3.5 w-3.5" />
      {hasAccountStarted ? (isConnecting ? 'Opening…' : 'Finish Stripe setup') : (isConnecting ? 'Connecting...' : 'Connect Stripe to get paid')}
    </button>
  );
};

export default StripeNotificationBubble;
