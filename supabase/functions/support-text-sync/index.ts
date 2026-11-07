/**
 * Every 5 minutes: picks up texts to the support line (866) 690-6227 that the
 * Twilio webhook never delivered, and runs them through the same handling
 * (ticket, in-app alert, team email, STOP/START/HELP). Already-handled texts
 * are skipped on their unique Twilio MessageSid. No auto-replies are sent from
 * here, so a late pickup never texts the customer.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCaller, isAdminUser, isCronCaller } from '../_shared/callerGuard.ts';
import { processInboundText } from '../_shared/inboundText.ts';

const SUPPORT_LINE = '+18666906227';
const LOOKBACK_HOURS = 6;
const GATEWAY = 'https://connector-gateway.lovable.dev/twilio';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

interface TwilioMessage {
  sid: string;
  from: string;
  to: string;
  body: string;
  direction: string;
  num_media: string;
  date_sent: string | null;
  date_created: string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!(await isCronCaller(req))) {
    const caller = await getCaller(req);
    if (!caller || !(await isAdminUser(caller.id))) return json({ error: 'Forbidden' }, 403);
  }

  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const twilioKey = Deno.env.get('TWILIO_API_KEY');
  if (!lovableKey || !twilioKey) return json({ error: 'Twilio is not configured' }, 503);

  const cutoff = Date.now() - LOOKBACK_HOURS * 3_600_000;
  const sinceDay = new Date(cutoff).toISOString().slice(0, 10);
  const qs = new URLSearchParams({ To: SUPPORT_LINE, 'DateSent>': sinceDay, PageSize: '100' });
  const res = await fetch(`${GATEWAY}/Messages.json?${qs}`, {
    headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': twilioKey },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const details = await res.text();
    console.error(`support-text-sync: Twilio list failed [${res.status}]: ${details.slice(0, 300)}`);
    return json({ error: 'Twilio request failed', status: res.status }, 502);
  }
  const data = await res.json();
  const inbound = ((data?.messages ?? []) as TwilioMessage[]).filter((m) => {
    const at = Date.parse(m.date_sent ?? m.date_created);
    return m.direction === 'inbound' && at >= cutoff;
  });
  if (!inbound.length) return json({ checked: 0, picked_up: 0 });

  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });
  const { data: known } = await db
    .from('sms_inbound_messages')
    .select('twilio_message_sid')
    .in('twilio_message_sid', inbound.map((m) => m.sid));
  const seen = new Set((known ?? []).map((r: { twilio_message_sid: string }) => r.twilio_message_sid));

  let picked = 0;
  const failures: string[] = [];
  // Oldest first so a conversation's ticket opens on the first text.
  for (const m of inbound.filter((x) => !seen.has(x.sid)).reverse()) {
    try {
      const out = await processInboundText(
        db,
        { From: m.from, To: m.to, Body: m.body ?? '', MessageSid: m.sid, NumMedia: m.num_media ?? '0', SyncedBy: 'support-text-sync' },
        new Date(m.date_sent ?? m.date_created),
      );
      if (out.processed) picked += 1;
    } catch (e) {
      console.error('support-text-sync: processing failed', m.sid, e);
      failures.push(m.sid);
    }
  }
  if (picked) console.log(`support-text-sync: picked up ${picked} missed text(s)`);
  return json({ checked: inbound.length, picked_up: picked, failed: failures.length });
});
