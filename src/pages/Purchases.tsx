import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Package, Zap, Wrench, Receipt, ArrowRight, CheckCircle2, ExternalLink, Loader2, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscriptionManagement } from '@/hooks/useSubscriptionManagement';
import { useEntitlements, type Entitlement } from '@/hooks/useEntitlements';
import { PurchaseHistoryCard } from '@/components/monetization/PurchaseHistoryCard';
import PackagesIntro from '@/components/monetization/PackagesIntro';
import Header from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  trialing: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
  paid: 'bg-primary/15 text-primary border-primary/30',
  fulfilled: 'bg-primary/15 text-primary border-primary/30',
  past_due: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  refunded: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

/** Route the user to the surface where the benefit is actually used. */
function surfaceFor(e: Entitlement): { label: string; to: string } | null {
  if (e.source === 'listing_promotion' && e.listingId) return { label: 'View boost', to: `/listing/${e.listingId}` };
  if (e.listingId) return { label: 'View listing', to: `/listing/${e.listingId}` };
  const slug = e.productSlug.toLowerCase();
  if (slug.startsWith('permit')) return { label: 'Open PermitPath', to: '/tools/permitpath' };
  if (slug.includes('buyer')) return { label: 'Buyer services', to: '/buyer/services' };
  if (slug.includes('rewrite') || slug.includes('pricing_review') || slug.includes('white')) return { label: 'View request', to: '/services' };
  return null;
}

export default function Purchases() {
  const { all, loading, hasActiveSubscription } = useEntitlements();

  const subscriptions = all.filter((e) => e.kind === 'subscription');
  const promotions = all.filter((e) => e.kind === 'promotion');
  const services = all.filter((e) => e.kind === 'one_time' && (e.status === 'paid' || e.status === 'pending'));
  const completed = all.filter((e) => e.kind === 'one_time' && (e.status === 'fulfilled' || e.status === 'refunded'));

  // Provider-aware billing management (PayPal autopay vs legacy Stripe portal).
  const { openBilling, busy } = useSubscriptionManagement();
  const openStripePortal = openBilling;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8 md:py-12 space-y-6">
          <header className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Your purchases</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Active plans, add-ons, and transaction history in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {hasActiveSubscription && (
                <Button onClick={openStripePortal} variant="outline" size="sm" disabled={busy === 'portal'}>
                  {busy === 'portal' ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Manage billing
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link to="/pricing">
                  Browse plans & add-ons <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </header>


          {/* Subscriptions */}
          <Card className="rounded-2xl border border-border shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" /> Active subscriptions
              </CardTitle>
              <CardDescription>Recurring plans on your account</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-2">Loading...</p>
              ) : subscriptions.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  No active subscriptions. <Link to="/pricing" className="text-primary underline">See plans →</Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {subscriptions.map((s, i) => {
                    const isPass = s.productSlug === 'pro_weekly_pass' || s.productSlug?.endsWith('_pass');
                    const endsAtLabel = s.endsAt
                      ? (isPass ? `Active until ${fmtDate(s.endsAt)}` : `Renews ${fmtDate(s.endsAt)}`)
                      : null;
                    return (
                      <li key={`${s.productSlug}-${i}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{s.productName}</div>
                          {endsAtLabel && (
                            <div className="text-xs text-muted-foreground">{endsAtLabel}</div>
                          )}
                        </div>
                        <Badge variant="outline" className={`capitalize ${STATUS_TONE[s.status] || ''}`}>
                          {isPass ? 'pass' : s.status}
                        </Badge>
                      </li>
                    );
                  })}

                </ul>
              )}
            </CardContent>
          </Card>

          {/* Active boosts (time-boxed promotions) */}
          <Card className="rounded-2xl border border-border shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5" /> Active boosts
              </CardTitle>
              <CardDescription>Featured placements and badges running right now</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-2">Loading...</p>
              ) : promotions.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  No active boosts. <Link to="/pricing#upgrades" className="text-primary underline">See listing upgrades →</Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {promotions.map((e, i) => {
                    const surface = surfaceFor(e);
                    return (
                      <li key={`${e.productSlug}-${i}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{e.productName}</div>
                          {e.endsAt && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              Runs through {fmtDate(e.endsAt)}
                            </div>
                          )}
                        </div>
                        {surface && (
                          <Button asChild size="sm" variant="ghost">
                            <Link to={surface.to}>{surface.label}</Link>
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Services in progress */}
          <Card className="rounded-2xl border border-border shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="h-5 w-5" /> Services in progress
              </CardTitle>
              <CardDescription>Done-for-you work our team is delivering for you</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-2">Loading...</p>
              ) : services.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  No services in progress. <Link to="/services" className="text-primary underline">Explore services →</Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {services.map((e, i) => {
                    const surface = surfaceFor(e);
                    return (
                      <li key={`${e.productSlug}-${i}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{e.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            {e.listingId ? 'Applied to listing' : 'Account-wide'}
                            {fmtDate(e.since) ? ` · ordered ${fmtDate(e.since)}` : ''}
                          </div>
                        </div>
                        <Badge variant="outline" className={`capitalize ${STATUS_TONE[e.status] || ''}`}>
                          {e.status}
                        </Badge>
                        {surface && (
                          <Button asChild size="sm" variant="ghost">
                            <Link to={surface.to}>{surface.label}</Link>
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Completed / refunded */}
          {!loading && completed.length > 0 && (
            <Card className="rounded-2xl border border-border shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" /> Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {completed.map((e, i) => (
                    <li key={`${e.productSlug}-${i}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{e.productName}</div>
                        <div className="text-xs text-muted-foreground">{fmtDate(e.since)}</div>
                      </div>
                      <Badge variant="outline" className={`capitalize ${STATUS_TONE[e.status] || ''}`}>
                        {e.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <PackagesIntro variant="compact" className="mt-2" />

          {/* History */}
          <PurchaseHistoryCard />

          <Card className="rounded-2xl border border-dashed border-border bg-transparent">
            <CardContent className="py-4 text-xs text-muted-foreground flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5" />
              Need a refund or have a billing question? Email <a className="text-primary underline" href="mailto:support@vendibook.com">support@vendibook.com</a>.
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
