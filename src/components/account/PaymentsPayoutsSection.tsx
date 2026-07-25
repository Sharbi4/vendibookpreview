import { useState } from 'react';
import { Landmark, CreditCard, Loader2, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { SectionCard } from './RowLink';

/**
 * Payments & payouts — single source of truth for money settings.
 * - Hosts: Stripe Express dashboard (bank details, tax forms, payout history).
 * - Buyers: Stripe Billing Portal (saved cards, receipts).
 */
export default function PaymentsPayoutsSection() {
  const { session } = useAuth();
  const {
    hasAccountStarted,
    isOnboardingComplete,
    isLoading,
    isConnecting,
    isOpeningDashboard,
    payoutsEnabled,
    bankLast4,
    bankName,
    connectStripe,
    openStripeDashboard,
  } = useStripeConnect();

  const [openingPortal, setOpeningPortal] = useState(false);

  const openBillingPortal = async () => {
    if (!session?.access_token) return;
    const win = window.open('about:blank', '_blank');
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url && win) win.location.href = data.url;
      else if (data?.url) window.location.href = data.url;
      else win?.close();
    } catch (e) {
      win?.close();
      const msg = e instanceof Error ? e.message : 'Could not open billing portal';
      // 404 no_stripe_customer is expected for users who never paid — show a friendly hint.
      if (/no.?stripe.?customer/i.test(msg)) {
        toast.info('No saved payment methods yet — they\'ll appear here after your first purchase.');
      } else {
        toast.error(msg);
      }
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <SectionCard
      id="section-payments"
      title="Payments & payouts"
      description="Update where money comes in and goes out."
    >
      {/* Payout method (host / seller) */}
      <div className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
            <Landmark className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">Payout method</span>
              {isLoading ? (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">Checking</Badge>
              ) : isOnboardingComplete && payoutsEnabled ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] h-4 px-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Active
                </Badge>
              ) : hasAccountStarted ? (
                <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] h-4 px-1.5">
                  <AlertCircle className="h-2.5 w-2.5 mr-0.5" />Incomplete
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">Not set up</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isOnboardingComplete && bankLast4
                ? <>Bank {bankName ? <>· <span className="text-foreground/80">{bankName}</span> </> : null}·&nbsp;
                    <span className="tabular text-foreground/80">•••• {bankLast4}</span></>
                : isOnboardingComplete
                  ? 'Bank connected via Stripe. Payouts are enabled.'
                  : hasAccountStarted
                    ? 'Your Stripe account exists but onboarding isn\'t finished.'
                    : 'Connect a Stripe account to receive payouts from rentals and sales.'}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          {isOnboardingComplete ? (
            <Button variant="outline" size="sm" onClick={openStripeDashboard} disabled={isOpeningDashboard}>
              {isOpeningDashboard ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
              Update bank details
            </Button>
          ) : hasAccountStarted ? (
            <Button size="sm" onClick={() => connectStripe('/account')} disabled={isConnecting}>
              {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Finish payout setup
            </Button>
          ) : (
            <Button size="sm" onClick={() => connectStripe('/account')} disabled={isConnecting}>
              {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Connect Stripe
            </Button>
          )}
        </div>
      </div>

      {/* Payment methods (buyer) */}
      <div className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-foreground">Payment methods</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage saved cards and download receipts in Stripe's secure billing portal.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <Button variant="outline" size="sm" onClick={openBillingPortal} disabled={openingPortal}>
            {openingPortal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
            Manage cards
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
