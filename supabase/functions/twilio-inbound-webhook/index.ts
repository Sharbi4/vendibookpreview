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
import { processInboundText } from '../_shared/inboundText.ts';

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
    // Twilio signs the public URL; inside the edge runtime req.url can be the
    // internal one, so accept a signature over either.
    const publicUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-inbound-webhook`;
    const valid = (await verifyTwilioSignature(req.url, params, sig))
      || (req.url !== publicUrl && (await verifyTwilioSignature(publicUrl, params, sig)));
    if (!valid) {
      console.warn('twilio-inbound-webhook: invalid signature');
      return new Response('invalid signature', { status: 403 });
    }

    const { reply } = await processInboundText(supabase, params);
    return twiml(reply);
  } catch (e) {
    console.error('twilio-inbound-webhook error:', e);
    return twiml(null);
  }
});
