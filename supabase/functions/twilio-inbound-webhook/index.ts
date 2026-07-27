/**
 * Twilio inbound-SMS webhook.
 *
 * Handles opt-out, help, and re-opt-in keywords against the sms_preferences /
 * sms_suppressions / sms_consent_events tables. Verifies the Twilio request
 * signature so a random caller can't forge an opt-in for someone else.
 *
 * Compliance rules:
 * - STOP always creates a number-level suppression, sets transactional_status
 *   to 'opted_out', and records an immutable consent event. It also cancels
 *   the send-guard's ability to text this number from any account.
 * - We reply with the single approved opt-out confirmation. If Twilio's own
 *   Advanced Opt-Out is enabled the provider suppresses our reply — we still
 *   log the event.
 * - START is treated as a NEW re-opt-in event; suppression is released only
 *   after successful processing.
 * - HELP returns the approved HELP body without touching consent state.
 * - Every insert is idempotent on MessageSid.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  classifyKeyword,
  normalizeNanpToE164,
  SMS_POLICY_VERSION,
  SMS_TEMPLATES,
} from '../_shared/smsConsent.ts';

const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const SKIP_SIG_VERIFY =
  Deno.env.get('SMS_TEST_MODE') === 'true' ||
  Deno.env.get('TWILIO_SKIP_SIGNATURE_VERIFY') === 'true';

async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  headerSig: string,
): Promise<boolean> {
  if (SKIP_SIG_VERIFY) return true;
  if (!TWILIO_AUTH_TOKEN || !headerSig) return false;
  const sortedKeys = Object.keys(params).sort();
  const data = url + sortedKeys.map((k) => k + params[k]).join('');
  const expected = await hmacSha1Base64(TWILIO_AUTH_TOKEN, data);
  return expected === headerSig;
}

function twiml(reply: string | null): Response {
  const body = reply
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(reply)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(body, { headers: { 'Content-Type': 'text/xml' } });
}
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!,
  );
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    // Verify the Twilio request signature. Twilio signs the *full* URL
    // including protocol + host + path (no query for POST form bodies).
    const sig = req.headers.get('X-Twilio-Signature') ?? '';
    const url = req.url;
    const valid = await verifyTwilioSignature(url, params, sig);
    if (!valid) {
      console.warn('twilio-inbound-webhook: invalid signature');
      return new Response('invalid signature', { status: 403 });
    }

    const from = normalizeNanpToE164(params.From) ?? String(params.From ?? '');
    const to = String(params.To ?? '');
    const body = String(params.Body ?? '').trim();
    const sid = String(params.MessageSid ?? '');

    // Idempotency: if this SID was already processed, replay the recorded
    // reply (empty by default) rather than mutating consent twice.
    if (sid) {
      const { data: existing } = await supabase
        .from('sms_inbound_messages')
        .select('id, action_taken')
        .eq('twilio_message_sid', sid)
        .maybeSingle();
      if (existing) {
        return twiml(null);
      }
    }

    const kind = classifyKeyword(body);
    let action: string | null = null;
    let reply: string | null = null;

    if (kind === 'opt_out') {
      action = 'opt_out';
      // Number-level suppression — applies across every account that
      // shares this phone number.
      await supabase.from('sms_suppressions').insert({
        phone_e164: from,
        sender_or_program: 'vendibook_transactional',
        reason: 'user_stop_keyword',
        source: 'provider_webhook',
        provider_message_sid: sid || null,
      });
      await supabase
        .from('sms_preferences')
        .update({
          transactional_status: 'opted_out',
          opted_out_at: new Date().toISOString(),
          consent_source: 'keyword',
        })
        .eq('phone_e164', from);
      await supabase.from('sms_consent_events').insert({
        phone_e164: from,
        event_type: 'opt_out',
        source: 'provider_webhook',
        disclosure_version: SMS_POLICY_VERSION,
        provider_message_sid: sid || null,
      });
      reply = SMS_TEMPLATES.opt_out_confirmation;
    } else if (kind === 'opt_in') {
      action = 'opt_in';
      // Release any active suppression, then record a NEW consent event.
      const { data: pref } = await supabase
        .from('sms_preferences')
        .select('id, user_id')
        .eq('phone_e164', from)
        .maybeSingle();
      const { data: evt } = await supabase
        .from('sms_consent_events')
        .insert({
          user_id: pref?.user_id ?? null,
          phone_e164: from,
          event_type: 're_opt_in',
          source: 'provider_webhook',
          disclosure_version: SMS_POLICY_VERSION,
          provider_message_sid: sid || null,
        })
        .select('id')
        .single();
      await supabase
        .from('sms_suppressions')
        .update({ released_at: new Date().toISOString(), released_by_event_id: evt?.id ?? null })
        .eq('phone_e164', from)
        .is('released_at', null);
      if (pref) {
        await supabase
          .from('sms_preferences')
          .update({
            transactional_status: 'opted_in',
            opted_in_at: new Date().toISOString(),
            opted_out_at: null,
            consent_source: 'keyword',
            consent_version: SMS_POLICY_VERSION,
          })
          .eq('id', pref.id);
      } else {
        await supabase.from('sms_preferences').insert({
          phone_e164: from,
          transactional_status: 'opted_in',
          opted_in_at: new Date().toISOString(),
          consent_source: 'keyword',
          consent_version: SMS_POLICY_VERSION,
        });
      }
      reply = SMS_TEMPLATES.enrollment_confirmation;
    } else if (kind === 'help') {
      action = 'help';
      reply = SMS_TEMPLATES.help_reply;
    }

    await supabase.from('sms_inbound_messages').insert({
      from_phone: from,
      to_phone: to,
      body,
      twilio_message_sid: sid || null,
      action_taken: action,
      raw_payload: params,
    });

    return twiml(reply);
  } catch (e) {
    console.error('twilio-inbound-webhook error:', e);
    return twiml(null);
  }
});
