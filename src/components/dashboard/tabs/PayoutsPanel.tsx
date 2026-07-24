import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle2, AlertTriangle, ExternalLink, Wallet } from 'lucide-react';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmptyState from '../shared/EmptyState';

const PayoutsPanel = () => {
  const { user } = useAuth();
  const {
    isOnboardingComplete, isLoading, isConnecting, connectStripe,
    openStripeDashboard, isOpeningDashboard,
  } = useStripeConnect();

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ['host-payout-history', user?.id],
    enabled: !!user && isOnboardingComplete,
    queryFn: async () => {
      // Best-effort — some deployments don't expose payouts to the client.
      const { data } = await supabase
        .from('sale_transactions')
        .select('id, amount, platform_fee, created_at, status')
        .eq('seller_id', user!.id)
        .in('status', ['completed', 'buyer_confirmed'])
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  return (
    <div className="max-w-[840px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Payouts</h1>
        <p className="text-sm text-muted-foreground mt-1">Where your earnings land, and your Stripe Connect status.</p>
      </header>

      <button
        type="button"
        onClick={() => (isOnboardingComplete ? openStripeDashboard() : connectStripe())}
        disabled={isLoading || isConnecting || isOpeningDashboard}
        className="w-full text-left rounded-md border border-border bg-card p-6 hover:bg-muted/30 transition disabled:opacity-70 disabled:cursor-wait"
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your Stripe account…
          </div>
        ) : isOnboardingComplete ? (
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Stripe Connect is active</p>
              <p className="text-xs text-muted-foreground mt-1">
                Rentals settle in 24h · sales in 25d after buyer confirmation.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                {isOpeningDashboard ? 'Opening…' : 'Manage in Stripe'} <ExternalLink className="h-3 w-3" />
              </span>
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
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                {isConnecting ? 'Opening Stripe…' : 'Set up payouts'} <ExternalLink className="h-3 w-3" />
              </span>
            </div>
          </div>
        )}
      </button>

      <section className="rounded-md border border-border bg-card overflow-hidden">
        <header className="px-5 pt-4 pb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recent payouts</h2>
        </header>
        {payoutsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : payouts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payouts yet"
            description="Once a sale completes, the payout breakdown lands here — gross, fees, and net."
          />
        ) : (
          <ul className="divide-y divide-border">
            {payouts.map((p: any) => {
              const gross = (p.amount ?? 0) / 100;
              const fees = (p.platform_fee ?? 0) / 100;
              const net = gross - fees;
              const arrival = new Date(new Date(p.created_at).getTime() + 25 * 24 * 60 * 60 * 1000);
              return (
                <li key={p.id}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition text-left"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Order {p.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(p.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">${net.toLocaleString()}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64">
                      <p className="text-sm font-semibold text-foreground">Payout breakdown</p>
                      <ul className="mt-3 text-sm space-y-1.5">
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">Gross</span>
                          <span className="text-foreground">${gross.toLocaleString()}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">Vendibook fee</span>
                          <span className="text-foreground">−${fees.toLocaleString()}</span>
                        </li>
                        <li className="flex justify-between pt-1.5 border-t border-border">
                          <span className="text-foreground font-medium">Net to you</span>
                          <span className="text-foreground font-semibold">${net.toLocaleString()}</span>
                        </li>
                      </ul>
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Estimated arrival {arrival.toLocaleDateString()} · Stripe schedule may vary.
                      </p>
                    </PopoverContent>
                  </Popover>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
        Need to update bank info?{' '}
        <Link to="/account" className="text-foreground underline underline-offset-2">Open account settings</Link>.
      </div>
    </div>
  );
};

export default PayoutsPanel;
