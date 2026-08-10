import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { RefreshCw, Search, RotateCw, AlertTriangle, DollarSign, Users, Activity, BookOpen, ShieldAlert, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';

// Approximate MRR value per tier (USD monthly). Adjust if pricing tiers change.
const TIER_MRR: Record<string, number> = { starter: 19, pro: 49, premium: 149 };
const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  trialing: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
  past_due: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  canceled: 'bg-muted text-muted-foreground border-border',
  incomplete: 'bg-muted text-muted-foreground border-border',
  unpaid: 'bg-red-500/15 text-red-500 border-red-500/30',
};

type Sub = {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  revoke_at_period_end: boolean;
  flagged_at: string | null;
  flag_reason: string | null;
  updated_at: string;
};
type Evt = {
  id: string;
  event_id: string;
  event_type: string;
  processed: boolean | null;
  processing_error: string | null;
  verification_status: string | null;
  processed_at: string | null;
  created_at: string | null;
};

const evtStatus = (e: Evt) => (e.processed ? 'processed' : e.processing_error ? 'failed' : 'pending');

function fmt(iso?: string | null) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return '—'; }
}
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return '—'; }
}

export default function AdminBilling() {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [events, setEvents] = useState<Evt[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc('is_admin', { user_id: user.id }).then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  const load = async () => {
    setLoading(true);
    const [subsRes, evRes] = await Promise.all([
      supabase.from('host_subscriptions').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('paypal_webhook_events').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    setSubs((subsRes.data as Sub[]) ?? []);
    setEvents((evRes.data as Evt[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const filtered = useMemo(() => {
    return subs.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (s.user_id?.toLowerCase().includes(q)
          || s.stripe_customer_id?.toLowerCase().includes(q)
          || s.stripe_subscription_id?.toLowerCase().includes(q));
      }
      return true;
    });
  }, [subs, statusFilter, query]);

  const mrr = useMemo(() => {
    return subs
      .filter(s => s.status === 'active' || s.status === 'trialing')
      .reduce((acc, s) => acc + (TIER_MRR[s.tier] ?? 0), 0);
  }, [subs]);

  const resyncUser = async (userId: string) => {
    setBusy(`resync:${userId}`);
    try {
      const { data, error } = await supabase.functions.invoke('admin-billing-ops', {
        body: { action: 'resync_user', user_id: userId },
      });
      if (error) throw error;
      toast.success(`Resynced (${(data as any)?.resynced ?? 0} subscription(s))`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Resync failed');
    } finally { setBusy(null); }
  };

  const retryEvent = async (evtRowId: string) => {
    setBusy(`retry:${evtRowId}`);
    try {
      const { data, error } = await supabase.functions.invoke('admin-billing-ops', {
        body: { action: 'retry_event', event_row_id: evtRowId },
      });
      if (error) throw error;
      toast.success((data as any)?.note ?? 'Event re-processed');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Retry failed');
    } finally { setBusy(null); }
  };

  if (authLoading || isAdmin === null) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const failedCount = events.filter(e => evtStatus(e) === 'failed').length;
  const activeCount = subs.filter(s => s.status === 'active' || s.status === 'trialing').length;
  const flaggedCount = subs.filter(s => s.flagged_at).length;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
          <header className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">Billing operations</h1>
              <p className="text-sm text-muted-foreground mt-1">Subscribers, webhook health, and support tools for PayPal billing.</p>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <StatCard icon={<DollarSign className="h-4 w-4" />} label="MRR (approx)" value={`$${mrr.toLocaleString()}`} />
            <StatCard icon={<Users className="h-4 w-4" />} label="Active subscribers" value={String(activeCount)} />
            <StatCard icon={<Activity className="h-4 w-4" />} label="Failed webhooks" value={String(failedCount)} tone={failedCount ? 'warn' : undefined} />
            <StatCard icon={<ShieldAlert className="h-4 w-4" />} label="Flagged accounts" value={String(flaggedCount)} tone={flaggedCount ? 'warn' : undefined} />
          </div>

          <Tabs defaultValue="subscribers" className="space-y-4">
            <TabsList>
              <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
              <TabsTrigger value="webhooks">Webhook health {failedCount ? <Badge variant="destructive" className="ml-2">{failedCount}</Badge> : null}</TabsTrigger>
              <TabsTrigger value="runbook"><BookOpen className="h-3.5 w-3.5 mr-1.5" />Runbook</TabsTrigger>
            </TabsList>

            <TabsContent value="subscribers">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base">Subscribers</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="user id / customer / sub" value={query} onChange={e => setQuery(e.target.value)} className="pl-7 h-8 w-64" />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="trialing">Trialing</SelectItem>
                          <SelectItem value="past_due">Past due</SelectItem>
                          <SelectItem value="canceled">Canceled</SelectItem>
                          <SelectItem value="incomplete">Incomplete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Renews / Ends</TableHead>
                          <TableHead>Provider IDs</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No subscribers match.</TableCell></TableRow>
                        ) : filtered.map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="font-mono text-xs">
                              <div>{s.user_id.slice(0, 8)}…</div>
                              {s.flagged_at && (
                                <Badge variant="destructive" className="mt-1 text-[10px]">
                                  <AlertTriangle className="h-3 w-3 mr-1" />{s.flag_reason ?? 'flagged'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="capitalize">{s.tier}</TableCell>
                            <TableCell><Badge variant="outline" className={`capitalize ${STATUS_TONE[s.status] || ''}`}>{s.status.replace(/_/g, ' ')}</Badge></TableCell>
                            <TableCell className="text-xs">
                              {fmtDate(s.current_period_end)}
                              {s.cancel_at_period_end && <div className="text-amber-600">cancels at period end</div>}
                              {s.revoke_at_period_end && <div className="text-red-500">revoke at period end</div>}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-muted-foreground">
                              {s.stripe_customer_id ?? '—'}<br/>{s.stripe_subscription_id ?? '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => resyncUser(s.user_id)} disabled={busy === `resync:${s.user_id}`}>
                                {busy === `resync:${s.user_id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><RotateCw className="h-3.5 w-3.5 mr-1.5" />Re-sync</>}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="webhooks">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Billing webhook events</CardTitle>
                  <CardDescription>Latest 200 events. Retry failed events after fixing the underlying issue.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Processed</TableHead>
                          <TableHead>Verification</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No events yet.</TableCell></TableRow>
                        ) : events.map(e => (
                          <TableRow key={e.id}>
                            <TableCell className="font-mono text-[11px]">{e.event_id}</TableCell>
                            <TableCell className="text-xs">{e.event_type}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={evtStatus(e) === 'processed' ? STATUS_TONE.active : evtStatus(e) === 'failed' ? STATUS_TONE.unpaid : STATUS_TONE.incomplete}>{evtStatus(e)}</Badge>
                              {e.processing_error && <div className="text-[11px] text-red-500 mt-1 max-w-xs truncate" title={e.processing_error}>{e.processing_error}</div>}
                            </TableCell>
                            <TableCell className="text-xs">{fmt(e.processed_at)}</TableCell>
                            <TableCell className="text-xs">{e.verification_status ?? '—'}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => retryEvent(e.id)} disabled={busy === `retry:${e.id}`}>
                                {busy === `retry:${e.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><RotateCw className="h-3.5 w-3.5 mr-1.5" />Retry</>}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="runbook"><BillingRunbook /></TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground">
            Feature access is driven by billing webhooks writing to <code>host_subscriptions</code>. If a user reports "I paid but nothing unlocked", use <strong>Re-sync</strong> on their row — never edit tier/status by hand.
            <Link to="/admin/monetization-ops" className="ml-2 text-primary underline">Monetization ops →</Link>
          </p>
        </div>
      </main>
    </>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: 'warn' }) {
  return (
    <Card className={tone === 'warn' ? 'border-amber-500/40' : ''}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg grid place-items-center ${tone === 'warn' ? 'bg-amber-500/15 text-amber-500' : 'bg-muted text-muted-foreground'}`}>{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function BillingRunbook() {
  const sections: { title: string; steps: string[] }[] = [
    {
      title: '💳 Payment failed (past_due)',
      steps: [
        'PayPal automatically retries the funding source over ~2 weeks. During that window `status = past_due` and access continues.',
        'Confirm the user got the payment-failed email (search Resend logs for their address).',
        'Tell the user to open Account → Manage billing to update their funding source (opens PayPal automatic payments).',
        'If retries succeed, `invoice.paid` flips status back to `active` automatically. No admin action needed.',
        'If all retries fail, the subscription cancels at the provider; access drops on the next webhook.',
      ],
    },
    {
      title: '🔓 "I paid but nothing unlocked"',
      steps: [
        'Find the user in the Subscribers tab (search by email → user id → paste here).',
        'Click **Re-sync** on their row. This pulls the live subscription state from the provider and rewrites their entitlement.',
        'If Re-sync says "No subscription found," the checkout never completed. Ask them to try again from /pricing.',
        'If the row is Active but the UI still shows Free, ask them to hard-refresh — the client caches entitlements for 60s.',
      ],
    },
    {
      title: '↩️ Refund request',
      steps: [
        'Open the user in `/admin/monetization-ops` and issue the refund there for one-time upgrades.',
        'For subscription refunds, issue the refund directly in the PayPal dashboard (Activity → find transaction → Refund).',
        'The `charge.refunded` webhook flags the account and sets `revoke_at_period_end = true`. Access ends at `current_period_end`.',
        'To revoke immediately instead, cancel the subscription at the provider — the cancellation webhook downgrades them on receipt.',
      ],
    },
    {
      title: '⚠️ Chargeback / dispute received',
      steps: [
        'The provider fires a dispute event. Our webhook flags the account (`flag_reason = dispute.created`) and sets `revoke_at_period_end = true`.',
        'Review the dispute in the PayPal Resolution Center. Submit evidence within 7 days if the charge was legitimate.',
        'If we lose the dispute, the subscription cancels automatically. Nothing else to do here.',
        'If we win, un-flag the account from this page by re-syncing (state will match the provider and clear `revoke_at_period_end` if the charge is no longer disputed).',
      ],
    },
    {
      title: '💲 Price change',
      steps: [
        'Create the new plan in the PayPal dashboard under the existing product. Never delete old plans — grandfathered subscribers stay on them.',
        'Update the plan ID reference in code / env so new checkouts use the new price.',
        'Existing subscribers stay on the old price until support migrates them to the new plan.',
        'On the next subscription-updated webhook, their plan and tier will refresh automatically.',
      ],
    },
  ];
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Billing runbook</CardTitle>
        <CardDescription>Plain-language playbook for the five most common billing tickets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map(s => (
          <section key={s.title}>
            <h3 className="font-semibold text-sm mb-2">{s.title}</h3>
            <ol className="list-decimal list-outside pl-5 space-y-1.5 text-sm text-muted-foreground">
              {s.steps.map((st, i) => <li key={i}>{st}</li>)}
            </ol>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
