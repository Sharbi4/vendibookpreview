/**
 * Centralized server-side SMS sending guard.
 *
 * Every outgoing recurring or proactive SMS MUST go through `sendGuardedSms`.
 * The guard fails closed: any missing / stale / contradicted consent state
 * blocks the send and records the reason.
 *
 * DO NOT bypass this module or call Twilio directly from other functions.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  SMS_TRANSACTIONAL_CATEGORIES,
  type SmsTransactionalCategory,
  normalizeNanpToE164,
} from './smsConsent.ts';

export type GuardedSendInput = {
  recipientPhone: string;
  userId?: string | null;
  category: SmsTransactionalCategory;
  templateId: string;
  templateVersion?: string;
  businessPurpose: string;
  templateVariables?: Record<string, unknown>;
  body: string;
  /** Idempotency key. If a row already exists with the same value, we skip. */
  idempotencyKey?: string;
};

export type GuardResult =
  | { ok: true; providerMessageSid: string | null; logId: string }
  | { ok: false; reason: string; logId: string | null };

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER') || '';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? '';
const TWILIO_CONNECTOR_KEY = Deno.env.get('TWILIO_API_KEY') ?? '';
/** A person who texts the support line can get customer-care replies for this many days. */
const INBOUND_REPLY_DAYS = 7;
const IS_TEST_MODE =
  Deno.env.get('SMS_TEST_MODE') === 'true' ||
  Deno.env.get('DENO_ENV') === 'test';

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

function isApprovedCategory(cat: string): cat is SmsTransactionalCategory {
  return (SMS_TRANSACTIONAL_CATEGORIES as readonly string[]).includes(cat);
}

