import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { messagingRpc, messageSendError } from '@/lib/messageSafety';
import { Button } from '@/components/ui/button';

type SafetyEvent = { id: string; user_id: string; reason: string; evidence: unknown; created_at: string; status: string };
export default function MessageSafetyQueue() {
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    const { data, error } = await (supabase as any).from('message_safety_events').select('id,user_id,reason,evidence,created_at,status').order('created_at', { ascending: false }).limit(100);
    setError(error?.message || ''); setEvents(data || []); setBusy(false);
  }
  useEffect(() => { void load(); }, []);
  async function review(id: string, action: string) {
    setBusy(true); setError('');
    try {
      const { error } = await messagingRpc('review_message_safety', { event_id: id, action });
      if (error) throw error;
      await load();
    } catch (error) { setError(messageSendError(error)); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-border p-4 mb-6 bg-background text-foreground">
    <div className="flex justify-between gap-3"><h2 className="font-semibold">Messaging safety review</h2><Button variant="outline" size="sm" onClick={load} disabled={busy}>Refresh reports</Button></div>
    <p className="text-sm text-muted-foreground mt-1">Member reports and messages stopped by safety checks. Pausing stops chat; it does not delete the account or transaction records.</p>
    {error && <p role="alert">{error}</p>}
    {!busy && !error && !events.length && <p className="mt-3 text-sm">No reports yet.</p>}
    <div className="max-h-96 overflow-y-auto space-y-3 mt-3">
      {events.map(event => <article key={event.id} className="border rounded-lg p-3">
        <strong>{event.reason}</strong><p className="text-xs mt-1">Account {event.user_id} · {new Date(event.created_at).toLocaleString()} · {event.status}</p>
        <details className="mt-2"><summary className="cursor-pointer">Review saved evidence</summary><pre className="whitespace-pre-wrap break-words text-xs mt-2">{JSON.stringify(event.evidence, null, 2)}</pre></details>
        <div className="flex gap-2 flex-wrap mt-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => review(event.id, 'pause')}>Pause messaging</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => review(event.id, 'restore')}>Restore messaging</Button>
          {event.status === 'open' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => review(event.id, 'dismiss')}>Mark reviewed</Button>}
        </div>
      </article>)}
    </div>
  </section>;
}
