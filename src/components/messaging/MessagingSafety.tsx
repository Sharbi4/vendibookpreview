import { useEffect, useState } from 'react';
import { ShieldCheck, Flag, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { messagingRpc, messageSendError } from '@/lib/messageSafety';
import './messaging.css';

export default function MessagingSafety({ kind, thread }: { kind: 'conversation' | 'booking'; thread: string }) {
  const [blocked, setBlocked] = useState(false);
  const [staff, setStaff] = useState(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('Impersonating support');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let current = true;
    setReady(false); setNotice(''); setBlocked(false); setStaff(false);
    messagingRpc('message_safety_context', { kind, thread }).then(({ data, error }) => {
      if (!current) return;
      if (error) { setNotice('Safety controls could not load. Refresh to try again.'); return; }
      setBlocked(!!data?.blocked); setStaff(!!data?.staff); setReady(true);
    });
    return () => { current = false; };
  }, [kind, thread]);
  async function toggleBlock() {
    setBusy(true); setNotice('');
    try {
      const { error } = await messagingRpc('set_message_block', { kind, thread, blocked: !blocked });
      if (error) throw error;
      setBlocked(!blocked);
      setNotice(blocked ? 'Member unblocked.' : 'Member blocked. Messages between your accounts are stopped.');
    } catch (error) { setNotice(messageSendError(error)); }
    finally { setBusy(false); }
  }
  async function report() {
    setBusy(true);
    try {
      const { error } = await messagingRpc('report_message_thread', { kind, thread, reason });
      if (error) throw error;
      setOpen(false); setNotice('Report received for review. You can also block this member.');
    } catch (error) { setNotice(messageSendError(error)); }
    finally { setBusy(false); }
  }
  return <aside className="message-safety" aria-label="Conversation safety">
    {staff && <strong className="message-staff"><ShieldCheck size={16} /> Verified Vendibook staff</strong>}
    <p><strong>Keep your account safe.</strong> Vendibook staff never ask for passwords, verification codes, or card details in chat. Open payment and account settings directly from your dashboard. Report suspicious messages—we investigate and remove impersonators.</p>
    <div className="flex flex-wrap gap-2 mt-2">
      <Button type="button" variant="outline" size="sm" disabled={!ready || busy} onClick={() => { setNotice(''); setOpen(true); }}><Flag size={14} className="mr-1" />Report</Button>
      <Button type="button" variant="outline" size="sm" disabled={!ready || busy} onClick={toggleBlock}><Ban size={14} className="mr-1" />{blocked ? 'Unblock member' : 'Block member'}</Button>
    </div>
    {notice && <p role="status" className="mt-2">{notice}</p>}
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
      <DialogContent className="message-report">
        <DialogTitle>Report this conversation</DialogTitle>
        <DialogDescription>Recent messages from this member will be saved for our moderation team. Reporting does not automatically remove their account.</DialogDescription>
        <label htmlFor={`report-reason-${thread}`}>What happened?</label>
        <select id={`report-reason-${thread}`} value={reason} onChange={e => setReason(e.target.value)} disabled={busy}>
          <option>Impersonating support</option><option>Suspicious payment link</option><option>Spam or harassment</option>
        </select>
        {notice && <p role="alert">{notice}</p>}
        <Button onClick={report} disabled={busy}>{busy ? 'Submitting…' : 'Submit report'}</Button>
      </DialogContent>
    </Dialog>
  </aside>;
}
