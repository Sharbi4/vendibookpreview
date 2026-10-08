import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Copy, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SEO from '@/components/SEO';

type Row = {
  id: string; partner_name: string; partner_state: string | null; code: string; academic_year: string | null; is_active: boolean;
  starts_at: string | null; expires_at: string | null; rental_percent: number; rental_cap_cents: number;
  purchase_credit_cents: number; purchase_min_cents: number; rental_uses_per_user: number; purchase_uses_per_user: number;
  rental_redemptions: number; purchase_redemptions: number; unique_users: number;
  rental_gmv_cents: number; purchase_gmv_cents: number; credits_cents: number; refunded_transactions: number;
  refunded_cents: number; platform_fee_cents: number; net_platform_revenue_cents: number;
};

type TypeFilter = 'all' | 'rental' | 'purchase';
type ActiveFilter = 'all' | 'active' | 'inactive';

const usd = (c: number | null | undefined) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(c ?? 0) / 100);
// Codes expire at the end of the day in Arizona (owner's time zone).
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-US', { timeZone: 'America/Phoenix' }) : '—');
const selectClass = 'h-10 rounded-md border border-input bg-background px-3 text-sm';

/** Campus Partner program report: per-code aggregates only, never buyer or payment details. */
export default function AdminCampusPartners() {
  const { user, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState('');
  const [state, setState] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [active, setActive] = useState<ActiveFilter>('all');

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    void supabase.rpc('is_admin', { user_id: user.id }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    // Date filters apply to redemptions (completed or used date); codes always list.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('campus_partner_report', {
      p_from: from ? new Date(`${from}T00:00:00`).toISOString() : null,
      p_to: to ? new Date(`${to}T23:59:59.999`).toISOString() : null,
    });
    if (error) toast.error("Couldn't load the Campus Partner report");
    setRows(((data ?? []) as Row[]).sort((a, b) => a.partner_name.localeCompare(b.partner_name)));
    setLoading(false);
  }, [from, to]);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  const toggle = async (row: Row, next: boolean) => {
    if (next && !window.confirm(`Activate ${row.code} for ${row.partner_name}? Buyers can use it right away.`)) return;
    const { error } = await supabase.from('promo_codes').update({ is_active: next }).eq('id', row.id);
    if (error) toast.error(error.message); else void load();
  };

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); toast.success(`Copied ${code}`); }
    catch { toast.error('Copy failed'); }
  };

  const states = useMemo(() => Array.from(new Set(rows.map((r) => r.partner_state).filter(Boolean) as string[])).sort(), [rows]);

  const visible = rows.filter((r) => {
    if (school && !`${r.partner_name} ${r.code}`.toLowerCase().includes(school.toLowerCase())) return false;
    if (state && r.partner_state !== state) return false;
    if (active === 'active' && !r.is_active) return false;
    if (active === 'inactive' && r.is_active) return false;
    return true;
  });

  const totals = visible.reduce((t, r) => ({
    rental: t.rental + Number(r.rental_redemptions),
    purchase: t.purchase + Number(r.purchase_redemptions),
    gmv: t.gmv + (type !== 'purchase' ? Number(r.rental_gmv_cents) : 0) + (type !== 'rental' ? Number(r.purchase_gmv_cents) : 0),
    credit: t.credit + Number(r.credits_cents),
    net: t.net + Number(r.net_platform_revenue_cents),
  }), { rental: 0, purchase: 0, gmv: 0, credit: 0, net: 0 });

  if (isLoading || isAdmin === null) return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const showRental = type !== 'purchase';
  const showPurchase = type !== 'rental';
  const headers = [
    'School', 'State', 'Code', 'Year', 'Active', 'Expires',
    ...(showRental ? ['Rental %', 'Rental cap'] : []),
    ...(showPurchase ? ['Purchase credit', 'Minimum'] : []),
    ...(showRental ? ['Rental uses'] : []),
    ...(showPurchase ? ['Purchase uses'] : []),
    'Unique users',
    ...(showRental ? ['Rental GMV'] : []),
    ...(showPurchase ? ['Purchase GMV'] : []),
    'Credits funded', 'Refunded txns', 'Platform revenue', 'Net platform revenue',
  ];

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <SEO title="Campus Partners | Vendibook Admin" description="Campus Partner program report" noindex />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Campus Partners</h1>
          <p className="text-sm text-muted-foreground">Vendibook-funded school codes. Credits never reduce host or seller payouts.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-7 gap-3 p-4">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="cp-school" className="text-xs">School or code</Label>
            <Input id="cp-school" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Search" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-state" className="text-xs">State</Label>
            <select id="cp-state" className={`${selectClass} w-full`} value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">All</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-type" className="text-xs">Type</Label>
            <select id="cp-type" className={`${selectClass} w-full`} value={type} onChange={(e) => setType(e.target.value as TypeFilter)}>
              <option value="all">Rental + purchase</option>
              <option value="rental">Rental</option>
              <option value="purchase">Purchase</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-active" className="text-xs">Status</Label>
            <select id="cp-active" className={`${selectClass} w-full`} value={active} onChange={(e) => setActive(e.target.value as ActiveFilter)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Redemption dates</Label>
            <div className="flex gap-1">
              <Input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="px-2" />
              <Input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="px-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ['Rental redemptions', String(totals.rental)],
          ['Purchase redemptions', String(totals.purchase)],
          ['Partner GMV', usd(totals.gmv)],
          ['Credits funded', usd(totals.credit)],
          ['Net platform revenue', usd(totals.net)],
        ].map(([l, v]) => (
          <Card key={l}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-semibold text-foreground">{v}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Codes ({visible.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>{headers.map((h) => <th key={h} className="py-2 pr-4 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 pr-4 whitespace-nowrap">{r.partner_name}</td>
                    <td className="py-2 pr-4">{r.partner_state ?? '—'}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className="font-mono">{r.code}</span>
                      <button type="button" onClick={() => void copy(r.code)} className="ml-1.5 align-middle text-muted-foreground hover:text-foreground" aria-label={`Copy ${r.code}`}>
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">{r.academic_year ?? '—'}</td>
                    <td className="py-2 pr-4"><Switch checked={r.is_active} onCheckedChange={(v) => void toggle(r, v)} aria-label={`Activate ${r.code}`} /></td>
                    <td className="py-2 pr-4 whitespace-nowrap">{day(r.expires_at)}</td>
                    {showRental ? <><td className="py-2 pr-4">{Number(r.rental_percent)}%</td><td className="py-2 pr-4">{usd(r.rental_cap_cents)}</td></> : null}
                    {showPurchase ? <><td className="py-2 pr-4">{usd(r.purchase_credit_cents)}</td><td className="py-2 pr-4">{usd(r.purchase_min_cents)}</td></> : null}
                    {showRental ? <td className="py-2 pr-4">{r.rental_redemptions}</td> : null}
                    {showPurchase ? <td className="py-2 pr-4">{r.purchase_redemptions}</td> : null}
                    <td className="py-2 pr-4">{r.unique_users}</td>
                    {showRental ? <td className="py-2 pr-4">{usd(r.rental_gmv_cents)}</td> : null}
                    {showPurchase ? <td className="py-2 pr-4">{usd(r.purchase_gmv_cents)}</td> : null}
                    <td className="py-2 pr-4">{usd(r.credits_cents)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{r.refunded_transactions}{Number(r.refunded_cents) > 0 ? ` · ${usd(r.refunded_cents)}` : ''}</td>
                    <td className="py-2 pr-4">{usd(r.platform_fee_cents)}</td>
                    <td className="py-2 pr-4">{usd(r.net_platform_revenue_cents)}</td>
                  </tr>
                ))}
                {visible.length === 0 ? <tr><td colSpan={headers.length} className="py-6 text-muted-foreground">No Campus Partner codes match these filters.</td></tr> : null}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
