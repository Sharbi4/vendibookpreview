import { useEffect, useState } from 'react';
import { Receipt, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type PurchaseRow = {
  id: string;
  status: string;
  created_at: string;
  amount_cents: number | null;
  currency: string | null;
  stripe_session_id: string | null;
  listing_id: string | null;
  monetization_products?: { name?: string | null; slug?: string | null } | null;
};

function formatMoney(cents: number | null, currency: string | null) {
  if (cents == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default',
  fulfilled: 'default',
  pending: 'secondary',
  refunded: 'outline',
  failed: 'destructive',
  cancelled: 'outline',
};

export function PurchaseHistoryCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('monetization_purchases')
        .select('id,status,created_at,amount_cents,currency,stripe_session_id,listing_id,monetization_products(name,slug)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (cancelled) return;
      if (error) console.error('[PurchaseHistoryCard] load failed', error);
      setRows((data ?? []) as PurchaseRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <Card className="rounded-2xl border border-border shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5" />
          Purchase history
        </CardTitle>
        <CardDescription>Add-ons, boosts, and services you've paid for</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading purchases...
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No purchases yet. Explore <a href="/pricing" className="text-primary underline underline-offset-2">plans & add-ons</a>.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((r) => {
              const name = r.monetization_products?.name ?? 'Upgrade';
              const variant = STATUS_VARIANT[r.status] ?? 'secondary';
              const date = new Date(r.created_at).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
              });
              return (
                <li key={r.id} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{name}</div>
                    <div className="text-xs text-muted-foreground">{date}</div>
                  </div>
                  <div className="text-sm text-foreground tabular-nums">
                    {formatMoney(r.amount_cents, r.currency)}
                  </div>
                  <Badge variant={variant} className="capitalize">{r.status}</Badge>
                  {r.stripe_session_id && (
                    <span className="text-xs text-muted-foreground font-mono">
                      #{r.stripe_session_id.slice(-8)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default PurchaseHistoryCard;
