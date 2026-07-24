import { Link } from 'react-router-dom';
import { CreditCard, Package, Receipt, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEntitlements } from '@/hooks/useEntitlements';
import { PurchaseHistoryCard } from '@/components/monetization/PurchaseHistoryCard';
import { Header } from '@/components/layout/Header';

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

export default function Purchases() {
  const { all, loading } = useEntitlements();

  const subscriptions = all.filter((e) => e.kind === 'subscription');
  const oneTimes = all.filter((e) => e.kind === 'one_time');

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
            <Button asChild variant="outline" size="sm">
              <Link to="/pricing">
                Browse plans & add-ons <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
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
                  {subscriptions.map((s, i) => (
                    <li key={`${s.productSlug}-${i}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{s.productName}</div>
                        {s.endsAt && (
                          <div className="text-xs text-muted-foreground">Renews {fmtDate(s.endsAt)}</div>
                        )}
                      </div>
                      <Badge variant="outline" className={`capitalize ${STATUS_TONE[s.status] || ''}`}>
                        {s.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* One-time entitlements */}
          <Card className="rounded-2xl border border-border shadow-sm bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" /> Add-ons & services
              </CardTitle>
              <CardDescription>One-time upgrades and services you've unlocked</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-2">Loading...</p>
              ) : oneTimes.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  No add-ons yet. <Link to="/pricing" className="text-primary underline">Explore add-ons →</Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {oneTimes.map((e, i) => (
                    <li key={`${e.productSlug}-${i}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{e.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.listingId ? 'Applied to listing' : 'Account-wide'}
                          {fmtDate(e.since) ? ` · ${fmtDate(e.since)}` : ''}
                        </div>
                      </div>
                      <Badge variant="outline" className={`capitalize ${STATUS_TONE[e.status] || ''}`}>
                        {e.status}
                      </Badge>
                      {e.listingId && (
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/listing/${e.listingId}`}>View listing</Link>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

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
