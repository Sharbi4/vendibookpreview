import { useEffect, useMemo, useState } from 'react';
import { Loader2, DollarSign, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { formatUsd, type MonetizationProduct } from '@/lib/monetization/products';
import { SubscriptionRevenueSection, type HostSubscriptionRow } from '@/components/admin/SubscriptionRevenueSection';
import { toast } from 'sonner';

interface PurchaseRow {
  id: string;
  user_id: string | null;
  product_id: string;
  listing_id: string | null;
  amount_cents: number;
  status: string;
  fulfillment_status: string;
  refund_status: string | null;
  created_at: string;
  paid_at: string | null;
}

interface PromoRow {
  id: string;
  listing_id: string;
  promo_type: string;
  starts_at: string;
  ends_at: string;
  active: boolean;
}

interface DiscountRow {
  id: string;
  code: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  uses: number;
  max_uses: number | null;
  active: boolean;
  ends_at: string | null;
}

// deno-lint-ignore no-explicit-any
const anyClient = supabase as any;

export default function AdminRevenue() {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) {
        setIsCheckingAdmin(false);
        return;
      }
      const { data } = await supabase.rpc('is_admin', { user_id: user.id });
      setIsAdmin(!!data);
      setIsCheckingAdmin(false);
    })();
  }, [user]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<MonetizationProduct[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<HostSubscriptionRow[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [p, pu, pr, dc, sb] = await Promise.all([
        anyClient.from('monetization_products').select('*').order('display_order'),
        anyClient.from('monetization_purchases').select('*').order('created_at', { ascending: false }).limit(200),
        anyClient.from('listing_promotions').select('*').order('starts_at', { ascending: false }).limit(200),
        anyClient.from('discount_codes').select('*').order('created_at', { ascending: false }),
        anyClient.from('host_subscriptions').select('*').order('created_at', { ascending: false }).limit(1000),
      ]);
      setProducts(p.data ?? []);
      setPurchases(pu.data ?? []);
      setPromos(pr.data ?? []);
      setDiscounts(dc.data ?? []);
      setSubscriptions(sb.data ?? []);
    } catch (e) {
      console.error('admin revenue load failed', e);
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const summary = useMemo(() => {
    const paid = purchases.filter((p) => p.status === 'paid' || p.status === 'fulfilled');
    const gross = paid.reduce((s, p) => s + p.amount_cents, 0);
    const refunded = purchases
      .filter((p) => p.status === 'refunded')
      .reduce((s, p) => s + p.amount_cents, 0);
    const failed = purchases.filter((p) => p.status === 'failed').length;
    const byCategory: Record<string, number> = {};
    for (const purchase of paid) {
      const prod = products.find((x) => x.id === purchase.product_id);
      const cat = prod?.category ?? 'other';
      byCategory[cat] = (byCategory[cat] ?? 0) + purchase.amount_cents;
    }
    return { gross, refunded, failed, byCategory, paidCount: paid.length };
  }, [purchases, products]);

  const toggleProduct = async (id: string, next: boolean) => {
    const { error } = await anyClient
      .from('monetization_products')
      .update({ is_active: next })
      .eq('id', id);
    if (error) return toast.error(error.message);
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: next } : p)));
    toast.success(next ? 'Product activated' : 'Product deactivated');
  };

  if (authLoading || isCheckingAdmin) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Revenue & Services</h1>
          <p className="text-sm text-muted-foreground">
            Admin controls for the Vendibook monetization catalog.
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Gross revenue" value={formatUsd(summary.gross)} icon={DollarSign} />
        <SummaryCard label="Paid purchases" value={String(summary.paidCount)} icon={TrendingUp} />
        <SummaryCard label="Refunded" value={formatUsd(summary.refunded)} icon={RefreshCw} />
        <SummaryCard
          label="Failed payments"
          value={String(summary.failed)}
          icon={AlertTriangle}
          tone={summary.failed > 0 ? 'warning' : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by category</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(summary.byCategory).length === 0 && (
            <p className="text-sm text-muted-foreground">No paid purchases yet.</p>
          )}
          {Object.entries(summary.byCategory).map(([cat, cents]) => (
            <Badge key={cat} variant="outline" className="text-sm">
              {cat.split('_').join(' ')} · {formatUsd(cents)}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="discounts">Discount codes</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-4">
          <SubscriptionRevenueSection subscriptions={subscriptions} products={products} />
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-left">Billing</th>
                  <th className="px-3 py-2 text-right">Active</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.slug}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {p.category.split('_').join(' ')}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {formatUsd(p.price_cents)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.billing_type}</td>
                    <td className="px-3 py-2 text-right">
                      <Switch
                        checked={p.is_active}
                        onCheckedChange={(v) => toggleProduct(p.id, v)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Prices and metadata can be edited directly through the database until a full edit form
            ships. Deactivating a product hides it from checkout without deleting purchase history.
          </p>
        </TabsContent>

        <TabsContent value="purchases" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Fulfillment</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No purchases yet.
                    </td>
                  </tr>
                )}
                {purchases.map((row) => {
                  const prod = products.find((p) => p.id === row.product_id);
                  return (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{prod?.name ?? row.product_id}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatUsd(row.amount_cents)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.fulfillment_status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="promotions" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Listing</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Start</th>
                  <th className="px-3 py-2 text-left">End</th>
                  <th className="px-3 py-2 text-right">Active</th>
                </tr>
              </thead>
              <tbody>
                {promos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No promotions yet.
                    </td>
                  </tr>
                )}
                {promos.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{p.listing_id.slice(0, 8)}…</td>
                    <td className="px-3 py-2">{p.promo_type.split('_').join(' ')}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(p.starts_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(p.ends_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Badge variant={p.active ? 'default' : 'secondary'}>
                        {p.active ? 'Active' : 'Ended'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="discounts" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Discount</th>
                  <th className="px-3 py-2 text-right">Uses</th>
                  <th className="px-3 py-2 text-right">Active</th>
                </tr>
              </thead>
              <tbody>
                {discounts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      No discount codes yet.
                    </td>
                  </tr>
                )}
                {discounts.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono font-semibold">{d.code}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {d.percent_off != null
                        ? `${d.percent_off}% off`
                        : d.amount_off_cents != null
                        ? `${formatUsd(d.amount_off_cents)} off`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {d.uses}
                      {d.max_uses != null ? ` / ${d.max_uses}` : ''}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Badge variant={d.active ? 'default' : 'secondary'}>
                        {d.active ? 'Active' : 'Off'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'warning';
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={`mt-1 text-2xl font-semibold ${tone === 'warning' ? 'text-destructive' : 'text-foreground'}`}>
            {value}
          </div>
        </div>
        <Icon className={`h-6 w-6 ${tone === 'warning' ? 'text-destructive' : 'text-primary'}`} />
      </CardContent>
    </Card>
  );
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'paid' || status === 'fulfilled') return 'default';
  if (status === 'refunded' || status === 'failed' || status === 'cancelled') return 'destructive';
  return 'secondary';
}
