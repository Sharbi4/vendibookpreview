import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PlanRow {
  id: string;
  product_id: string;
  billing_interval: string;
  price_cents: number;
  currency: string;
  paypal_plan_id: string | null;
  external_status: string | null;
  is_active: boolean;
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
}

interface SyncResult {
  slug: string;
  billing_interval: string;
  price_cents: number;
  ok: boolean;
  paypal_plan_id: string | null;
  provider_error: string | null;
}

const money = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents ?? 0) / 100);

/**
 * Seeds and verifies the PayPal billing plans behind every active recurring
 * product. The catalog in our database stays the source of truth — this panel
 * only pushes those canonical prices/intervals to PayPal and stores the
 * returned plan ids. Re-running is safe.
 */
const PayPalPlanSyncPanel = () => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<SyncResult[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prods }, { data: pls }] = await Promise.all([
      supabase
        .from('monetization_products')
        .select('id, slug, name, price_cents')
        .eq('billing_type', 'recurring')
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('monetization_product_plans')
        .select('id, product_id, billing_interval, price_cents, currency, paypal_plan_id, external_status, is_active'),
    ]);
    setProducts((prods ?? []) as ProductRow[]);
    setPlans((pls ?? []) as PlanRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runSync = async () => {
    setSyncing(true);
    setResults(null);
    const { data, error } = await supabase.functions.invoke('admin-payment-catalog', {
      body: { action: 'sync_all_plans', provider: 'paypal' },
    });
    setSyncing(false);
    if (error) {
      toast.error('Plan sync failed. Check the function logs.');
      return;
    }
    const payload = data as { synced?: number; total?: number; results?: SyncResult[] };
    setResults(payload?.results ?? []);
    toast.success(`Synced ${payload?.synced ?? 0} of ${payload?.total ?? 0} plans.`);
    void load();
  };

  const planFor = (productId: string) => plans.find((p) => p.product_id === productId) ?? null;
  const missing = products.filter((p) => !planFor(p.id)?.paypal_plan_id).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            PayPal billing plans
            {missing > 0 ? (
              <Badge variant="destructive">{missing} unsynced</Badge>
            ) : (
              <Badge variant="secondary">All synced</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Pushes each active recurring product's canonical price and interval to PayPal and stores the
            returned plan id. Safe to re-run.
          </CardDescription>
        </div>
        <Button onClick={runSync} disabled={syncing} size="sm">
          {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sync plans
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active recurring products in the catalog.</p>
        ) : (
          products.map((product) => {
            const plan = planFor(product.id);
            const synced = Boolean(plan?.paypal_plan_id);
            return (
              <div
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {product.slug} · {money(product.price_cents)} · {plan?.billing_interval ?? 'not seeded'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {synced ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <code className="rounded bg-muted px-1.5 py-0.5">{plan?.paypal_plan_id}</code>
                    </>
                  ) : (
                    <>
                      <CircleAlert className="h-4 w-4 text-amber-500" />
                      <span className="text-muted-foreground">
                        {plan?.external_status === 'sync_failed' ? 'Sync failed' : 'Not created yet'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}

        {results?.some((r) => r.provider_error) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
            <p className="mb-1 font-medium">PayPal reported errors</p>
            <ul className="space-y-1 text-muted-foreground">
              {results
                .filter((r) => r.provider_error)
                .map((r) => (
                  <li key={`${r.slug}-${r.billing_interval}`}>
                    <span className="font-medium">{r.slug}</span>: {r.provider_error}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PayPalPlanSyncPanel;
