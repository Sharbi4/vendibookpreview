/**
 * AccountSubscription — dedicated subscription management page.
 *
 * Combines: current plan detail, in-app cancel/reactivate scheduling,
 * Stripe Customer Portal launch (for payment methods / invoices / plan
 * switches with proration), and an upgrade/downgrade tier grid that
 * highlights the current plan.
 *
 * Money logic is unchanged: new subscribes use the existing checkout
 * flow via ProductPricingCard; tier switches for existing subscribers
 * route to the Stripe Portal so proration stays authoritative on Stripe.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, Crown, ExternalLink, AlertTriangle, CalendarClock,
  RefreshCw, ShieldCheck, ArrowUpRight, XCircle, RotateCcw, Check,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { SEO } from '@/components/SEO';
import { useMonetizationProducts } from '@/hooks/useMonetizationProducts';
import { ProductPricingCard } from '@/components/monetization/ProductPricingCard';
import { useHostEntitlements, type HostTier } from '@/hooks/useHostEntitlements';
import { effectivePriceCents, formatUsd } from '@/lib/monetization/products';
import { buildCheckoutReturnPaths } from '@/lib/monetization/returnRoutes';
import { parseFunctionError } from '@/lib/edgeErrors';

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

/** Rank the catalog slug against the current entitlement tier. */
function slugRank(slug: string): number {
  const key = slug.toLowerCase();
  if (key.includes('operator') || key.includes('premium')) return 3;
  if (key.includes('growth') || key.includes('pro')) return 2;
  if (key.includes('starter') || key.includes('seller_plus') || key.includes('seller-plus')) return 1;
  return 0;
}
const TIER_RANK: Record<HostTier, number> = { free: 0, starter: 1, pro: 2, premium: 3 };

