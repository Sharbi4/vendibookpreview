import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Phone, MessageSquare, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { invokeEdge } from '@/lib/edge/invokeFunction';
import { cn } from '@/lib/utils';

const SUPPORT_LINE = '(866) 690-6227';
const AGENT_PHONE_KEY = 'vb-admin-callback-phone';

type Message = { from: 'customer' | 'vendibook'; text: string; at: string; status?: string; pending?: boolean };

const display = (e164: string) =>
  e164.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3');
const when = (iso: string) =>
  new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const readSavedPhone = () => {
  try {
    return localStorage.getItem(AGENT_PHONE_KEY) ?? '';
  } catch {
    return '';
  }
};

/**
 * Call back or text a customer from the support line, (866) 690-6227.
 * Calls ring the admin's own phone first, then connect the customer with the
 * support line as caller ID, so no personal number is shown. Texts go through
 * the guarded SMS path; the conversation with this number shows right here and
 * refreshes on its own so replies appear without leaving the ticket.
 */
export default function SupportLineActions({ ticketId, customerPhone }: { ticketId: string; customerPhone: string }) {
  const { toast } = useToast();
  const [agentPhone, setAgentPhone] = useState(readSavedPhone);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'call' | 'text' | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [threadError, setThreadError] = useState('');
  const listRef = useRef<HTMLOListElement>(null);

  const loadThread = useCallback(async () => {
    const { data, error } = await invokeEdge<{ messages: Message[] }>('admin-phone-actions', {
      body: { action: 'text_thread', phone: customerPhone },
    });
    if (error) setThreadError(error);
    else { setThreadError(''); setMessages(data?.messages ?? []); }
  }, [customerPhone]);

  useEffect(() => {
    setMessages(null);
    void loadThread();
    const t = window.setInterval(loadThread, 20000);
    return () => window.clearInterval(t);
  }, [loadThread]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const run = async (action: 'call_back' | 'text') => {
    setBusy(action === 'call_back' ? 'call' : 'text');
    if (action === 'call_back') {
      try {
        localStorage.setItem(AGENT_PHONE_KEY, agentPhone);
      } catch {
        // Remembering the number is only a convenience.
      }
    }
    const draft = text.trim();
    if (action === 'text') {
      // Show the text in the thread immediately while it sends.
      setMessages((m) => [...(m ?? []), { from: 'vendibook', text: draft, at: new Date().toISOString(), pending: true }]);
    }
    const { data, error } = await supabase.functions.invoke('admin-phone-actions', {
      body: action === 'call_back'
        ? { action, ticket_id: ticketId, agent_phone: agentPhone }
        : { action, ticket_id: ticketId, message: draft, idempotency_key: crypto.randomUUID() },
    });
    const failure = error ? (await error.context?.json?.().catch(() => null))?.error || error.message : data?.error;
    setBusy(null);
    if (failure) {
      toast({ title: action === 'call_back' ? 'Call not started' : 'Text not sent', description: failure, variant: 'destructive' });
      if (action === 'text') await loadThread();
      return;
    }
    toast({ title: action === 'call_back' ? 'Calling you now' : 'Text sent', description: data?.message });
    if (action === 'text') {
      setText('');
      await loadThread();
    }
  };

  return (
    <div className="rounded-xl border border-border p-3 space-y-3">
      <p className="text-sm font-medium">
        Support line · customer number {display(customerPhone)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={agentPhone}
          onChange={(e) => setAgentPhone(e.target.value)}
          placeholder="Your phone (we ring you first)"
          inputMode="tel"
          className="h-9 w-56 text-sm"
        />
        <Button size="sm" disabled={busy !== null || !agentPhone.trim()} onClick={() => run('call_back')}>
          {busy === 'call' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Phone className="h-4 w-4 mr-1.5" />}
          Call back from {SUPPORT_LINE}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-muted/30">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <p className="text-xs font-semibold text-foreground">Text conversation</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void loadThread()} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3 w-3" aria-hidden /> Refresh
            </button>
            <Link to={`/admin/texts?phone=${encodeURIComponent(customerPhone)}`} className="text-xs text-primary hover:underline">
              Open in Texts
            </Link>
          </div>
        </div>
        <ol ref={listRef} className="max-h-72 overflow-y-auto p-3 space-y-2" aria-label="Text conversation" aria-live="polite">
          {messages === null ? (
            <li className="text-xs text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin mr-1.5" aria-hidden />Loading…</li>
          ) : messages.length === 0 ? (
            <li className="text-xs text-muted-foreground">No texts with this number yet.</li>
          ) : messages.map((m, i) => {
            const failed = m.status && m.status !== 'sent';
            return (
              <li
                key={`${m.at}-${i}`}
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                  m.from === 'customer' ? 'bg-card text-foreground border border-border'
                    : failed ? 'ml-auto bg-destructive/10 text-foreground border border-destructive/30'
                    : 'ml-auto bg-primary text-primary-foreground',
                  m.pending && 'opacity-70',
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={cn('mt-1 text-[11px]', m.from === 'customer' || failed ? 'text-muted-foreground' : 'text-primary-foreground/80')}>
                  {m.from === 'customer' ? 'Customer · ' : 'You · '}
                  {when(m.at)}
                  {m.pending ? ' · sending…' : failed ? ` · ${m.status}` : m.from === 'vendibook' ? ' · sent' : ''}
                </p>
              </li>
            );
          })}
        </ol>
        {threadError && <p role="alert" className="px-3 pb-2 text-xs text-destructive">{threadError}</p>}
      </div>

      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={600}
          placeholder="Text the customer from the support line"
          className="text-sm"
        />
        <Button size="sm" variant="outline" disabled={busy !== null || text.trim().length < 2} onClick={() => run('text')}>
          {busy === 'text' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-1.5" />}
          Text from {SUPPORT_LINE}
        </Button>
        <p className="text-xs text-muted-foreground">
          Replies show up above on their own. The customer sees {SUPPORT_LINE}, never your number.
        </p>
      </div>
    </div>
  );
}
