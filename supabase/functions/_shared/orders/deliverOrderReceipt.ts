/**
 * Loads an order and sends its buyer receipt exactly once.
 * Called from the capture endpoint, the webhook, and the recovery endpoint —
 * whichever confirms the capture first wins.
 */

import { buildOrderDetail } from './buildOrderDetail.ts';
import { ensureReceiptSent } from './orderReceipts.ts';

const SITE_URL = 'https://vendibook.com';

function money(cents?: number | null, currency = 'USD') {
  if (cents == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export async function deliverOrderReceipt(supabase: any, paymentRecordId: string) {
  const { data: record } = await supabase
    .from('payment_records')
    .select('*')
    .eq('id', paymentRecordId)
    .maybeSingle();
  if (!record || record.payment_status !== 'completed') return { sent: false, reason: 'not_captured' };

  let email: string | null = record.buyer_email ?? null;
  let buyerName: string | null = null;
  if (record.buyer_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', record.buyer_id)
      .maybeSingle();
    buyerName = profile?.full_name?.split(' ')?.[0] ?? null;
    email = email ?? profile?.email ?? null;
  }
  if (!email) return { sent: false, reason: 'no_recipient' };

  const detail = await buildOrderDetail(supabase, record, 'buyer');
  const currency = detail.amounts.currency;

  return await ensureReceiptSent(supabase, record.id, email, {
    orderNumber: detail.order_number,
    buyerName,
    itemTitle: detail.listing?.title ?? null,
    sellerName: detail.counterparty_name,
    transactionTypeLabel: detail.transaction_type_label,
    orderDate: new Date(record.captured_at ?? record.created_at).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    }),
    paypalTransactionId: record.paypal_order_id ?? null,
    paypalCaptureId: record.paypal_capture_id ?? null,
    amountPaid: money(detail.amounts.total_paid_cents, currency) ?? '—',
    taxes: detail.amounts.tax_cents ? money(detail.amounts.tax_cents, currency) : null,
    fees: detail.amounts.fee_cents ? money(detail.amounts.fee_cents, currency) : null,
    refundAmount: detail.amounts.refunded_cents ? money(detail.amounts.refunded_cents, currency) : null,
    fulfillmentLabel: detail.fulfillment.label,
    fulfillmentNextStep: detail.next_action.next_action_title,
    nextActionTitle: detail.next_action.next_action_title,
    nextActionDescription: detail.next_action.next_action_description,
    orderUrl: `${SITE_URL}/orders/${record.id}`,
    coverImageUrl: detail.listing?.image_url ?? null,
  });
}
