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
}: {
  orderId: string;
  viewerRole: string;
  canReport: boolean;
}) => {
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issueType, setIssueType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [reply, setReply] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('dispute_cases')
      .select('id, case_number, issue_type, description, status, outcome, resolution_reason, response_deadline_at, disbursement_frozen, created_at')
      .eq('payment_record_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setCaseRow((data as CaseRow) ?? null);
    if (data?.id) {
      const { data: msgs } = await supabase
        .from('dispute_case_messages')
        .select('id, author_role, body, attachments, created_at')
        .eq('case_id', data.id)
        .order('created_at', { ascending: true });
      setMessages((msgs as MessageRow[]) ?? []);
    }
    setLoading(false);
  }, [orderId]);

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

  if (!caseRow) {
    if (!canReport) return null;
    return (
      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Something wrong with this order?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Open a Vendibook case. The other party is notified with a response deadline, our team reviews
          it, and seller payment on this order pauses while the case is open.
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
                Opening a Vendibook case also satisfies PayPal's requirement that a buyer first tries to
                resolve the issue with the seller. It does not extend or replace any deadline PayPal or
                your card issuer sets.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={openCase} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Open case
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          <AlertTriangle className="h-3.5 w-3.5" /> Response due {fmt(caseRow.response_deadline_at)}
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
              <span>{m.author_role === 'admin' ? 'Vendibook' : m.author_role}</span>
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
