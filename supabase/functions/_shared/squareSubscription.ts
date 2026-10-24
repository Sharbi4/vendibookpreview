import { squareConfig, squareRequest } from './square.ts';
export async function syncSquareSubscription(admin: any, attempt: any) {
  const config = squareConfig();
  if (!attempt.subscription_id || attempt.environment !== config.environment) return;
  let { subscription: sub } = await squareRequest('/v2/subscriptions/'+encodeURIComponent(attempt.subscription_id));
  if (sub.customer_id !== attempt.customer_id || sub.plan_variation_id !== attempt.variation_id || sub.location_id !== config.locationId) throw new Error('Square subscription identity mismatch');
  const featured = attempt.tier === 'featured_listing_monthly';
  if(featured) {
    const sold = await admin.rpc('featured_listing_sold',{p_listing:attempt.listing_id});
    if(sold.error) throw sold.error;
    if((sold.data || attempt.cancel_requested_at) && !sub.canceled_date && !['CANCELED','COMPLETED','DEACTIVATED'].includes(sub.status)) {
      const canceled = await squareRequest('/v2/subscriptions/'+encodeURIComponent(sub.id)+'/cancel',{});
      sub = canceled.subscription;
      if(!sub || (!sub.canceled_date && !['CANCELED','COMPLETED','DEACTIVATED'].includes(sub.status))) throw new Error('Cancellation was not confirmed');
    }
    if(sold.data || attempt.cancel_requested_at) {
      const saved = await admin.from('square_billing_attempts').update({cancel_requested_at:attempt.cancel_requested_at || new Date().toISOString(),cancel_reason:attempt.cancel_reason || 'sold',cancel_confirmed_at:new Date().toISOString()}).eq('id',attempt.id);
      if(saved.error) throw saved.error;
    }
  }
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
  if(featured) {
    if(hasAccess) {
      const grant = await admin.rpc('apply_featured_subscription_period',{p_attempt:attempt.id,p_paid_through:paidThrough});
      if(grant.error) throw grant.error;
    }
  } else {
  const { error } = await admin.from('host_subscriptions').upsert({
    user_id:attempt.user_id,tier:attempt.tier,payment_provider:'square',square_subscription_id:sub.id,
    status,current_period_end:paidThrough,cancel_at_period_end:canceling,cancel_at:canceling?paidThrough:null,
    metadata:{square_attempt_id:attempt.id,product_id:attempt.product_id,environment:attempt.environment},updated_at:new Date().toISOString(),
  },{onConflict:'square_subscription_id'});
  if(error) throw error;
  }
  const result = await admin.from('square_billing_attempts').update({paid_through:paidThrough,status:hasAccess?'active':canceling?'canceled':'awaiting_payment',updated_at:new Date().toISOString()}).eq('id',attempt.id);
  if(result.error) throw result.error;
}