export default function AccountSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const entitlements = useHostEntitlements();
  const { products, loading: productsLoading } = useMonetizationProducts('host_subscription');
  const [openingPortal, setOpeningPortal] = useState(false);
  const [scheduling, setScheduling] = useState<'cancel' | 'reactivate' | null>(null);

  const { data: sub, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['host-subscription-detail', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('host_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const hasSubscription = !!sub?.stripe_subscription_id && sub.status !== 'canceled';
  const currentRank = TIER_RANK[entitlements.tier] ?? 0;
  const statusClass = STATUS_STYLES[sub?.status ?? ''] ?? 'bg-muted text-muted-foreground border-border';

  const openPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
      else throw new Error('Portal URL missing');
    } catch (err) {
      const parsed = await parseFunctionError(err);
      toast({
        title: 'Could not open billing portal',
        description: parsed?.message ?? (err instanceof Error ? err.message : 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setOpeningPortal(false);
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
          ? `Access continues through ${fmtDate(data?.cancel_at ? new Date((data.cancel_at as number) * 1000).toISOString() : sub?.current_period_end)}.`
          : 'Your plan will renew normally at the end of the current period.',
      });
      await refetch();
    } catch (err) {
      const parsed = await parseFunctionError(err);
      toast({
        title: 'Could not update subscription',
        description: parsed?.message ?? (err instanceof Error ? err.message : 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setScheduling(null);
    }
  };

  const scheduledCancel = !!sub?.cancel_at_period_end && sub?.status !== 'canceled';
  const isPastDue = sub?.status === 'past_due' || sub?.status === 'unpaid';

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.display_order - b.display_order),
    [products],
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-3">
            <ShieldCheck className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Sign in to manage your subscription.
            </p>
            <Button asChild size="sm"><Link to="/auth">Sign in</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Manage Subscription | Vendibook"
        description="Upgrade, downgrade, cancel, or resume your Vendibook host subscription. Manage billing and invoices through the secure Stripe portal."
      />
      <section className="mx-auto max-w-5xl px-4 py-10 md:py-14 space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Account · Billing
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground">
            Manage subscription
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Change your plan, schedule a cancellation, or open the secure billing
            portal to update your payment method and download invoices.
          </p>
        </header>

        {/* Current plan */}
        <Card className="rounded-2xl border border-border shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <div className="p-1 bg-primary rounded"><Crown className="h-3.5 w-3.5 text-primary-foreground" /></div>
                Current plan
              </span>
              {sub?.status && (
                <Badge variant="outline" className={`capitalize ${statusClass}`}>
                  {String(sub.status).replace(/_/g, ' ')}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="py-6 grid place-items-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !hasSubscription ? (
              <div className="rounded-xl border border-dashed border-border p-4 bg-muted/20">
                <p className="text-sm text-muted-foreground mb-3">
                  You're on the free tier. Choose a plan below to unlock featured
                  placement, advanced analytics, and priority support.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Plan</div>
                    <div className="font-medium text-foreground mt-0.5">{entitlements.planLabel}</div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {scheduledCancel ? 'Access ends' : 'Renews'}
                    </div>
                    <div className="font-medium text-foreground mt-0.5">
                      {fmtDate(sub?.cancel_at ?? sub?.current_period_end)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Billing status</div>
                    <div className="font-medium text-foreground mt-0.5 capitalize">
                      {sub?.status?.replace(/_/g, ' ') ?? '—'}
                    </div>
                  </div>
                </div>

                {isPastDue && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800">
                      <div className="font-medium">Payment failed</div>
                      <p className="text-amber-700/90 mt-0.5">
                        Update your card in the billing portal to keep your plan active. We'll retry automatically.
                      </p>
                    </div>
                  </div>
                )}

                {scheduledCancel && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    Your plan is scheduled to cancel on{' '}
                    <strong className="text-foreground">{fmtDate(sub?.cancel_at ?? sub?.current_period_end)}</strong>.
                    Reactivate anytime before then to keep renewing.
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={openPortal} disabled={openingPortal}>
                    {openingPortal
                      ? (<><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Opening…</>)
                      : (<><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Manage billing & invoices</>)}
                  </Button>

                  {scheduledCancel ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => manageSchedule('reactivate')}
                      disabled={scheduling !== null}
                    >
                      {scheduling === 'reactivate'
                        ? (<><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Resuming…</>)
                        : (<><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Resume subscription</>)}
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
                            <strong>{fmtDate(sub?.current_period_end)}</strong>. After that, your
                            account returns to the free tier. You can resume anytime before then.
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

                  <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Upgrade / downgrade grid */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {hasSubscription ? 'Change your plan' : 'Choose a plan'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {hasSubscription
                  ? 'Switch tiers anytime. Upgrades and downgrades are handled in the secure billing portal — Stripe prorates the difference automatically.'
                  : 'Every plan includes payment protection. Cancel or change anytime.'}
              </p>
            </div>
            {hasSubscription && (
              <Button variant="outline" size="sm" onClick={openPortal} disabled={openingPortal}>
                <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
                Open portal to switch plan
              </Button>
            )}
          </div>

          {productsLoading ? (
            <div className="py-10 grid place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {sortedProducts.map((p, i) => {
                const rank = slugRank(p.slug);
                const isCurrent = hasSubscription && rank === currentRank;
                const direction = !hasSubscription
                  ? null
                  : rank > currentRank ? 'upgrade'
                  : rank < currentRank ? 'downgrade'
                  : null;
                const paths = buildCheckoutReturnPaths(p.slug);

                if (isCurrent) {
                  return (
                    <Card
                      key={p.id}
                      className="rounded-2xl border-2 border-primary/50 bg-primary/[0.03] shadow-sm relative"
                    >
                      <div className="absolute -top-2 left-4">
                        <Badge className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wider">
                          Current plan
                        </Badge>
                      </div>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-baseline justify-between">
                          <h3 className="font-semibold text-foreground">{p.name}</h3>
                          <div className="text-right">
                            <div className="text-xl font-semibold text-foreground">
                              {formatUsd(effectivePriceCents(p))}
                            </div>
                            <div className="text-[11px] text-muted-foreground">/ month</div>
                          </div>
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        )}
                        {p.features?.length > 0 && (
                          <ul className="space-y-1.5 text-xs text-foreground/90">
                            {p.features.slice(0, 4).map((f) => (
                              <li key={f} className="flex items-start gap-1.5">
                                <Check className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="pt-1 text-[11px] text-muted-foreground">
                          You're on this plan. Use the portal to switch tiers or cancel.
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                // Existing subscribers: any tier change routes through the Stripe
                // Portal (proration handled by Stripe, no double-charging).
                if (hasSubscription) {
                  return (
                    <Card key={p.id} className="rounded-2xl border border-border bg-card">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-baseline justify-between">
                          <h3 className="font-semibold text-foreground">{p.name}</h3>
                          <div className="text-right">
                            <div className="text-xl font-semibold text-foreground">
                              {formatUsd(effectivePriceCents(p))}
                            </div>
                            <div className="text-[11px] text-muted-foreground">/ month</div>
                          </div>
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        )}
                        {p.features?.length > 0 && (
                          <ul className="space-y-1.5 text-xs text-foreground/90">
                            {p.features.slice(0, 4).map((f) => (
                              <li key={f} className="flex items-start gap-1.5">
                                <Check className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <Button
                          size="sm"
                          variant={direction === 'upgrade' ? 'default' : 'outline'}
                          className="w-full"
                          onClick={openPortal}
                          disabled={openingPortal}
                        >
                          {openingPortal ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Opening…</>
                          ) : direction === 'upgrade' ? (
                            <><ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />Upgrade in portal</>
                          ) : (
                            <>Switch to this plan</>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                }

                // Free users: new subscribe via existing checkout flow.
                return (
                  <ProductPricingCard
                    key={p.id}
                    product={p}
                    recommended={i === 1}
                    ctaLabel="Start plan"
                    successPath={paths.successPath}
                    cancelPath={paths.cancelPath}
                  />
                );
              })}
            </div>
          )}

          <div className="rounded-xl border border-border/70 bg-card/50 backdrop-blur-sm p-4 text-xs text-muted-foreground">
            Subscriptions renew automatically until canceled. Cancellations take effect at
            the end of the current paid period — you keep full access until then. Manage
            payment methods and invoices through the secure Stripe billing portal.
          </div>
        </section>
      </section>
    </div>
  );
}
