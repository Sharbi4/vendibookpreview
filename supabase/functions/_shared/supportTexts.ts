/**
 * Texts people send to the support line, (866) 690-6227 (owner, 2026-10-26).
 * Each conversation opens an Admin → Support ticket with the 2-business-hour
 * follow-up promise, every text is appended to it, admins get an in-app
 * notification plus an email (adminAlertEmails, throttled per sender), and
 * the texts can be forwarded to the numbers in ADMIN_SMS_FORWARD_TO. The
 * team reads and replies in Admin → Texts. The first text of a conversation
 * gets one acknowledgement so the person knows a human will answer.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { followUpDueAt, formatEt, inFollowUpHours } from './followUpWindow.ts';
import { adminAlertEmails, adminNoticeKey } from './adminRecipients.ts';
import { invokeTransactionalEmail } from './invokeTransactionalEmail.ts';
import { checkRateLimit } from './rateLimit.ts';
import { sendGuardedSms } from './smsGuard.ts';

export const SUPPORT_TEXT_CATEGORY = 'text_message';
const THREAD_DAYS = 7;

export const displayPhone = (e164: string) => {
  const d = e164.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
};

export function supportTextAck(now: Date): string {
  const when = inFollowUpHours(now) ? 'within 2 hours' : `by ${formatEt(followUpDueAt(now))}`;
  return `Thanks for texting Vendibook! A real person on our team will text you back ${when}. For anything urgent, call this number any time. Reply STOP to opt out.`;
}

/** Records a support text and alerts the team. Returns the auto-reply, if any. */
export async function routeSupportText(
  db: SupabaseClient,
  msg: { from: string; body: string; media: number; inboundId: string | null },
  now = new Date(),
): Promise<string | null> {
  const display = displayPhone(msg.from);
  const stamp = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }).format(now);
  const text = msg.body || (msg.media ? '(photo or attachment)' : '(empty text)');
  const line = `[${stamp} ET] ${text}${msg.media && msg.body ? ` (+${msg.media} attachment${msg.media > 1 ? 's' : ''})` : ''}`;
  const since = new Date(now.getTime() - THREAD_DAYS * 86_400_000).toISOString();

  const { data: open } = await db
    .from('support_tickets')
    .select('id, reference_code, description, status')
    .eq('category', SUPPORT_TEXT_CATEGORY)
    .eq('callback_phone_e164', msg.from)
    .not('status', 'in', '(resolved,closed)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let ticket = open as { id: string; reference_code: string } | null;
  const isNew = !ticket;
  if (open) {
    await db.from('support_tickets').update({
      description: `${open.description}\n${line}`.slice(-5000),
      ...(open.status === 'waiting_for_user' ? { status: 'reviewing' } : {}),
    }).eq('id', open.id);
  } else {
    const due = followUpDueAt(now);
    const { data, error } = await db.from('support_tickets').insert({
      feature_area: 'other',
      category: SUPPORT_TEXT_CATEGORY,
      priority: 'high',
      source: 'system',
      submission_channel: 'sms',
      title: `Text from ${display}`,
      description: `Text conversation with ${display}. Reply in Admin → Texts. Follow up by ${formatEt(due)}.\n\n${line}`,
      callback_phone_e164: msg.from,
      callback_phone_display: display,
      callback_phone_country: 'US',
      callback_phone_source: 'inbound_text',
      first_response_due_at: due.toISOString(),
      request_id: `sms-${msg.inboundId ?? crypto.randomUUID()}`,
    }).select('id, reference_code').single();
    if (error) console.error('[supportTexts] ticket insert failed', error.message);
    ticket = data ?? null;
  }

  const link = `/admin/texts?phone=${encodeURIComponent(msg.from)}`;
  try {
    const { data: admins } = await db.from('user_roles').select('user_id').eq('role', 'admin');
    if (admins?.length) {
      await db.from('notifications').insert(admins.map((a: { user_id: string }) => ({
        user_id: a.user_id,
        type: 'support_ticket',
        title: `💬 Text from ${display}`,
        message: text.slice(0, 200),
        link,
      })));
    }
  } catch (e) {
    console.error('[supportTexts] admin notification failed', e);
  }

  // One email per sender every 10 minutes, so a burst of texts is one alert.
  const emailDue = await checkRateLimit('support_text_email', msg.from, 1, 10);
  if (isNew || emailDue) {
    for (const to of adminAlertEmails()) {
      try {
        await invokeTransactionalEmail({
          templateName: 'generic-notice',
          recipientEmail: to,
          idempotencyKey: adminNoticeKey(`support-text-${msg.inboundId ?? now.getTime()}`, to),
          templateData: {
            subject: `Text from ${display}${ticket ? ` (${ticket.reference_code})` : ''}`,
            kicker: 'Support line · (866) 690-6227',
            heading: isNew ? `New text from ${display}` : `${display} texted again`,
            paragraphs: [text],
            details: [
              { label: 'From', value: display },
              { label: 'Reply by', value: formatEt(followUpDueAt(now)) },
            ],
            ctaLabel: 'Read and reply',
            ctaUrl: `https://vendibook.com${link}`,
          },
        });
      } catch (e) {
        console.error('[supportTexts] admin email failed', e);
      }
    }
  }

  // Optional forward to the owners' phones (each number must have SMS consent).
  const forwardTo = (Deno.env.get('ADMIN_SMS_FORWARD_TO') ?? '').split(',').map((n) => n.trim()).filter(Boolean);
  for (const to of forwardTo) {
    if (to.replace(/\D/g, '').endsWith(msg.from.replace(/\D/g, '').slice(-10))) continue;
    const result = await sendGuardedSms({
      recipientPhone: to,
      category: 'customer_care',
      templateId: 'support_text_forward',
      businessPurpose: 'support_text_forward',
      body: `Vendibook support text from ${display}: ${text}`.slice(0, 600),
      idempotencyKey: `fwd-${msg.inboundId ?? now.getTime()}`.slice(0, 80),
    });
    if (!result.ok) console.warn('[supportTexts] forward not sent', result.reason);
  }

  return isNew ? supportTextAck(now) : null;
}
