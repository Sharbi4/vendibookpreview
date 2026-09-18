import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Clock,
  Loader2,
  PauseCircle,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface Payable {
  id: string;
  seller_id: string;
  transaction_type: string;
  currency: string;
  gross_collected_cents: number;
  platform_fee_cents: number;
  refunded_cents: number;
  net_payout_cents: number;
  status: string;
  release_due_at: string | null;
  payout_eligible_at: string | null;
  hold_reason: string | null;
  dispute_status: string | null;
  external_payout_reference: string | null;
  payout_method: string | null;
  payout_provider: string | null;
  payout_completed_at: string | null;
  payment_record_id: string;
  release_state: string | null;
  conditions_deadline_at: string | null;
  walkthrough_recorded_at: string | null;
  agreement_completed_at: string | null;
  failure_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  payment?: { reference: string; payment_status: string; buyer_email: string | null } | null;
  seller?: { full_name: string | null; email: string | null } | null;
}

type PayableStatus = Database['public']['Enums']['seller_payout_status'];

const TABS: { value: string; label: string; statuses: PayableStatus[] }[] = [
  { value: 'review', label: 'Needs review', statuses: ['eligible_for_review'] },
  { value: 'scheduled', label: 'Scheduled', statuses: ['pending_release'] },
  { value: 'approved', label: 'Approved', statuses: ['payout_approved', 'payout_processing'] },
  { value: 'issues', label: 'Holds & failures', statuses: ['payout_on_hold', 'payout_failed', 'disputed'] },
  { value: 'paid', label: 'Paid', statuses: ['payout_completed'] },
];

