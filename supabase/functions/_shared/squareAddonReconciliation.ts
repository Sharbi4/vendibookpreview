import { squareConfig, squareRequest } from './square.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const checked = (result: any) => { if (result.error) throw new Error(result.error.message); return result.data; };

// Only call with a payment returned by Square's authenticated API, never a browser/webhook body.
export async function reconcileSquareAddonPayment(admin: any, payment: any, source = 'webhook', config = squareConfig()) {
  if (!payment?.id || payment.location_id !== config.locationId) throw new Error('Square location mismatch');
  const byPayment = checked(await admin.from('square_billing_attempts').select('*')
    .eq('payment_id', payment.id).eq('environment', config.environment).eq('kind', 'addon').maybeSingle());
  const byReference = UUID.test(payment.reference_id || '') ? checked(await admin.from('square_billing_attempts').select('*')
    .eq('id', payment.reference_id).eq('environment', config.environment).eq('kind', 'addon').maybeSingle()) : null;
  if (byPayment && byReference && byPayment.id !== byReference.id) throw new Error('Ambiguous Square checkout');
  const attempt = byPayment || byReference;
  if (!attempt) return { outcome: 'ignored_unknown_addon', purchase_id: null };
  if ((attempt.payment_id && attempt.payment_id !== payment.id)
      || (payment.reference_id && payment.reference_id !== attempt.id)) throw new Error('Square checkout reference mismatch');
  const amount = Number(payment.amount_money?.amount);
  if (!Number.isSafeInteger(amount) || amount !== attempt.amount_cents + attempt.tax_cents
      || payment.amount_money?.currency !== String(attempt.currency).toUpperCase()
      || (payment.total_money && (Number(payment.total_money.amount) !== amount
        || payment.total_money.currency !== payment.amount_money.currency))) throw new Error('Square amount or currency mismatch');
  if (Number(payment.refunded_money?.amount || 0) > 0) {
    return { outcome: 'addon_refunded_requires_review', purchase_id: attempt.purchase_id };
  }
  if (payment.status !== 'COMPLETED') return { outcome: 'addon_' + String(payment.status || 'unknown').toLowerCase(), purchase_id: attempt.purchase_id };
  const id = checked(await admin.rpc('reconcile_square_addon', {
    p_attempt: attempt.id, p_payment: payment.id, p_amount: amount, p_currency: payment.amount_money.currency,
    p_details: {
      environment: config.environment, reference_id: payment.reference_id || null,
      order_id: payment.order_id || null, location_id: payment.location_id,
      receipt_url: payment.receipt_url || null, buyer_email: payment.buyer_email_address || null,
      paid_at: payment.created_at || null, source,
    },
  }));
  return { outcome: 'addon_completed', payment_record_id: id, purchase_id: attempt.purchase_id };
}

export async function reconcileSquareAddonByPaymentId(admin: any, paymentId: string, source = 'reconciliation') {
  const { payment } = await squareRequest('/v2/payments/' + encodeURIComponent(paymentId));
  if (payment?.id !== paymentId) throw new Error('Square payment identity mismatch');
  return reconcileSquareAddonPayment(admin, payment, source);
}
