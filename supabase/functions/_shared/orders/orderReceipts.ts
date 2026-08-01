/**
 * Exactly-once buyer receipt delivery.
 *
 * The receipt is triggered from the backend only after a verified capture.
 * A unique (payment_record_id, template_name) row guarantees that a page
 * refresh, a duplicated webhook, and a retried capture can never produce a
 * second receipt.
 */

import { recordOrderEvent } from './orderEvents.ts';

const RECEIPT_TEMPLATE = 'order-receipt';
const TEMPLATE_VERSION = 'v1';

export interface ReceiptContext {
  orderNumber: string;
  buyerName?: string | null;
  itemTitle?: string | null;
  sellerName?: string | null;
  transactionTypeLabel: string;
  orderDate: string;
  paypalTransactionId?: string | null;
  paypalCaptureId?: string | null;
  amountPaid: string;
  taxes?: string | null;
  fees?: string | null;
  refundAmount?: string | null;
  fulfillmentLabel: string;
  fulfillmentNextStep?: string | null;
  nextActionTitle?: string | null;
  nextActionDescription?: string | null;
  orderUrl: string;
  coverImageUrl?: string | null;
}

/**
 * Queues (and sends) the receipt for a payment record. Safe to call from the
 * capture endpoint AND the webhook — whichever wins, the other is a no-op.
 */
export async function ensureReceiptSent(
  supabase: any,
  paymentRecordId: string,
  recipientEmail: string,
  ctx: ReceiptContext,
): Promise<{ sent: boolean; reason?: string }> {
  if (!recipientEmail) return { sent: false, reason: 'no_recipient' };

  // Claim the send. Insert wins the race; a conflict means someone already has it.
  const { data: claimed, error: claimError } = await supabase
    .from('payment_receipts')
    .insert({
      payment_record_id: paymentRecordId,
      recipient_email: recipientEmail,
      template_name: RECEIPT_TEMPLATE,
      template_version: TEMPLATE_VERSION,
      status: 'sending',
      attempt_count: 1,
    })
    .select()
    .maybeSingle();

  if (claimError || !claimed) {
    // Already exists — only re-send if a previous attempt failed.
    const { data: existing } = await supabase
      .from('payment_receipts')
      .select('*')
      .eq('payment_record_id', paymentRecordId)
      .eq('template_name', RECEIPT_TEMPLATE)
      .maybeSingle();
    if (!existing || existing.status === 'sent' || existing.status === 'suppressed') {
      return { sent: false, reason: 'already_delivered' };
    }
    if (existing.status === 'sending') return { sent: false, reason: 'in_flight' };
    await supabase.from('payment_receipts').update({
      status: 'sending',
      attempt_count: (existing.attempt_count ?? 0) + 1,
      last_retry_at: new Date().toISOString(),
    }).eq('id', existing.id);
    return await deliver(supabase, existing.id, paymentRecordId, recipientEmail, ctx);
  }

  return await deliver(supabase, claimed.id, paymentRecordId, recipientEmail, ctx);
}

async function deliver(
  supabase: any,
  receiptId: string,
  paymentRecordId: string,
  recipientEmail: string,
  ctx: ReceiptContext,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: RECEIPT_TEMPLATE,
        recipientEmail,
        idempotencyKey: `order-receipt-${paymentRecordId}`,
        subjectOverride: `Payment confirmed — Vendibook order ${ctx.orderNumber}`,
        templateData: ctx,
      },
    });
    if (error) throw error;

    await supabase.from('payment_receipts').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      provider_message_id: (data as any)?.messageId ?? (data as any)?.message_id ?? null,
      failure_reason: null,
    }).eq('id', receiptId);

    await recordOrderEvent(supabase, {
      paymentRecordId,
      code: 'receipt_sent',
      title: 'Receipt emailed',
      description: `Payment receipt sent to ${maskEmail(recipientEmail)}.`,
      visibility: 'buyer',
      dedupeKey: `receipt:${paymentRecordId}`,
    });
    return { sent: true };
  } catch (err) {
    await supabase.from('payment_receipts').update({
      status: 'failed',
      failure_reason: (err as Error)?.message?.slice(0, 500) ?? 'unknown_error',
      last_retry_at: new Date().toISOString(),
    }).eq('id', receiptId);
    return { sent: false, reason: 'send_failed' };
  }
}

/** Admin-initiated resend: clears the delivery row so the next send re-runs. */
export async function resetReceiptForResend(supabase: any, paymentRecordId: string) {
  await supabase
    .from('payment_receipts')
    .update({ status: 'failed', failure_reason: 'admin_resend_requested' })
    .eq('payment_record_id', paymentRecordId)
    .eq('template_name', RECEIPT_TEMPLATE);
}

function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
}

export { RECEIPT_TEMPLATE };
