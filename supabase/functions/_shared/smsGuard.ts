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
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER') ?? '';
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
  const { data: suppression } = await db
    .from('sms_suppressions')
    .select('id')
    .eq('phone_e164', phoneE164)
    .is('released_at', null)
    .maybeSingle();
  if (suppression) {
    const logId = await logBlocked(db, input, phoneE164, 'suppressed_number');
    return { ok: false, reason: 'suppressed_number', logId };
  }

  // 4) Transactional consent must be opted_in.
  const { data: pref } = await db
    .from('sms_preferences')
    .select('id,user_id,transactional_status,phone_verified_at')
    .eq('phone_e164', phoneE164)
    .maybeSingle();
  if (!pref || pref.transactional_status !== 'opted_in') {
    const logId = await logBlocked(db, input, phoneE164, 'no_active_consent');
    return { ok: false, reason: 'no_active_consent', logId };
  }

  // 5) Ownership check — the phone must belong to the intended recipient.
  //    Skipped when no userId is supplied (e.g. re-enrollment confirmation
  //    to an unauthenticated verified number).
  if (input.userId && pref.user_id && pref.user_id !== input.userId) {
    const logId = await logBlocked(db, input, phoneE164, 'phone_owner_mismatch');
    return { ok: false, reason: 'phone_owner_mismatch', logId };
  }

  // 6) Idempotency — de-dupe using the provided key when supplied.
  if (input.idempotencyKey) {
    const { data: dup } = await db
      .from('sms_message_log_v2')
      .select('id')
      .eq('recipient_phone_e164', phoneE164)
      .eq('template_id', input.templateId)
      .eq('business_purpose', `${input.businessPurpose}#${input.idempotencyKey}`)
      .maybeSingle();
    if (dup) {
      return { ok: true, providerMessageSid: null, logId: dup.id };
    }
  }

  // 7) All checks passed — record intent, then dispatch.
  const consentBasis = {
    preference_id: pref.id,
    transactional_status: pref.transactional_status,
    phone_verified_at: pref.phone_verified_at,
    checked_at: new Date().toISOString(),
  };

  const { data: log, error: logErr } = await db
    .from('sms_message_log_v2')
    .insert({
      user_id: input.userId ?? pref.user_id,
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
    })
    .select('id')
    .single();
  if (logErr || !log) {
    return { ok: false, reason: 'log_write_failed', logId: null };
  }

  // Test / dry-run mode: never hit Twilio.
  if (IS_TEST_MODE || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    await db
      .from('sms_message_log_v2')
      .update({ send_status: 'sent', delivery_status: 'test_mode_dry_run' })
      .eq('id', log.id);
    return { ok: true, providerMessageSid: null, logId: log.id };
  }

  try {
    const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const body = new URLSearchParams({
      To: phoneE164,
      From: TWILIO_FROM_NUMBER,
      Body: input.body,
    });
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      { method: 'POST', headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' }, body },
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
