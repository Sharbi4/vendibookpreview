import { CreditCard, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StripeNotificationBubbleProps {
  isConnected: boolean;
  isLoading: boolean;
  onConnect: () => void;
  isConnecting?: boolean;
}

const StripeNotificationBubble = ({ 
  isConnected, 
  isLoading,
  onConnect,
  isConnecting
}: StripeNotificationBubbleProps) => {
  if (isLoading) return null;

  if (isConnected) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
        <Check className="h-3.5 w-3.5" />
        Stripe connected
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
      {isConnecting ? 'Connecting...' : 'Connect Stripe to get paid'}
    </button>
  );
};

export default StripeNotificationBubble;
