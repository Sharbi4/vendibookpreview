import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders, jsonResponse, jsonError } from '../_shared/jsonError.ts';
import { squareConfig, squareRequest, catalogPrice } from '../_shared/square.ts';
import { reconcileSquareAddonPayment, reconcileSquareAddonByPaymentId } from '../_shared/squareAddonReconciliation.ts';
import { validateSquarePlan } from '../_shared/squarePlan.ts';
import { syncSquareSubscription } from '../_shared/squareSubscription.ts';
import { quoteSalesTax } from '../_shared/tax.ts';
import { findActiveExemption } from '../_shared/taxExemption.ts';
import { classifyProduct } from '../_shared/productEntitlement.ts';
import { intervalForProduct } from '../_shared/ensureProviderPlan.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null,{headers:corsHeaders});
  if (req.method !== 'POST') return jsonError(405,'method','POST required');
  try {
    const config = squareConfig();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer /,'');
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return jsonError(401,'unauthenticated','Sign in to continue.');
    const body = await req.json();
    const check = (result: any) => { if(result.error) throw new Error(result.error.message); return result.data; };
    const action = body.action || 'prepare';
    if(['prepare','pay'].includes(action) && !config.enabled) return jsonError(503,'disabled','Square billing is being configured. Please check back shortly.');
    if (action === 'prepare') {
      const product = check(await admin.from('monetization_products').select('*').eq('slug',String(body.product_slug || '')).eq('is_active',true).maybeSingle());
      if (!product || !['one_time','recurring'].includes(product.billing_type)) return jsonError(400,'product','This product cannot be purchased through this checkout.');
      const recurring = product.billing_type === 'recurring';
      const classification = classifyProduct(product);
      const tier = classification.grantsTier || product.slug;
      const featured = product.slug === 'featured_listing_monthly';
      if (featured && (!body.listing_id || (body.billing_interval && body.billing_interval !== 'monthly'))) return jsonError(400,'featured_terms','Featured requires a listing and monthly billing.');
      if (featured && check(await admin.rpc('featured_listing_sold',{p_listing:body.listing_id}))) return jsonError(409,'sold','This listing has already sold.');
      let plan: any = null;
      let consent: any = null;
      const interval = intervalForProduct(product,body.billing_interval);
      if (recurring) {
        consent = check(await admin.from('user_consents').select('id,user_id,revoked_at,related_ids').eq('id',body.consent_id || '00000000-0000-0000-0000-000000000000').maybeSingle());
        if (!consent || consent.user_id !== user.id || consent.revoked_at || consent.related_ids?.product_slug !== product.slug) return jsonError(400,'consent','Accept recurring billing terms before subscribing.');
        if (!featured) {
        const active = check(await admin.from('host_subscriptions').select('id').eq('user_id',user.id).in('status',['active','trialing','past_due','unpaid']).limit(1));
        if (active?.length) return jsonError(409,'existing_subscription','You already have a membership. Manage it before starting another subscription.');
        // Only a billing-active PayPal subscription blocks Square. `approval_pending`
        // rows are abandoned approvals that never became a membership.
        const legacy = check(await admin.from('paypal_subscriptions').select('id').eq('user_id',user.id).in('status',['active','approved']).limit(1));
        if (legacy?.length) return jsonError(409,'existing_subscription','An existing PayPal membership must be cancelled before starting a new one.');
        } else {
          const existing = check(await admin.from('square_billing_attempts').select('id').eq('listing_id',body.listing_id).eq('tier','featured_listing_monthly').eq('environment',config.environment).in('status',['awaiting_payment','active']).limit(1));
          if(existing?.length) return jsonError(409,'existing_subscription','This listing already has a Featured checkout or subscription. Manage it in your account.');
        }
        plan = check(await admin.from('square_billing_plans').select('*').eq('product_id',product.id).eq('environment',config.environment).eq('billing_interval',interval).maybeSingle());
        if (!plan) return jsonError(409,'plan_unavailable','This billing option is not configured yet.');
        if(Number(consent.related_ids?.price_cents_shown)!==plan.price_cents) return jsonError(409,'consent_price','The plan price changed. Review the current billing terms again.');
        const catalog = await squareRequest('/v2/catalog/object/'+encodeURIComponent(plan.variation_id));
        validateSquarePlan(catalog.object, plan);
      }
      if (body.listing_id) {
        const listing = check(await admin.from('listings').select('id,host_id,category').eq('id',body.listing_id).maybeSingle());
        if (!listing || listing.host_id !== user.id) return jsonError(403,'listing','Only the listing owner can purchase this upgrade.');
        if (product.applicable_listing_types?.length && !product.applicable_listing_types.includes(listing.category)) return jsonError(400,'listing_type','This upgrade does not apply to this listing.');
      } else if (product.promo_type || product.category === 'listing_upgrade') return jsonError(400,'listing_required','Choose a listing for this upgrade.');
      if(!recurring && !product.promo_type) {
        const owned=check(await admin.from('monetization_purchases').select('access_ends_at').eq('user_id',user.id).eq('product_id',product.id).in('status',['paid','fulfilled']).limit(100));
        if(owned?.some((p:any)=>!p.access_ends_at || Date.parse(p.access_ends_at)>Date.now())) return jsonError(409,'already_owned','This purchase is already active on your account.');
      }
      const amount = plan?.price_cents ?? catalogPrice(product);
      const currency = String(plan?.currency || product.currency || 'USD').toUpperCase();
      if (currency !== 'USD') return jsonError(400,'currency','This checkout currently supports USD.');
      const profile = check(await admin.from('profiles').select('first_name,last_name,email,state,city,zip_code').eq('id',user.id).maybeSingle()) || {};
      // Billing address is collected inside this checkout (buyer's own address,
      // never a delivery address). Saved to the profile for next time.
      const ba = body.billing_address;
      if (ba && typeof ba === 'object') {
        const state = String(ba.state || '').trim().toUpperCase();
        const zip = String(ba.zip || '').trim();
        const city = String(ba.city || '').trim().slice(0,80);
        if (!/^[A-Z]{2}$/.test(state) || !/^\d{5}(-\d{4})?$/.test(zip)) return jsonError(400,'billing_address','Enter a valid 2-letter state and ZIP code.');
        profile.state = state; profile.zip_code = zip; profile.city = city || profile.city || null;
        check(await admin.from('profiles').update({state,zip_code:zip,...(city?{city}:{})}).eq('id',user.id));
      }
      if (!profile.state || !profile.zip_code) return jsonResponse(200,{needs_billing_address:true,name:product.name,billing_address:{state:profile.state||'',city:profile.city||'',zip:profile.zip_code||''}});
      // Subscriptions, boosts and add-ons are digital: taxed only where the
      // buyer's state taxes online services, never with an active exemption.
      const tax = await quoteSalesTax({amountCents:amount,destination:{state:profile.state,city:profile.city,zip:profile.zip_code},kind:'digital',exemption:await findActiveExemption(admin,user.id,profile.state)});
      const attempts = check(await admin.from('square_billing_attempts').select('*').eq('user_id',user.id).eq('environment',config.environment).eq('product_id',product.id).in('status',['pending','processing']).limit(10));
      let attempt = attempts?.find((a:any) => (a.listing_id || null) === (body.listing_id || null));
      // A checkout that has not started charging picks up a changed tax (new
      // rates, a new address or exemption) instead of blocking the buyer.
      if (attempt && attempt.status === 'pending' && attempt.amount_cents === amount && attempt.variation_id === (plan?.variation_id || null) && (attempt.tax_cents !== tax.taxCents || (attempt.tax_exemption_id ?? null) !== (tax.exemptionId ?? null))) {
        attempt = check(await admin.from('square_billing_attempts').update({tax_cents:tax.taxCents,tax_exemption_id:tax.exemptionId ?? null}).eq('id',attempt.id).eq('status','pending').select().single());
      }
      if (attempt && (attempt.amount_cents !== amount || attempt.tax_cents !== tax.taxCents || attempt.variation_id !== (plan?.variation_id || null))) return jsonError(409,'pending_checkout','An earlier checkout must be resolved before changing this billing option.');
      if (!attempt) attempt = check(await admin.from('square_billing_attempts').insert({user_id:user.id,product_id:product.id,listing_id:body.listing_id || null,environment:config.environment,kind:recurring?'subscription':'addon',tier,amount_cents:amount,tax_cents:tax.taxCents,tax_exemption_id:tax.exemptionId ?? null,currency,billing_interval:recurring?interval:null,variation_id:plan?.variation_id || null,consent_id:recurring?body.consent_id:null}).select().single());
      return jsonResponse(200,{attempt_id:attempt.id,application_id:config.applicationId,location_id:config.locationId,environment:config.environment,name:product.name,amount_cents:attempt.amount_cents,tax_cents:attempt.tax_cents,tax_label:tax.label,tax_rate_pct:tax.ratePct,tax_state:tax.state,tax_exempt:tax.source==='exempt',currency,recurring,billing_interval:interval,billing_contact:{givenName:profile.first_name,familyName:profile.last_name,email:user.email,countryCode:'US',state:profile.state,city:profile.city,postalCode:profile.zip_code}});
    }
    const a = check(await admin.from('square_billing_attempts').select('*').eq('id',body.attempt_id).eq('user_id',user.id).eq('environment',config.environment).single());
    if (action === 'status') {
      if(a.subscription_id) await syncSquareSubscription(admin,a);
      if(a.kind === 'addon' && a.payment_id) await reconcileSquareAddonByPaymentId(admin,a.payment_id,'checkout_status');
      const latest=check(await admin.from('square_billing_attempts').select('status,subscription_id,payment_id').eq('id',a.id).single());
      return jsonResponse(200,latest);
    }
    if (action === 'cancel') {
      if (!a.subscription_id) return jsonError(400,'subscription','No Square subscription found.');
      const result = await squareRequest('/v2/subscriptions/'+encodeURIComponent(a.subscription_id)+'/cancel',{});
      check(await admin.from('square_billing_attempts').update({cancel_requested_at:new Date().toISOString(),cancel_reason:'owner',cancel_confirmed_at:new Date().toISOString()}).eq('id',a.id));
      await syncSquareSubscription(admin,a);
      return jsonResponse(200,{status:result.subscription?.status,canceled_date:result.subscription?.canceled_date});
    }
    if (action !== 'pay') return jsonError(400,'action','Unsupported action');
    if (a.status === 'completed' || a.subscription_id) {
      if (a.kind === 'addon' && a.payment_id) await reconcileSquareAddonByPaymentId(admin,a.payment_id,'checkout_retry');
      return jsonResponse(200,{status:a.status,subscription_id:a.subscription_id});
    }
    if (typeof body.source_id !== 'string' || !body.source_id) return jsonError(400,'source','Enter your payment details.');
    check(await admin.from('square_billing_attempts').update({status:'processing'}).eq('id',a.id));
    if (a.kind === 'subscription') {
      if (a.tier === 'featured_listing_monthly' && check(await admin.rpc('featured_listing_sold',{p_listing:a.listing_id}))) return jsonError(409,'sold','This listing has already sold.');
      const consent=check(await admin.from('user_consents').select('user_id,revoked_at').eq('id',a.consent_id).single());
      if(consent.user_id!==user.id || consent.revoked_at) return jsonError(400,'consent','Renew your billing consent before paying.');
      if (!a.customer_id) {
        const result = await squareRequest('/v2/customers',{idempotency_key:a.id,email_address:user.email,reference_id:user.id});
        a.customer_id=result.customer.id;
        check(await admin.from('square_billing_attempts').update({customer_id:a.customer_id}).eq('id',a.id));
      }
      if (!a.card_id) {
        const result = await squareRequest('/v2/cards',{idempotency_key:a.id,source_id:body.source_id,card:{customer_id:a.customer_id}});
        a.card_id=result.card.id;
        check(await admin.from('square_billing_attempts').update({card_id:a.card_id}).eq('id',a.id));
      }
      const result = await squareRequest('/v2/subscriptions',{idempotency_key:a.id,location_id:config.locationId,customer_id:a.customer_id,card_id:a.card_id,plan_variation_id:a.variation_id,...(a.tax_cents>0?{tax_percentage:String(Number((a.tax_cents/a.amount_cents*100).toFixed(4)))}:{})});
      check(await admin.from('square_billing_attempts').update({subscription_id:result.subscription.id,status:'awaiting_payment'}).eq('id',a.id));
      // ACTIVE is a subscription lifecycle state, not proof of a paid invoice.
      return jsonResponse(200,{status:'awaiting_payment',subscription_id:result.subscription.id});
    }
    const result = await squareRequest('/v2/payments',{idempotency_key:a.id,source_id:body.source_id,location_id:config.locationId,amount_money:{amount:a.amount_cents+a.tax_cents,currency:a.currency},reference_id:a.id,autocomplete:true,buyer_email_address:user.email});
    const payment = result.payment;
    check(await admin.from('square_billing_attempts').update({payment_id:payment.id}).eq('id',a.id));
    if (payment.status === 'COMPLETED') await reconcileSquareAddonPayment(admin,payment,'checkout',config);
    return jsonResponse(200,{status:payment.status === 'COMPLETED'?'completed':'processing'});
  } catch (error) {
    return jsonError(400,'square_billing',error instanceof Error?error.message:'Could not complete Square checkout.');
  }
});
