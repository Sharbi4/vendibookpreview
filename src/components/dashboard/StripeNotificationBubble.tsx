import { Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StripeNotificationBubbleProps {
  isConnected: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onManage?: () => void;
  isConnecting?: boolean;
  isOpeningDashboard?: boolean;
}

const StripeNotificationBubble = ({
  isConnected,
  isLoading,
  onConnect,
  onManage,
  isConnecting,
  isOpeningDashboard,
}: StripeNotificationBubbleProps) => {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground text-xs font-medium"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking payout status…
      </div>
    );
  }

  if (isConnected) {
    const clickable = typeof onManage === 'function';
    const Wrapper: React.ElementType = clickable ? 'button' : 'div';
    return (
      <Wrapper
        {...(clickable
          ? { onClick: onManage, disabled: isOpeningDashboard, type: 'button' }
          : {})}
        aria-label={clickable ? 'Payouts connected — manage in Stripe' : 'Payouts connected'}
        data-stripe-status="connected"
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
          'bg-emerald-50 border border-emerald-200 text-emerald-700',
          clickable && 'hover:bg-emerald-100 cursor-pointer disabled:opacity-60',
        )}
      >
        {isOpeningDashboard ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        <span>Payouts connected</span>
        {clickable && <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />}
      </Wrapper>
    );
  }

  return (
    <button
      type="button"
      onClick={onConnect}
      disabled={isConnecting}
      aria-label="Connect Stripe to receive payouts"
      data-stripe-status="disconnected"
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
        'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 disabled:opacity-60',
      )}
    >
      {isConnecting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5" />
      )}
      {isConnecting ? 'Connecting…' : 'Payouts not connected — Connect Stripe'}
    </button>
  );
};

export default StripeNotificationBubble;
