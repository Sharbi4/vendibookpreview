import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, AlertTriangle, PlayCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatUsd } from '@/lib/monetization/products';

// deno-lint-ignore no-explicit-any
const anyClient = supabase as any;

interface WebhookEvent {
  id: string;
  stripe_event_id: string;
  event_type: string;
  processed_at: string;
  status: string;
  error_message: string | null;
}

interface PendingRow {
  id: string;
  user_id: string | null;
  product_id: string;
  listing_id: string | null;
  stripe_session_id: string | null;
  amount_cents: number;
  status: string;
  fulfillment_status: string;
  created_at: string;
  paid_at: string | null;
}

interface RefundEvent {
  id: string;
  purchase_id: string;
  stripe_event_id: string;
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  refund_amount_cents: number;
  refund_status: string;
  currency: string;
  created_at: string;
}

interface ServiceRow {
  id: string;
  user_id: string | null;
  listing_id: string | null;
  amount_cents: number;
  status: string;
  fulfillment_status: string;
  created_at: string;
  paid_at: string | null;
  product_slug: string | null;
  product_name: string | null;
}

/** Monetization SKUs that require a human to complete the work. */
const MANUAL_SERVICE_SLUGS = [
  'listing_rewrite',
  'listing_photo_shoot',
  'concierge_setup',
];

