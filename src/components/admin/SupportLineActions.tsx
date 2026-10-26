import { useState } from 'react';
import { Loader2, Phone, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const SUPPORT_LINE = '(866) 690-6227';
const AGENT_PHONE_KEY = 'vb-admin-callback-phone';

const display = (e164: string) =>
  e164.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3');

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
 * the guarded SMS path and only reach numbers that agreed to Vendibook texts.
 */
export default function SupportLineActions({ ticketId, customerPhone }: { ticketId: string; customerPhone: string }) {
  const { toast } = useToast();
  const [agentPhone, setAgentPhone] = useState(readSavedPhone);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'call' | 'text' | null>(null);

  const run = async (action: 'call_back' | 'text') => {
    setBusy(action === 'call_back' ? 'call' : 'text');
    if (action === 'call_back') {
      try {
        localStorage.setItem(AGENT_PHONE_KEY, agentPhone);
      } catch {
        // Remembering the number is only a convenience.
      }
    }
    const { data, error } = await supabase.functions.invoke('admin-phone-actions', {
      body: action === 'call_back'
        ? { action, ticket_id: ticketId, agent_phone: agentPhone }
        : { action, ticket_id: ticketId, message: text, idempotency_key: crypto.randomUUID() },
    });
    const failure = error ? (await error.context?.json?.().catch(() => null))?.error || error.message : data?.error;
    setBusy(null);
    if (failure) {
      toast({ title: action === 'call_back' ? 'Call not started' : 'Text not sent', description: failure, variant: 'destructive' });
      return;
    }
    toast({ title: action === 'call_back' ? 'Calling you now' : 'Text sent', description: data?.message });
    if (action === 'text') setText('');
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
          Only numbers that agreed to Vendibook texts can be texted. The customer sees {SUPPORT_LINE}, never your number.
        </p>
      </div>
    </div>
  );
}
