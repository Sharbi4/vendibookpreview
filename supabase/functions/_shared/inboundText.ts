/**
 * Processes one text sent to the support line (866) 690-6227.
 * Shared by the Twilio webhook (instant) and support-text-sync (5-minute
 * backstop that picks up texts the webhook never received).
 *
 * The row in sms_inbound_messages is claimed first on the unique Twilio
 * MessageSid, so a text is handled exactly once no matter which path sees it.
 *
 * Compliance rules:
 * - STOP always creates a number-level suppression, sets transactional_status
 *   to 'opted_out', and records an immutable consent event.
 * - START is a NEW re-opt-in event; suppression is released after processing.
 * - HELP returns the approved HELP body without touching consent state.
 * - Anything else goes to the support team (ticket, in-app alert, email).
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { classifyKeyword, normalizeNanpToE164, SMS_POLICY_VERSION, SMS_TEMPLATES } from './smsConsent.ts';
import { routeSupportText } from './supportTexts.ts';

export interface InboundResult {
  /** false when this MessageSid was already handled. */
  processed: boolean;
  action: string;
  /** Auto-reply the webhook returns as TwiML (the sync path does not send it). */
  reply: string | null;
}

export async function processInboundText(
  supabase: SupabaseClient,
  params: Record<string, string>,
  receivedAt = new Date(),
): Promise<InboundResult> {
  const from = normalizeNanpToE164(params.From) ?? String(params.From ?? '');
  const to = String(params.To ?? '');
  const body = String(params.Body ?? '').trim();
  const sid = String(params.MessageSid ?? '');
  const kind = classifyKeyword(body);
  const action = kind === 'opt_out' ? 'opt_out' : kind === 'opt_in' ? 'opt_in' : kind === 'help' ? 'help' : 'support_text';

  const { data: saved, error: claimError } = await supabase.from('sms_inbound_messages').insert({
    from_phone: from,
    to_phone: to,
    body,
    twilio_message_sid: sid || null,
    action_taken: action,
    raw_payload: params,
  }).select('id').maybeSingle();
  if (claimError) {
    if (claimError.code === '23505') return { processed: false, action, reply: null };
    throw new Error(`inbound text save failed: ${claimError.message}`);
  }

  let reply: string | null = null;
  if (action === 'opt_out') {
    await supabase.from('sms_suppressions').insert({
      phone_e164: from,
      sender_or_program: 'vendibook_transactional',
      reason: 'user_stop_keyword',
      source: 'provider_webhook',
      provider_message_sid: sid || null,
    });
    await supabase.from('sms_preferences').update({
      transactional_status: 'opted_out',
      opted_out_at: new Date().toISOString(),
      consent_source: 'keyword',
    }).eq('phone_e164', from);
    await supabase.from('sms_consent_events').insert({
      phone_e164: from,
      event_type: 'opt_out',
      source: 'provider_webhook',
      disclosure_version: SMS_POLICY_VERSION,
      provider_message_sid: sid || null,
    });
    reply = SMS_TEMPLATES.opt_out_confirmation;
  } else if (action === 'opt_in') {
    const { data: pref } = await supabase.from('sms_preferences').select('id, user_id').eq('phone_e164', from).maybeSingle();
    const { data: evt } = await supabase.from('sms_consent_events').insert({
      user_id: pref?.user_id ?? null,
      phone_e164: from,
      event_type: 're_opt_in',
      source: 'provider_webhook',
      disclosure_version: SMS_POLICY_VERSION,
      provider_message_sid: sid || null,
    }).select('id').single();
    await supabase.from('sms_suppressions')
      .update({ released_at: new Date().toISOString(), released_by_event_id: evt?.id ?? null })
      .eq('phone_e164', from)
      .is('released_at', null);
    const prefFields = {
      transactional_status: 'opted_in',
      opted_in_at: new Date().toISOString(),
      consent_source: 'keyword',
      consent_version: SMS_POLICY_VERSION,
    };
    if (pref) {
      await supabase.from('sms_preferences').update({ ...prefFields, opted_out_at: null }).eq('id', pref.id);
    } else {
      await supabase.from('sms_preferences').insert({ phone_e164: from, ...prefFields });
    }
    reply = SMS_TEMPLATES.enrollment_confirmation;
  } else if (action === 'help') {
    reply = SMS_TEMPLATES.help_reply;
  } else if (from.startsWith('+')) {
    try {
      reply = await routeSupportText(
        supabase,
        { from, body, media: Number(params.NumMedia ?? 0) || 0, inboundId: saved?.id ?? null },
        receivedAt,
      );
    } catch (e) {
      console.error('[inboundText] support routing failed', e);
    }
  }
  return { processed: true, action, reply };
}