const money = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents ?? 0) / 100);

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/** Admin queue for manual seller payouts recorded against PayPal collections. */
export default function AdminPayouts() {
  const [tab, setTab] = useState('review');
  const [rows, setRows] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payoutTarget, setPayoutTarget] = useState<Payable | null>(null);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [refundTarget, setRefundTarget] = useState<Payable | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Payable | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const statuses = useMemo(() => TABS.find((t) => t.value === tab)?.statuses ?? [], [tab]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('seller_payables')
      .select(
        '*, payment:payment_records(reference, payment_status, buyer_email)',
      )
      .in('status', statuses)
      .order('release_due_at', { ascending: true })
      .limit(200);

    if (error) {
      toast.error('Could not load the payout queue.');
      setRows([]);
      setLoading(false);
      return;
    }
    const rawRows = (data as unknown as Payable[]) ?? [];
    const sellerIds = [...new Set(rawRows.map((row) => row.seller_id).filter(Boolean))];
    const sellers = sellerIds.length
      ? await supabase.from('profiles').select('id, full_name, email').in('id', sellerIds)
      : { data: [] };
    const byId = new Map((sellers.data ?? []).map((seller) => [seller.id, seller]));
    setRows(rawRows.map((row) => ({ ...row, seller: byId.get(row.seller_id) ?? null })));
    setLoading(false);
  }, [statuses]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (payable: Payable, action: string, body: Record<string, unknown> = {}) => {
    setBusyId(payable.id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-payout-action', {
        body: { action, payable_id: payable.id, ...body },
      });
      if (error || data?.error) {
        toast.error(data?.message || error?.message || 'That action was rejected.');
        return false;
      }
      toast.success('Payout updated.');
      await load();
      return true;
    } finally {
      setBusyId(null);
    }
  };

  const filtered = rows.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.payment?.reference?.toLowerCase().includes(q) ||
      r.seller?.full_name?.toLowerCase().includes(q) ||
      r.seller?.email?.toLowerCase().includes(q) ||
      r.external_payout_reference?.toLowerCase().includes(q)
    );
  });

  const totalDue = filtered.reduce((sum, r) => sum + (r.net_payout_cents ?? 0), 0);

  const refund = async () => {
    if (!refundTarget || !refundReason.trim()) return;
    setBusyId(refundTarget.id);
    try {
      const { data, error } = await supabase.functions.invoke('paypal-refund', {
        body: { payment_record_id: refundTarget.payment_record_id, reason: refundReason.trim() },
      });
      if (error || data?.error) {
        toast.error(data?.message || error?.message || 'PayPal could not issue this refund.');
        return;
      }
      toast.success('Full PayPal refund issued and recorded.');
      setRefundTarget(null);
      setRefundReason('');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const cancelOrder = async () => {
    if (!cancelTarget || cancelReason.trim().length < 5) return;
    setBusyId(cancelTarget.id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-cancel-order', {
        body: { payment_record_id: cancelTarget.payment_record_id, reason: cancelReason.trim() },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || 'The order was not cancelled.');
        return;
      }
      toast.success('Order cancelled, buyer refunded in full, both parties notified.');
      setCancelTarget(null);
      setCancelReason('');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO title="Payout queue — Vendibook admin" description="Manual seller payout queue." noindex />
      <Header />

      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Banknote className="h-6 w-6 text-primary" />
              Payout queue
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Seller proceeds collected through PayPal and paid manually. Approve, then record the
              external transfer reference once the money is sent.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap h-auto">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reference or seller"
              className="pl-9 text-base"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {filtered.length} record{filtered.length === 1 ? '' : 's'} · {money(totalDue)} in this view
        </p>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              Nothing in this queue right now.
            </Card>
          ) : (
            filtered.map((row) => (
              <Card key={row.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {row.seller?.full_name || row.seller?.email || 'Seller'}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{row.transaction_type}</Badge>
                      <StatusBadge status={row.status} />
                      {row.payout_provider === 'paypal' && row.status === 'payout_completed' ? (
                        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                          Auto-settled by PayPal
                        </Badge>
                      ) : null}
                      {row.dispute_status && row.dispute_status !== 'none' ? (
                        <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {row.dispute_status}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ref {row.payment?.reference ?? '—'} · collected {money(row.gross_collected_cents, row.currency)} ·
                      fee {money(row.platform_fee_cents, row.currency)}
                      {row.refunded_cents ? ` · refunded ${money(row.refunded_cents, row.currency)}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {row.payout_provider === 'paypal' && row.status === 'payout_completed'
                        ? `Settled by PayPal at capture ${when(row.payout_completed_at)} — no manual payout needed`
                        : `Review date ${when(row.conditions_deadline_at ?? row.release_due_at)}`}
                      {row.external_payout_reference ? ` · transfer ${row.external_payout_reference}` : ''}
                    </p>
                    {row.release_state && (
                      <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                        <span>Video: {row.walkthrough_recorded_at ? 'Complete' : 'Waiting'}</span>
                        <span>Signatures: {row.agreement_completed_at ? 'Complete' : 'Waiting'}</span>
                        <span>Deadline: {when(row.conditions_deadline_at)}</span>
                      </div>
                    )}
                    {row.hold_reason ? (
                      <p className="text-xs text-amber-500">Hold: {row.hold_reason}</p>
                    ) : null}
                    {row.failure_reason ? (
                      <p className="text-xs text-destructive">Failed: {row.failure_reason}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground tabular-nums">
                        {money(row.net_payout_cents, row.currency)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">net to seller</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {row.status === 'pending_release' ? (
                        <Button size="sm" variant="outline" disabled={busyId === row.id || row.release_state !== 'ready_for_review'}
                          onClick={() => act(row, 'mark_eligible')}>
                          Move to review
                        </Button>
                      ) : null}

                      {['eligible_for_review', 'pending_release'].includes(row.status) ? (
                        <Button size="sm" disabled={busyId === row.id || row.release_state !== 'ready_for_review'} onClick={() => act(row, 'approve')}>
                          {busyId === row.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Approve payout
                        </Button>
                      ) : null}

                      {['payout_approved', 'payout_processing', 'payout_failed'].includes(row.status) ? (
                        <Button size="sm" disabled={busyId === row.id}
                          onClick={() => {
                            setPayoutTarget(row);
                            setReference(row.external_payout_reference ?? '');
                            setNote('');
                          }}>
                          Record transfer
                        </Button>
                      ) : null}

                      {row.status === 'payout_processing' ? (
                        <Button size="sm" variant="outline" disabled={busyId === row.id}
                          onClick={() => act(row, 'mark_completed')}>
                          <BadgeCheck className="h-4 w-4 mr-2" />
                          Mark paid
                        </Button>
                      ) : null}

                      {row.status === 'payout_on_hold' ? (
                        <Button size="sm" variant="outline" disabled={busyId === row.id}
                          onClick={() => act(row, 'release_hold')}>
                          Resume review
                        </Button>
                      ) : row.status !== 'payout_completed' ? (
                        <Button size="sm" variant="outline" disabled={busyId === row.id}
                          onClick={() => {
                            const reason = window.prompt('Why is this payout being held?');
                            if (reason) act(row, 'hold', { note: reason });
                          }}>
                          <PauseCircle className="h-4 w-4 mr-2" />
                          Hold
                        </Button>
                      ) : null}
                      {row.release_state && !['payout_recorded', 'auto_refunded', 'cancelled'].includes(row.release_state) ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === row.id}
                          onClick={() => { setRefundTarget(row); setRefundReason(''); }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" /> Full refund
                        </Button>
                      ) : null}
                      {row.release_state && !['payout_recorded', 'auto_refunded', 'cancelled'].includes(row.release_state) ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === row.id}
                          onClick={() => { setCancelTarget(row); setCancelReason(''); }}
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Cancel &amp; refund order
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>

      <Dialog open={!!payoutTarget} onOpenChange={(open) => !open && setPayoutTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record the transfer</DialogTitle>
            <DialogDescription>
              Send the money outside Vendibook first, then paste the confirmation reference here.
              This creates a permanent audit record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transfer / confirmation reference"
              className="text-base"
            />
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (method, who sent it, anything unusual)"
              className="text-base"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayoutTarget(null)}>Cancel</Button>
            <Button
              disabled={!reference.trim() || busyId === payoutTarget?.id}
              onClick={async () => {
                if (!payoutTarget) return;
                const ok = await act(payoutTarget, 'record_manual_payout', {
                  external_reference: reference.trim(),
                  note: note.trim() || undefined,
                });
                if (ok) setPayoutTarget(null);
              }}
            >
              Save transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!refundTarget} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue a full PayPal refund?</DialogTitle>
            <DialogDescription>
              This sends the remaining captured amount back through PayPal and stops the seller payout.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={refundReason}
            onChange={(event) => setRefundReason(event.target.value)}
            placeholder="Required reason for the audit record"
            className="text-base"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefundTarget(null)}>Keep order</Button>
            <Button
              variant="destructive"
              disabled={!refundReason.trim() || busyId === refundTarget?.id}
              onClick={refund}
            >
              {busyId === refundTarget?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refund in full
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    payout_completed: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    payout_failed: 'bg-destructive/15 text-destructive border-destructive/30',
    payout_on_hold: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    payout_approved: 'bg-primary/15 text-primary border-primary/30',
  };
  return (
    <Badge className={`text-[10px] ${map[status] ?? 'bg-muted text-muted-foreground border-border'}`}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
