import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Lock, Paperclip, ShieldAlert, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import PayPalResolutionLink from './PayPalResolutionLink';
import {
  CASE_OUTCOME_LABEL, CASE_STATUS_LABEL, ISSUE_TYPES, isCaseOpen, issueLabel,
} from '@/lib/disputes';

interface CaseRow {
  id: string;
  case_number: string;
  issue_type: string;
  description: string;
  status: string;
  outcome: string | null;
  resolution_reason: string | null;
  response_deadline_at: string | null;
  disbursement_frozen: boolean;
  created_at: string;
  paypal_dispute_id: string | null;
  paypal_dispute_status: string | null;
  paypal_dispute_updated_at: string | null;
  evidence_links: Record<string, unknown>;
}

interface MessageRow {
  id: string;
  author_role: string;
  body: string;
  attachments: unknown;
  created_at: string;
}

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

/**
 * Vendibook case flow on the order page. Available to both buyer and seller.
 * The thread is deliberately separate from listing messages so the record
 * stays clean, and every statement is append-only.
 */
const OrderCaseSection = ({
  orderId,
  viewerRole,
  canReport,
  caseId,
  showPayPal = true,
}: {
  orderId: string;
  viewerRole: string;
  canReport: boolean;
  caseId?: string;
  showPayPal?: boolean;
}) => {
  const navigate = useNavigate();
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; event_type: string; created_at: string; to_state: string | null }>>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issueType, setIssueType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [reply, setReply] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    let query = supabase
      .from('dispute_cases')
      .select('id, case_number, issue_type, description, status, outcome, resolution_reason, response_deadline_at, disbursement_frozen, created_at, paypal_dispute_id, paypal_dispute_status, paypal_dispute_updated_at, evidence_links')
      .eq('payment_record_id', orderId);
    if (caseId) query = query.eq('id', caseId);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) { setLoadError(true); setLoading(false); return; }
    setCaseRow((data as CaseRow) ?? null);
    if (data?.id) {
      const { data: msgs } = await supabase
        .from('dispute_case_messages')
        .select('id, author_role, body, attachments, created_at')
        .eq('case_id', data.id)
        .order('created_at', { ascending: true });
      setMessages((msgs as MessageRow[]) ?? []);
      const { data: history } = await supabase.from('dispute_case_events').select('id, event_type, created_at, to_state').eq('case_id', data.id).order('created_at', { ascending: true });
      setEvents(history ?? []);
    }
    setLoading(false);
  }, [orderId, caseId]);

  useEffect(() => { void load(); }, [load]);

  const openCase = async () => {
    if (!issueType) return toast.error('Choose what went wrong.');
    if (description.trim().length < 20) return toast.error('Please describe what happened in a little more detail.');
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('dispute-case-ops', {
        body: { action: 'open', payment_record_id: orderId, issue_type: issueType, description: description.trim() },
      });
      if (error) throw new Error((error as any)?.message ?? 'We could not open the case.');
      if ((data as any)?.error) throw new Error((data as any).error);
      const newCaseId = (data as any)?.case?.id as string | undefined;
      if (newCaseId && files.length) await uploadEvidence(newCaseId, files);
      toast.success('Your case is open. We notified the other party.');
      setOpen(false);
      setDescription(''); setIssueType(''); setFiles([]);
      await load();
      if (newCaseId) navigate(`/dashboard/transactions/${orderId}/case/${newCaseId}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const uploadEvidence = async (caseId: string, list: File[]) => {
    const paths: string[] = [];
    for (const file of list.slice(0, 5)) {
      const path = `${caseId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from('dispute-evidence').upload(path, file);
      if (!error) paths.push(path);
    }
    if (paths.length) {
      await supabase.functions.invoke('dispute-case-ops', {
        body: { action: 'reply', case_id: caseId, body: `Attached ${paths.length} file(s) as evidence.`, attachments: paths },
      });
    }
  };

  const sendReply = async () => {
    if (!caseRow || reply.trim().length < 2) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('dispute-case-ops', {
        body: { action: 'reply', case_id: caseRow.id, body: reply.trim() },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? 'Message not sent.');
      if (files.length) await uploadEvidence(caseRow.id, files);
      setReply(''); setFiles([]);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const active = useMemo(() => caseRow && isCaseOpen(caseRow.status), [caseRow]);

  if (loading) return null;
  if (loadError) return <Card className="p-5"><p role="alert">We couldn't load support for this transaction.</p><Button variant="outline" onClick={() => void load()}>Try again</Button></Card>;
  if (caseId && !caseRow) return <p>Case unavailable for this transaction.</p>;

  if (!caseRow) {
    if (!canReport) return null;
    return (
      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Report an issue
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Start with a message to the other party, or ask Vendibook to review the issue. Your transaction records stay connected to the case.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="mt-3">
              <ShieldAlert className="mr-2 h-4 w-4" /> Report a problem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Report a problem</DialogTitle>
              <DialogDescription>
                Everything you write becomes part of the permanent case record and cannot be edited later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">What went wrong?</Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose an issue" /></SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">What happened?</Label>
                <Textarea
                  className="mt-1.5 min-h-[120px] text-base"
                  placeholder="Dates, what was agreed, and what actually happened."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="mr-2 h-4 w-4" />
                  {files.length ? `${files.length} file(s) selected` : 'Add photos or video (optional)'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This opens a Vendibook support case only. You can contact PayPal independently; opening this case does not change any PayPal or card issuer deadline.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={openCase} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Open case
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {showPayPal && <PayPalResolutionLink />}
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Vendibook case {caseRow.case_number}
          </h2>
          <p className="mt-1 text-sm font-medium">{issueLabel(caseRow.issue_type)}</p>
        </div>
        <Badge variant="outline">{CASE_STATUS_LABEL[caseRow.status] ?? caseRow.status}</Badge>
      </div>

      <p className="mt-4 text-sm whitespace-pre-wrap">{caseRow.description}</p>
      {!caseId && <Link className="inline-block mt-3 text-sm underline" to={`/dashboard/transactions/${orderId}/case/${caseRow.id}`}>Open case details</Link>}
      <div className="mt-4 rounded-xl border border-border p-4 text-sm"><p className="font-medium">Vendibook: {CASE_STATUS_LABEL[caseRow.status] ?? caseRow.status}</p><p className="mt-2">PayPal: {caseRow.paypal_dispute_status || 'No linked dispute recorded'}</p>{caseRow.paypal_dispute_id && <p className="mt-1 text-xs text-muted-foreground">{caseRow.paypal_dispute_id} · Updated {fmt(caseRow.paypal_dispute_updated_at)}</p>}</div>
      {showPayPal && <PayPalResolutionLink />}
      <details className="mt-4 rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-medium">Connected evidence</summary><p className="mt-2 text-xs text-muted-foreground">Linked at case creation. Open the transaction to review the original documents, handoff evidence, and tracking.</p><ul className="mt-3 space-y-1 text-sm">{Object.entries(caseRow.evidence_links || {}).filter(([key, value]) => Array.isArray(value) && key !== 'collection_errors').map(([key, value]) => <li key={key}>{key.replace(/_/g, ' ')}: {(value as unknown[]).length} record(s)</li>)}</ul><Link className="inline-block mt-3 text-sm underline" to={`/dashboard/transactions/${orderId}`}>View transaction records</Link></details>
      {events.length > 0 && <details className="mt-4 rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-medium">Case timeline</summary><ol className="mt-3 space-y-3">{events.map(event => <li key={event.id} className="text-sm"><p>{event.event_type.replace(/_/g, ' ')}{event.to_state ? ` · ${event.to_state.replace(/_/g, ' ')}` : ''}</p><time className="text-xs text-muted-foreground">{fmt(event.created_at)}</time></li>)}</ol></details>}

      {active && caseRow.disbursement_frozen && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
          <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Seller payment is paused.</span> No payout can
            be sent while this case is open, and the payment-condition countdown is paused with it. The
            time that was left resumes if the case closes without a refund.
          </p>
        </div>
      )}

      {active && caseRow.response_deadline_at && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> Vendibook response due {fmt(caseRow.response_deadline_at)}
        </p>
      )}

      {!active && (
        <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            {caseRow.outcome ? (CASE_OUTCOME_LABEL[caseRow.outcome] ?? caseRow.outcome) : 'Closed'}
          </p>
          {caseRow.resolution_reason && <p className="mt-1">{caseRow.resolution_reason}</p>}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
              <span>{m.author_role === 'admin' ? 'Vendibook' : m.author_role === 'system' ? 'Vendibook (automatic)' : m.author_role}</span>
              <span>{fmt(m.created_at)}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm">{m.body}</p>
          </div>
        ))}
      </div>

      {active && (
        <div className="mt-4 space-y-2">
          <Textarea
            className="min-h-[90px] text-base"
            placeholder="Add to the case record…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Paperclip className="mr-2 h-4 w-4" />
              {files.length ? `${files.length} file(s)` : 'Attach'}
            </Button>
            <Button size="sm" onClick={sendReply} disabled={busy || reply.trim().length < 2}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Keep this conversation on Vendibook — the case record is what our team reviews.
            {viewerRole === 'seller' ? ' Your payout stays paused until the case is resolved.' : ''}
          </p>
        </div>
      )}
    </Card>
  );
};

export default OrderCaseSection;
