import { payoutBlockers } from './payoutReleasePolicy.ts';

/** Queue this booking's unpaid proceeds for review; never record a transfer. */
export async function queueCompletedRentalPayouts(admin: any, booking: any) {
  const { data, error } = await admin.from('seller_payables')
    .select('*, payment:payment_records!inner(*)')
    .eq('payment.booking_request_id', booking.id)
    .eq('payment.transaction_type', 'rental')
    .eq('status', 'pending_release');
  if (error) throw new Error(`Unable to load rental payables: ${error.message}`);
  let count = 0;
  let amountCents = 0;
  for (const payable of data ?? []) {
    if (payable.dispute_frozen_at || payoutBlockers(payable, payable.payment, null, booking).length) continue;
    const { data: updated, error: updateError } = await admin.from('seller_payables')
      .update({ status: 'eligible_for_review', payout_eligible_at: new Date().toISOString() })
      .eq('id', payable.id)
      .eq('status', 'pending_release')
      .select('id, net_payout_cents');
    if (updateError) throw new Error(`Unable to queue rental payable: ${updateError.message}`);
    for (const row of updated ?? []) {
      count++;
      amountCents += row.net_payout_cents;
    }
  }
  return { count, amountCents };
}
