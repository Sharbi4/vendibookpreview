import { squareConfig, squareRequest } from './square.ts';
export async function syncSquareSubscription(admin: any, attempt: any) {
  const config = squareConfig();
  if (!attempt.subscription_id || attempt.environment !== config.environment) return;
  const { subscription: sub } = await squareRequest('/v2/subscriptions/'+encodeURIComponent(attempt.subscription_id));
  if (sub.customer_id !== attempt.customer_id || sub.plan_variation_id !== attempt.variation_id || sub.location_id !== config.locationId) throw new Error('Square subscription identity mismatch');
  let paidThrough = attempt.paid_through;
  // Invoice creation/ACTIVE status alone never grants access.
  if (sub.invoice_ids?.[0] && sub.charged_through_date) {
    const { invoice } = await squareRequest('/v2/invoices/'+encodeURIComponent(sub.invoice_ids[0]));
    if (invoice.status === 'PAID' && invoice.primary_recipient?.customer_id === attempt.customer_id) {
      const through = new Date(sub.charged_through_date+'T23:59:59Z').toISOString();
      if (!paidThrough || through > paidThrough) paidThrough = through;
    }
  }
  const hasAccess = paidThrough && Date.parse(paidThrough) > Date.now();
  const canceling = !!sub.canceled_date || ['CANCELED','COMPLETED','DEACTIVATED'].includes(sub.status);
  const status = hasAccess ? 'active' : canceling ? 'canceled' : 'incomplete';
  const { error } = await admin.from('host_subscriptions').upsert({
    user_id:attempt.user_id,tier:attempt.tier,payment_provider:'square',square_subscription_id:sub.id,
    status,current_period_end:paidThrough,cancel_at_period_end:canceling,cancel_at:canceling?paidThrough:null,
    metadata:{square_attempt_id:attempt.id,product_id:attempt.product_id,environment:attempt.environment},updated_at:new Date().toISOString(),
  },{onConflict:'square_subscription_id'});
  if(error) throw error;
  const result = await admin.from('square_billing_attempts').update({paid_through:paidThrough,status:hasAccess?'active':canceling?'canceled':'awaiting_payment',updated_at:new Date().toISOString()}).eq('id',attempt.id);
  if(result.error) throw result.error;
}
