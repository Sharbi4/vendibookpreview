/**
 * MembershipSummaryCard — inline subscription controls for the Account page.
 *
 * Shows the current plan, renewal / access-end date, and lets the member
 * cancel or reactivate their subscription in place. The webhook remains the
 * source of truth: after invoking `manage-subscription` we refetch the local
 * `host_subscriptions` row so the UI reflects the synced state.
 *
 * Money logic is unchanged — this only wraps the existing edge function.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2, Crown, CalendarClock, XCircle, RotateCcw, AlertTriangle,
  ExternalLink, ArrowUpRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { parseEdgeError } from '@/lib/edgeErrors';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  trialing: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  past_due: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  unpaid: 'bg-red-500/15 text-red-600 border-red-500/30',
  canceled: 'bg-muted text-muted-foreground border-border',
  incomplete: 'bg-muted text-muted-foreground border-border',
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return '—'; }
}

export default function MembershipSummaryCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const entitlements = useHostEntitlements();
  const [scheduling, setScheduling] = useState<'cancel' | 'reactivate' | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  const { data: sub, isLoading, refetch } = useQuery({
    queryKey: ['membership-summary', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('host_subscriptions')
        .select('status, cancel_at_period_end, cancel_at, current_period_end, stripe_subscription_id')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const hasSubscription = !!sub?.stripe_subscription_id && sub.status !== 'canceled';
  const scheduledCancel = !!sub?.cancel_at_period_end && sub?.status !== 'canceled';
  const isPastDue = sub?.status === 'past_due' || sub?.status === 'unpaid';
  const statusClass = STATUS_STYLES[sub?.status ?? ''] ?? 'bg-muted text-muted-foreground border-border';

  /** Poll for the webhook mirror after a manage action. Stripe fires
   *  customer.subscription.updated near-instantly, but not synchronously. */
  const refetchUntilSynced = async (expectedCancel: boolean) => {
    for (let i = 0; i < 6; i++) {
      const { data } = await refetch();
      if (!!data?.cancel_at_period_end === expectedCancel) return;
      await new Promise((r) => setTimeout(r, 700));
    }
  };

  const manageSchedule = async (action: 'cancel' | 'reactivate') => {
    setScheduling(action);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action },
      });
      if (error) throw error;
      toast({
        title: action === 'cancel' ? 'Cancellation scheduled' : 'Subscription resumed',
        description: action === 'cancel'
          ? `Access continues through ${fmtDate(
              data?.cancel_at
                ? new Date((data.cancel_at as number) * 1000).toISOString()
                : sub?.current_period_end,
            )}.`
          : 'Your plan will renew normally at the end of the current period.',
      });
      await refetchUntilSynced(action === 'cancel');
    } catch (err) {
      const parsed = await parseEdgeError(err);
      toast({
        title: 'Could not update subscription',
        description: parsed?.message ?? (err instanceof Error ? err.message : 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setScheduling(null);
    }
  };

  const openPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
      else throw new Error('Portal URL missing');
    } catch (err) {
      const parsed = await parseEdgeError(err);
      toast({
        title: 'Could not open billing portal',
        description: parsed?.message ?? (err instanceof Error ? err.message : 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <section id="section-membership" className="scroll-mt-24">
      <div className="mb-3 px-1 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground font-display">Membership & billing</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your plan, cancel, or resume — right here.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link to="/account/subscription">
            <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
            Full billing page
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-primary rounded"><Crown className="h-3.5 w-3.5 text-primary-foreground" /></div>
            <div>
              <div className="text-sm font-semibold text-foreground">{entitlements.planLabel}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {scheduledCancel ? 'Access ends ' : hasSubscription ? 'Renews ' : ''}
                {(hasSubscription || scheduledCancel) && fmtDate(sub?.cancel_at ?? sub?.current_period_end)}
                {!hasSubscription && !scheduledCancel && 'Free tier'}
              </div>
            </div>
          </div>
          {sub?.status && (
            <Badge variant="outline" className={`capitalize ${statusClass}`}>
              {String(sub.status).replace(/_/g, ' ')}
            </Badge>
          )}
        </div>

        {isPastDue && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Payment failed. Update your card in the billing portal to keep your plan active.
            </p>
          </div>
        )}

        {scheduledCancel && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Scheduled to cancel on{' '}
            <strong className="text-foreground">
              {fmtDate(sub?.cancel_at ?? sub?.current_period_end)}
            </strong>
            . Resume anytime before then.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : hasSubscription ? (
            <>
              {scheduledCancel ? (
                <Button
                  size="sm"
                  onClick={() => manageSchedule('reactivate')}
                  disabled={scheduling !== null}
                >
                  {scheduling === 'reactivate' ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Resuming…</>
                  ) : (
                    <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Resume subscription</>
                  )}
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={scheduling !== null}>
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      Cancel subscription
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Schedule cancellation?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Your {entitlements.planLabel} plan will stay active until{' '}
                        <strong>{fmtDate(sub?.current_period_end)}</strong>. After that
                        your account returns to the free tier. You can resume anytime
                        before then.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep plan</AlertDialogCancel>
                      <AlertDialogAction onClick={() => manageSchedule('cancel')}>
                        Schedule cancellation
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button size="sm" variant="ghost" onClick={openPortal} disabled={openingPortal}>
                {openingPortal ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Opening…</>
                ) : (
                  <><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Billing & invoices</>
                )}
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/pricing">Choose a plan</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
