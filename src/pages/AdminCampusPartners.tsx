import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SEO from '@/components/SEO';

type Row = {
  id: string; partner_name: string; code: string; academic_year: string | null; is_active: boolean;
  starts_at: string | null; expires_at: string | null; rental_percent: number; rental_cap_cents: number;
  purchase_credit_cents: number; purchase_min_cents: number; rental_uses_per_user: number; purchase_uses_per_user: number;
  redemptions: number; rental_redemptions: number; purchase_redemptions: number; unique_users: number;
  rental_gmv_cents: number; purchase_gmv_cents: number; total_credit_cents: number; refunded_transactions: number;
  refunded_cents: number; platform_fee_cents: number; net_platform_revenue_cents: number;
};

const usd = (c: number | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(c ?? 0) / 100);
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

/** Campus Partner program report: aggregates only, no buyer or payment details. */
export default function AdminCampusPartners() {
  const { user, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    void supabase.rpc('is_admin', { user_id: user.id }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const load = async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('campus_partner_summary').select('*').order('partner_name');
    if (error) toast.error("Couldn't load Campus Partner report");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin]);

  const toggle = async (row: Row, active: boolean) => {
    const { error } = await supabase.from('promo_codes').update({ is_active: active }).eq('id', row.id);
    if (error) toast.error(error.message); else void load();
  };

  if (isLoading || isAdmin === null) return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const totals = rows.reduce((t, r) => ({
    redemptions: t.redemptions + r.redemptions, credit: t.credit + Number(r.total_credit_cents),
    gmv: t.gmv + Number(r.rental_gmv_cents) + Number(r.purchase_gmv_cents), net: t.net + Number(r.net_platform_revenue_cents),
  }), { redemptions: 0, credit: 0, gmv: 0, net: 0 });

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <SEO title="Campus Partners | Vendibook Admin" description="Campus Partner program report" noindex />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Campus Partners</h1>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Redemptions', String(totals.redemptions)], ['Partner GMV', usd(totals.gmv)], ['Credits funded', usd(totals.credit)], ['Net platform revenue', usd(totals.net)]].map(([l, v]) => (
          <Card key={l}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-semibold text-foreground">{v}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Codes</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>{['School', 'Code', 'Active dates', 'Rental', 'Purchase', 'Limits/user', 'Redemptions', 'Users', 'Rental GMV', 'Purchase GMV', 'Credits', 'Refunds', 'Platform fees', 'Net revenue', 'Active'].map((h) => <th key={h} className="py-2 pr-4 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 pr-4">{r.partner_name}</td>
                    <td className="py-2 pr-4 font-mono">{r.code}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{day(r.starts_at)} – {day(r.expires_at)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{Number(r.rental_percent)}% up to {usd(r.rental_cap_cents)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{usd(r.purchase_credit_cents)} on {usd(r.purchase_min_cents)}+</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{r.rental_uses_per_user} rental · {r.purchase_uses_per_user} purchase</td>
                    <td className="py-2 pr-4">{r.redemptions} ({r.rental_redemptions}R/{r.purchase_redemptions}P)</td>
                    <td className="py-2 pr-4">{r.unique_users}</td>
                    <td className="py-2 pr-4">{usd(r.rental_gmv_cents)}</td>
                    <td className="py-2 pr-4">{usd(r.purchase_gmv_cents)}</td>
                    <td className="py-2 pr-4">{usd(r.total_credit_cents)}</td>
                    <td className="py-2 pr-4">{r.refunded_transactions} · {usd(r.refunded_cents)}</td>
                    <td className="py-2 pr-4">{usd(r.platform_fee_cents)}</td>
                    <td className="py-2 pr-4">{usd(r.net_platform_revenue_cents)}</td>
                    <td className="py-2 pr-4"><Switch checked={r.is_active} onCheckedChange={(v) => toggle(r, v)} aria-label={`Activate ${r.code}`} /></td>
                  </tr>
                ))}
                {rows.length === 0 ? <tr><td colSpan={15} className="py-6 text-muted-foreground">No Campus Partner codes yet.</td></tr> : null}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
