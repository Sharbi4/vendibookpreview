/**
 * sms-record-consent
 *
 * Public edge function invoked when a user affirmatively opts in from:
 *  - the signup form
 *  - a contextual invite (booking / listing / notification settings)
 *  - the public /sms enrollment page
 *
 * Writes both an sms_preferences row and an sms_consent_events audit row.
 * Authenticated users get their user_id attached; unauthenticated /sms
 * enrollments record a pending_verification preference (no active recurring
 * consent until secure verification of the number succeeds).
 *
 * Never sends an SMS itself — dispatch is the send-guard's job.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { normalizeNanpToE164, SMS_POLICY_VERSION } from '../_shared/smsConsent.ts';

const ALLOWED_SOURCES = new Set([
  'signup','booking','listing','settings','sms_page','support','system',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: {
    phone?: string;
    source?: string;
    disclosureText?: string;
    userAgent?: string;
    consent?: boolean;
    marketing?: boolean;
  };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const source = payload.source ?? 'settings';
  if (!ALLOWED_SOURCES.has(source)) {
    return new Response(JSON.stringify({ error: 'invalid_source' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (payload.consent !== true) {
    return new Response(JSON.stringify({ error: 'consent_required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // Marketing is not part of this program.
  if (payload.marketing === true) {
    return new Response(JSON.stringify({ error: 'marketing_not_supported' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const phoneE164 = normalizeNanpToE164(payload.phone ?? '');
  if (!phoneE164) {
    return new Response(JSON.stringify({ error: 'invalid_phone' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Optional user context (JWT is not required for /sms enrollment).
  let userId: string | null = null;
  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    try {
      const anon = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data } = await anon.auth.getUser();
      userId = data.user?.id ?? null;
    } catch { /* unauthenticated is fine */ }
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Signed-in users get an active opt-in immediately. Unauthenticated users
  // land in pending_verification — no recurring SMS until a verification
  // code round-trip is completed.
  const now = new Date().toISOString();
  const transactionalStatus = userId ? 'opted_in' : 'pending_verification';

  // Upsert preference by phone_e164.
  const { data: existing } = await admin
    .from('sms_preferences')
    .select('id, user_id')
    .eq('phone_e164', phoneE164)
    .maybeSingle();

  if (existing) {
    await admin
      .from('sms_preferences')
      .update({
        user_id: userId ?? existing.user_id,
        transactional_status: transactionalStatus,
        opted_in_at: userId ? now : null,
        opted_out_at: null,
        consent_source: source,
        consent_version: SMS_POLICY_VERSION,
        last_updated_at: now,
      })
      .eq('id', existing.id);
  } else {
    await admin.from('sms_preferences').insert({
      user_id: userId,
      phone_e164: phoneE164,
      transactional_status: transactionalStatus,
      opted_in_at: userId ? now : null,
      consent_source: source,
      consent_version: SMS_POLICY_VERSION,
    });
  }

  // Hash the disclosure snapshot rather than storing raw copies for every
  // consent event (keeps the audit log lean but still tamper-evident).
  const disclosure = payload.disclosureText ?? '';
  const disclosureHash = await sha256Hex(disclosure);

  await admin.from('sms_consent_events').insert({
    user_id: userId,
    phone_e164: phoneE164,
    event_type: userId ? 'opt_in' : 'verification_requested',
    source,
    disclosure_version: SMS_POLICY_VERSION,
    disclosure_text_hash: disclosureHash,
    ip_address:
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('cf-connecting-ip') ??
      null,
    user_agent: payload.userAgent ?? req.headers.get('user-agent') ?? null,
    metadata: { marketing: false, disclosure_length: disclosure.length },
  });

  return new Response(
    JSON.stringify({
      ok: true,
      status: transactionalStatus,
      requires_verification: !userId,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
