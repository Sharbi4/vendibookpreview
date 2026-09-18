import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Lock, RefreshCw, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import { CASE_OUTCOME_LABEL, CASE_STATUS_LABEL, issueLabel } from '@/lib/disputes';

interface FrozenCase {
  id: string;
  case_number: string;
  issue_type: string;
  description: string;
  status: string;
  created_at: string;
  sla_due_at: string | null;
  response_deadline_at: string | null;
  amount_held_cents: number;
  currency: string;
  payment_record_id: string;
  disbursement_frozen: boolean;
  days_open: number;
  blocking: string;
  past_sla: boolean;
  source?: string | null;
  paypal_dispute_id?: string | null;
  paypal_dispute_reason?: string | null;
  paypal_dispute_status?: string | null;
  payable: { status: string; deadline_remaining_seconds: number | null } | null;
}

const money = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format((cents ?? 0) / 100);

const AdminDisputes = () => {
  const [cases, setCases] = useState<FrozenCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<FrozenCase | null>(null);
  const [outcome, setOutcome] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('dispute-case-ops', {
      body: { action: 'frozen_list' },
    });
    if (error || (data as any)?.error) toast.error((data as any)?.error ?? 'Could not load cases.');
    setCases(((data as any)?.cases ?? []) as FrozenCase[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resolve = async () => {
    if (!target || !outcome || reason.trim().length < 5) {
      return toast.error('Choose an outcome and write the reason for the record.');
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('dispute-case-ops', {
      body: { action: 'admin_resolve', case_id: target.id, outcome, reason: reason.trim() },
    });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? 'Could not resolve.');
    toast.success('Case resolved and both parties notified.');
    setTarget(null); setOutcome(''); setReason('');
    void load();
  };

  const totalHeld = cases.reduce((s, c) => s + (c.amount_held_cents ?? 0), 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <SEO title="Cases & frozen orders · Vendibook admin" description="Open Vendibook cases and frozen disbursements." noindex />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Cases &amp; frozen orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {cases.length} open · {money(totalHeld)} held from seller payment
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : cases.length === 0 ? (
        <Card className="mt-8 p-10 text-center text-sm text-muted-foreground">No open cases.</Card>
      ) : (
        <div className="mt-8 space-y-4">
          {cases.map((c) => (
            <Card key={c.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{c.case_number}</h2>
                    <Badge variant="outline">{CASE_STATUS_LABEL[c.status] ?? c.status}</Badge>
                    {c.disbursement_frozen && (
                      <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600">
                        <Lock className="h-3 w-3" /> Payout frozen
                      </Badge>
                    )}
                    {c.paypal_dispute_id && (
                      <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
                        PayPal claim
                      </Badge>
                    )}
                    {c.past_sla && (
                      <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
                        <ShieldAlert className="h-3 w-3" /> Past SLA
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{issueLabel(c.issue_type)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {money(c.amount_held_cents, c.currency)} held · {c.days_open} day{c.days_open === 1 ? '' : 's'} open ·
                    {' '}blocking: {c.blocking}
                  </p>
                  {c.paypal_dispute_id && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      PayPal dispute {c.paypal_dispute_id}
                      {c.paypal_dispute_reason ? ` · ${c.paypal_dispute_reason.split('_').join(' ').toLowerCase()}` : ''}
                      {c.paypal_dispute_status ? ` · PayPal status: ${c.paypal_dispute_status}` : ''}
                    </p>
                  )}
                  {c.payable?.deadline_remaining_seconds != null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Clock paused with {Math.ceil(c.payable.deadline_remaining_seconds / 86400)} day(s) remaining.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/orders/${c.payment_record_id}`}>Open order</Link>
                  </Button>
                  <Button size="sm" onClick={() => { setTarget(c); setOutcome(''); setReason(''); }}>
                    Resolve
                  </Button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                {c.description}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve {target?.case_number}</DialogTitle>
            <DialogDescription>
              Recording an outcome unfreezes the order. Refunds are issued separately from the payout page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose an outcome" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CASE_OUTCOME_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reason for the record</Label>
              <Textarea
                className="mt-1.5 min-h-[100px] text-base"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What was decided and why. Both parties see this."
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={resolve} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDisputes;
