import { Check, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StripeStatusCardProps {
  isConnected: boolean;
  hasAccountStarted: boolean;
  isLoading: boolean;
  onConnect: () => void;
}

const StripeStatusCard = ({ isConnected, hasAccountStarted, isLoading, onConnect }: StripeStatusCardProps) => {
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
      <div className="bg-emerald-50 border border-foreground rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-800">Stripe Connected</p>
            <p className="text-sm text-emerald-700">You can receive payments and payouts</p>
          </div>
        </div>
      </div>
    );
  }

  // User started onboarding but didn't complete it
  if (hasAccountStarted) {
    return (
      <div className="bg-blue-50 border border-foreground rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-800">Complete Your Stripe Setup</p>
              <p className="text-sm text-blue-700">You're almost there! Finish setup to start accepting payments.</p>
            </div>
          </div>
          <Button 
            onClick={onConnect}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue Setup
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-foreground rounded-xl p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-800">Connect Stripe to Publish</p>
            <p className="text-sm text-amber-700">Set up payouts to start accepting bookings</p>
          </div>
        </div>
        <Button 
          onClick={onConnect}
          className="bg-primary hover:bg-primary/90"
        >
          Connect Stripe
        </Button>
      </div>
    </div>
  );
};

export default StripeStatusCard;
