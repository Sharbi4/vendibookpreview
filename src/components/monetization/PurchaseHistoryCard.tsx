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
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);

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
      setFailed(!!error);
      if (error) console.error('[PurchaseHistoryCard] load failed', error);
      setRows((data ?? []) as PurchaseRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, reload]);

  return (
    <Card className="rounded-2xl border border-border shadow-sm bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5" />
          Payment history
        </CardTitle>
        <CardDescription>Latest 20 platform payment attempts, including pending and failed attempts</CardDescription>
      </CardHeader>
      <CardContent>
        {failed ? <p role="alert">Payment history could not be loaded. <button onClick={() => setReload(n => n + 1)}>Retry</button></p> : loading ? (
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
                  <details className="w-full text-sm text-muted-foreground mt-2">
                    <summary className="cursor-pointer underline">Payment details & help</summary>
                    <p className="mt-2">{r.status === 'pending' ? 'Payment is not confirmed. If you already approved a payment, contact support before paying again.' : r.status === 'failed' ? 'This payment attempt failed. Contact support if your payment provider shows a charge.' : r.status === 'cancelled' ? 'This attempt was cancelled. It is not confirmation of a completed purchase.' : 'The status above is the current recorded status for this purchase.'}</p>
                    <p className="break-all mt-2">Purchase reference: {r.id}</p>
                    <a className="inline-block underline mt-2" href={`mailto:support@vendibook.com?subject=${encodeURIComponent('Payment help: ' + r.id)}`}>Contact payment support</a>
                  </details>
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
