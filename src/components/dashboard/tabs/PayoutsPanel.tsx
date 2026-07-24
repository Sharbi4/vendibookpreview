import { Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { Button } from '@/components/ui/button';

const PayoutsPanel = () => {
  const { status, isLoading, isConnecting, connect } = useStripeConnect() as any;

  return (
    <div className="max-w-[840px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Payouts</h1>
        <p className="text-sm text-muted-foreground mt-1">Where your earnings land, and your Stripe Connect status.</p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your Stripe account…
          </div>
        ) : status?.onboarding_complete ? (
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Stripe Connect is active</p>
              <p className="text-xs text-muted-foreground mt-1">
                Payouts land in your bank on Vendibook's standard schedule (rentals 24h, sales 25d after buyer confirmation).
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Finish Stripe onboarding to accept card payments</p>
              <p className="text-xs text-muted-foreground mt-1">You can still list and take cash / Pay in Person bookings without it.</p>
              <Button
                onClick={() => connect?.()}
                disabled={isConnecting}
                size="sm"
                className="mt-4"
              >
                {isConnecting ? 'Opening Stripe…' : 'Set up payouts'}
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Need to update bank info or see historical payouts?{' '}
        <Link to="/account" className="text-foreground underline underline-offset-2">Open account settings</Link>.
      </div>
    </div>
  );
};

export default PayoutsPanel;