export default function AdminMonetizationOps() {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [refunds, setRefunds] = useState<RefundEvent[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processed' | 'error'>('all');

  useEffect(() => {
    (async () => {
      if (!user) { setCheckingAdmin(false); return; }
      const { data } = await supabase.rpc('is_admin', { user_id: user.id });
      setIsAdmin(!!data);
      setCheckingAdmin(false);
    })();
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const [ev, pn, rf, sv] = await Promise.all([
        anyClient.from('stripe_webhook_events')
          .select('*').order('processed_at', { ascending: false }).limit(200),
        anyClient.from('monetization_pending_reconciliation').select('*').limit(100),
        anyClient.from('monetization_refund_events')
          .select('*').order('created_at', { ascending: false }).limit(100),
        anyClient.from('monetization_purchases')
          .select('id,user_id,listing_id,amount_cents,status,fulfillment_status,created_at,paid_at,monetization_products!inner(slug,name)')
          .in('monetization_products.slug', MANUAL_SERVICE_SLUGS)
          .in('status', ['paid', 'fulfilled'])
          .order('created_at', { ascending: false })
          .limit(200),
      ]);
      setEvents(ev.data ?? []);
      setPending(pn.data ?? []);
      setRefunds(rf.data ?? []);
      setServices(((sv.data ?? []) as any[]).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        listing_id: r.listing_id,
        amount_cents: r.amount_cents,
        status: r.status,
        fulfillment_status: r.fulfillment_status,
        created_at: r.created_at,
        paid_at: r.paid_at,
        product_slug: r.monetization_products?.slug ?? null,
        product_name: r.monetization_products?.name ?? null,
      })));
    } catch (e) {
      console.error('admin monetization ops load failed', e);
      toast.error('Failed to load operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const eventTypes = useMemo(() => {
    const s = new Set(events.map((e) => e.event_type));
    return ['all', ...Array.from(s).sort()];
  }, [events]);

  const filteredEvents = useMemo(() => events.filter((e) => {
    if (typeFilter !== 'all' && e.event_type !== typeFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    return true;
  }), [events, typeFilter, statusFilter]);

  const runReconciler = async (purchaseId?: string) => {
    setReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke('monetization-reconciler', {
        body: purchaseId ? { purchase_id: purchaseId } : {},
      });
      if (error) throw error;
      const results = (data as { results?: Array<{ action: string }>; scanned?: number }) ?? {};
      const changed = (results.results ?? []).filter((r) => r.action !== 'no_change' && r.action !== 'error').length;
      const errored = (results.results ?? []).filter((r) => r.action === 'error').length;
      toast.success(
        `Scanned ${results.scanned ?? 0} purchase(s) — ${changed} updated${errored ? `, ${errored} error(s)` : ''}.`,
      );
      await load();
    } catch (e) {
      console.error('reconciler failed', e);
      toast.error(e instanceof Error ? e.message : 'Reconciler failed');
    } finally {
      setReconciling(false);
    }
  };

  if (authLoading || checkingAdmin) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const errorEvents = events.filter((e) => e.status === 'error').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Monetization Ops
          </h1>
          <p className="text-sm text-muted-foreground">
            Stripe webhook trail, stuck purchases, and refund audit log.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={load} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button
            onClick={() => runReconciler()}
            size="sm"
            disabled={reconciling || pending.length === 0}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            {reconciling ? 'Reconciling…' : `Reconcile ${pending.length} stuck`}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Recent webhook events" value={String(events.length)} />
        <StatCard
          label="Webhook errors"
          value={String(errorEvents)}
          tone={errorEvents > 0 ? 'warning' : undefined}
        />
        <StatCard
          label="Stuck purchases"
          value={String(pending.length)}
          tone={pending.length > 0 ? 'warning' : undefined}
        />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Reconciliation ({pending.length})</TabsTrigger>
          <TabsTrigger value="events">Webhook events</TabsTrigger>
          <TabsTrigger value="refunds">Refund audit</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nothing stuck. All paid purchases are fulfilled and no pending sessions are older than 15 minutes.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Fulfillment</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-left">Session</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{row.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.fulfillment_status}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatUsd(row.amount_cents)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground truncate max-w-[220px]">
                        {row.stripe_session_id ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reconciling}
                          onClick={() => runReconciler(row.id)}
                        >
                          Reconcile
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Filters</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Type</label>
                <select
                  className="ml-2 rounded border border-border bg-background px-2 py-1 text-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Status</label>
                <select
                  className="ml-2 rounded border border-border bg-background px-2 py-1 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'processed' | 'error')}
                >
                  <option value="all">all</option>
                  <option value="processed">processed</option>
                  <option value="error">error</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Processed</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Event ID</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Error</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No events match the filters.
                    </td>
                  </tr>
                )}
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(ev.processed_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{ev.event_type}</td>
                    <td className="px-3 py-2">
                      <a
                        href={`https://dashboard.stripe.com/events/${ev.stripe_event_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                      >
                        {ev.stripe_event_id.slice(0, 24)}…
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      {ev.status === 'error' ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> error
                        </Badge>
                      ) : (
                        <Badge variant="outline">processed</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[280px]">
                      {ev.error_message ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="refunds" className="mt-4 space-y-3">
          <IssueRefundCard onDone={load} />

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">When</th>
                  <th className="px-3 py-2 text-left">Purchase</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Refund ID</th>
                </tr>
              </thead>
              <tbody>
                {refunds.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No refund events recorded.
                    </td>
                  </tr>
                )}
                {refunds.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.purchase_id.slice(0, 8)}…</td>
                    <td className="px-3 py-2">
                      <Badge variant={r.refund_status === 'full' ? 'destructive' : 'outline'}>
                        {r.refund_status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {formatUsd(r.refund_amount_cents)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {r.stripe_refund_id ?? r.stripe_charge_id ?? '—'}
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

function StatCard({
  label, value, tone,
}: { label: string; value: string; tone?: 'warning' }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div
          className={
            'mt-1 text-2xl font-semibold ' +
            (tone === 'warning' ? 'text-amber-500' : 'text-foreground')
          }
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function IssueRefundCard({ onDone }: { onDone: () => void }) {
  const [purchaseId, setPurchaseId] = useState('');
  const [amountUsd, setAmountUsd] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!purchaseId.trim()) {
      toast.error('Enter a purchase ID');
      return;
    }
    const amt = amountUsd.trim() ? Math.round(parseFloat(amountUsd) * 100) : undefined;
    if (amt !== undefined && (!Number.isFinite(amt) || amt <= 0)) {
      toast.error('Invalid refund amount');
      return;
    }
    if (!confirm(`Refund ${amt ? `$${(amt / 100).toFixed(2)}` : 'the full charge'} for purchase ${purchaseId.slice(0, 8)}…?`)) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-monetization-refund', {
        body: { purchase_id: purchaseId.trim(), amount_cents: amt, note: note || undefined },
      });
      if (error) throw error;
      const refundId = (data as { refund_id?: string })?.refund_id;
      toast.success(`Refund issued${refundId ? ` (${refundId})` : ''}.`);
      setPurchaseId('');
      setAmountUsd('');
      setNote('');
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Refund failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Issue refund</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Purchase ID</label>
          <input
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs"
            value={purchaseId}
            onChange={(e) => setPurchaseId(e.target.value)}
            placeholder="uuid…"
          />
        </div>
        <div className="w-32">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Amount (USD)</label>
          <input
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm"
            value={amountUsd}
            onChange={(e) => setAmountUsd(e.target.value)}
            placeholder="Full"
            inputMode="decimal"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Note</label>
          <input
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <Button onClick={submit} size="sm" disabled={submitting}>
          {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Refund
        </Button>
      </CardContent>
    </Card>
  );
}