async function logBlocked(
  db: SupabaseClient,
  input: GuardedSendInput,
  phoneE164: string | null,
  reason: string,
): Promise<string | null> {
  const { data } = await db
    .from('sms_message_log_v2')
    .insert({
      user_id: input.userId ?? null,
      recipient_phone_e164: phoneE164 ?? input.recipientPhone,
      message_category: input.category,
      template_id: input.templateId,
      template_version: input.templateVersion ?? 'v1',
      business_purpose: input.businessPurpose,
      consent_basis: { blocked_reason: reason },
      template_variables: input.templateVariables ?? null,
      send_status: 'blocked',
      failure_reason: reason,
    })
    .select('id')
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Main entry. Runs every consent + suppression check before dispatching to
 * Twilio. In test mode, `SMS_TEST_MODE=true` makes it a dry run — nothing is
 * sent to Twilio, but every DB check + log write still happens.
 */
export async function sendGuardedSms(input: GuardedSendInput): Promise<GuardResult> {
  const db = admin();

  // 1) Category allowlist — hard block for anything outside the approved
  //    transactional set (marketing is not part of this program).
  if (!isApprovedCategory(input.category)) {
    const logId = await logBlocked(db, input, null, 'category_not_approved');
    return { ok: false, reason: 'category_not_approved', logId };
  }

  // 2) Normalize the phone number.
  const phoneE164 = normalizeNanpToE164(input.recipientPhone);
  if (!phoneE164) {
    const logId = await logBlocked(db, input, null, 'invalid_phone_format');
    return { ok: false, reason: 'invalid_phone_format', logId };
  }

  // 3) Number-level suppression wins over everything else.
  const { data: suppression, error: suppressionError } = await db
    .from('sms_suppressions')
    .select('id')
    .eq('phone_e164', phoneE164)
    .is('released_at', null)
    .limit(1).maybeSingle();
  if (suppressionError) return { ok: false, reason: 'suppression_check_unavailable', logId: null };
  if (suppression) {
    const logId = await logBlocked(db, input, phoneE164, 'suppressed_number');
    return { ok: false, reason: 'suppressed_number', logId };
  }

  // 4) Transactional consent must be opted_in. Customer-care replies may also
  //    rely on a conversation the person started: they texted the support line
  //    within INBOUND_REPLY_DAYS (and STOP, checked above, still wins).
  const { data: pref } = await db
    .from('sms_preferences')
    .select('id,user_id,transactional_status,phone_verified_at')
    .eq('phone_e164', phoneE164)
    .maybeSingle();
  const prefOk = Boolean(pref && pref.transactional_status === 'opted_in' && pref.phone_verified_at);
  let inbound: { id: string; created_at: string } | null = null;
  if (!prefOk && input.category === 'customer_care' && pref?.transactional_status !== 'opted_out') {
    const since = new Date(Date.now() - INBOUND_REPLY_DAYS * 86_400_000).toISOString();
    const { data } = await db
      .from('sms_inbound_messages')
      .select('id, created_at')
      .eq('from_phone', phoneE164)
      .gte('created_at', since)
      .eq('action_taken', 'support_text')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    inbound = data ?? null;
  }
  if (!prefOk && !inbound) {
    const logId = await logBlocked(db, input, phoneE164, 'no_active_consent');
    return { ok: false, reason: 'no_active_consent', logId };
  }

  // 5) Ownership check — the phone must belong to the intended recipient.
  //    Skipped when no userId is supplied (e.g. re-enrollment confirmation
  //    to an unauthenticated verified number).
  if (input.userId && pref && pref.user_id !== input.userId) {
    const logId = await logBlocked(db, input, phoneE164, 'phone_owner_mismatch');
    return { ok: false, reason: 'phone_owner_mismatch', logId };
  }

  // 6) Idempotency — de-dupe using the provided key when supplied.
  if (input.idempotencyKey) {
    const { data: dup } = await db
      .from('sms_message_log_v2')
      .select('id,send_status,provider_message_sid')
      .eq('recipient_phone_e164', phoneE164)
      .eq('template_id', input.templateId)
      .eq('business_purpose', `${input.businessPurpose}#${input.idempotencyKey}`)
      .maybeSingle();
    if (dup) {
      return dup.send_status === 'sent' && dup.provider_message_sid
        ? { ok: true, providerMessageSid: dup.provider_message_sid, logId: dup.id }
        : { ok: false, reason: 'already_attempted', logId: dup.id };
    }
  }

  // 7) All checks passed — record intent, then dispatch.
  const consentBasis = prefOk && pref
    ? {
        preference_id: pref.id,
        transactional_status: pref.transactional_status,
        phone_verified_at: pref.phone_verified_at,
        checked_at: new Date().toISOString(),
      }
    : { inbound_conversation_message_id: inbound!.id, last_inbound_at: inbound!.created_at, checked_at: new Date().toISOString() };

  const { data: log, error: logErr } = await db
    .from('sms_message_log_v2')
    .insert({
      user_id: input.userId ?? pref?.user_id ?? null,
      recipient_phone_e164: phoneE164,
      message_category: input.category,
      template_id: input.templateId,
      template_version: input.templateVersion ?? 'v1',
      business_purpose: input.idempotencyKey
        ? `${input.businessPurpose}#${input.idempotencyKey}`
        : input.businessPurpose,
      consent_basis: consentBasis,
      template_variables: input.templateVariables ?? null,
      send_status: 'queued',
      dispatch_key: input.idempotencyKey ? `${phoneE164}:${input.templateId}:${input.idempotencyKey}` : null,
    })
    .select('id')
    .single();
  if (logErr || !log) {
    return { ok: false, reason: 'log_write_failed', logId: null };
  }

  // Test / dry-run mode: never hit Twilio.
  if (IS_TEST_MODE) {
    await db
      .from('sms_message_log_v2')
      .update({ send_status: 'blocked', delivery_status: 'test_mode_dry_run', failure_reason: 'test_mode' })
      .eq('id', log.id);
    return { ok: false, reason: 'test_mode', logId: log.id };
  }

  const viaGateway = !!LOVABLE_API_KEY && !!TWILIO_CONNECTOR_KEY;
  if (!TWILIO_FROM_NUMBER || (!viaGateway && (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN))) {
    await db.from('sms_message_log_v2').update({ send_status: 'failed', failure_reason: 'provider_not_configured' }).eq('id',log.id);
    return { ok: false, reason: 'provider_not_configured', logId: log.id };
  }

  try {
    const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const body = new URLSearchParams({
      To: phoneE164,
      From: TWILIO_FROM_NUMBER,
      Body: input.body,
      StatusCallback: `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-status-callback`,
    });
    const resp = await fetch(
      viaGateway ? 'https://connector-gateway.lovable.dev/twilio/Messages.json' : `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      { method: 'POST', headers: viaGateway
        ? { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': TWILIO_CONNECTOR_KEY, 'Content-Type': 'application/x-www-form-urlencoded' }
        : { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(15000) },
    );
    const respBody = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      await db
        .from('sms_message_log_v2')
        .update({ send_status: 'failed', failure_reason: `twilio_${resp.status}:${JSON.stringify(respBody).slice(0, 400)}` })
        .eq('id', log.id);
      return { ok: false, reason: `twilio_${resp.status}`, logId: log.id };
    }
    const sid = (respBody as { sid?: string }).sid ?? null;
    if (!sid) throw new Error('Provider did not return a message ID; delivery unknown');
    await db
      .from('sms_message_log_v2')
      .update({ send_status: 'sent', provider_message_sid: sid })
      .eq('id', log.id);
    return { ok: true, providerMessageSid: sid, logId: log.id };
  } catch (err) {
    await db
      .from('sms_message_log_v2')
      .update({ send_status: 'failed', failure_reason: `dispatch_error:${(err as Error).message.slice(0, 400)}` })
      .eq('id', log.id);
    return { ok: false, reason: 'dispatch_error', logId: log.id };
  }
}
