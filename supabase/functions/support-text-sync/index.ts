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

  const reqBody = await req.json().catch(() => ({}));
  if (reqBody?.check === 'webhook_signing') {
    // Read-only health check: does TWILIO_AUTH_TOKEN (used by
    // twilio-inbound-webhook to verify X-Twilio-Signature) belong to the
    // account that owns the support line? Returns booleans only.
    const accountSid = String(reqBody.account_sid ?? '');
    const token = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
    if (!/^AC[0-9a-f]{32}$/.test(accountSid)) return json({ error: 'account_sid required' }, 400);
    if (!token) return json({ auth_token_present: false, auth_token_valid: false });
    const probe = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { Authorization: 'Basic ' + btoa(`${accountSid}:${token}`) },
      signal: AbortSignal.timeout(10000),
    });
    await probe.body?.cancel();
    // Send a signed no-op to the live webhook exactly as Twilio would.
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-inbound-webhook`;
    const params: Record<string, string> = { VendibookSelfTest: 'webhook_signing', To: SUPPORT_LINE };
    const data = webhookUrl + Object.keys(params).sort().map((k) => k + params[k]).join('');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(token), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
    const signature = btoa(String.fromCharCode(...mac));
    const hook = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': signature },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(10000),
    });
    const hookText = (await hook.text()).slice(0, 40);
    return json({
      auth_token_present: true,
      auth_token_valid: probe.ok,
      twilio_status: probe.status,
      webhook_status: hook.status,
      webhook_accepts_signed: hook.ok && hookText === 'signed-ok',
    });
  }

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
