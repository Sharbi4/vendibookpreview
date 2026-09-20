import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders, jsonResponse, jsonError } from '../_shared/jsonError.ts';
import { squareConfig, squareRequest, catalogPrice } from '../_shared/square.ts';
import { validateSquarePlan } from '../_shared/squarePlan.ts';
import { syncSquareSubscription } from '../_shared/squareSubscription.ts';
import { quoteSalesTax } from '../_shared/tax.ts';
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
      let plan: any = null;
      let consent: any = null;
      const interval = intervalForProduct(product,body.billing_interval);
      if (recurring) {
        consent = check(await admin.from('user_consents').select('id,user_id,revoked_at,related_ids').eq('id',body.consent_id || '00000000-0000-0000-0000-000000000000').maybeSingle());
        if (!consent || consent.user_id !== user.id || consent.revoked_at || consent.related_ids?.product_slug !== product.slug) return jsonError(400,'consent','Accept recurring billing terms before subscribing.');
        const active = check(await admin.from('host_subscriptions').select('id').eq('user_id',user.id).in('status',['active','trialing','past_due','unpaid']).limit(1));
        if (active?.length) return jsonError(409,'existing_subscription','You already have a membership. Manage it before starting another subscription.');
        // Only a billing-active PayPal subscription blocks Square. `approval_pending`
        // rows are abandoned approvals that never became a membership.
        const legacy = check(await admin.from('paypal_subscriptions').select('id').eq('user_id',user.id).in('status',['active','approved']).limit(1));
        if (legacy?.length) return jsonError(409,'existing_subscription','An existing PayPal membership must be cancelled before starting a new one.');
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
      const profile = check(await admin.from('profiles').select('first_name,last_name,email,state,city,zip_code').eq('id',user.id).maybeSingle());
      if (!profile?.state) return jsonError(400,'billing_address','Add your billing address in Account settings before paying.');
      const tax = await quoteSalesTax({amountCents:amount,destination:{state:profile.state,city:profile.city,zip:profile.zip_code},kind:'product'});
      const attempts = check(await admin.from('square_billing_attempts').select('*').eq('user_id',user.id).eq('environment',config.environment).eq('product_id',product.id).in('status',['pending','processing']).limit(10));
      let attempt = attempts?.find((a:any) => (a.listing_id || null) === (body.listing_id || null));
      if (attempt && (attempt.amount_cents !== amount || attempt.tax_cents !== tax.taxCents || attempt.variation_id !== (plan?.variation_id || null))) return jsonError(409,'pending_checkout','An earlier checkout must be resolved before changing this billing option.');
      if (!attempt) attempt = check(await admin.from('square_billing_attempts').insert({user_id:user.id,product_id:product.id,listing_id:body.listing_id || null,environment:config.environment,kind:recurring?'subscription':'addon',tier,amount_cents:amount,tax_cents:tax.taxCents,currency,billing_interval:recurring?interval:null,variation_id:plan?.variation_id || null,consent_id:recurring?body.consent_id:null}).select().single());
      return jsonResponse(200,{attempt_id:attempt.id,application_id:config.applicationId,location_id:config.locationId,environment:config.environment,name:product.name,amount_cents:attempt.amount_cents,tax_cents:attempt.tax_cents,currency,recurring,billing_interval:interval,billing_contact:{givenName:profile.first_name,familyName:profile.last_name,email:user.email,countryCode:'US',state:profile.state,city:profile.city,postalCode:profile.zip_code}});
    }
    const a = check(await admin.from('square_billing_attempts').select('*').eq('id',body.attempt_id).eq('user_id',user.id).eq('environment',config.environment).single());
    if (action === 'status') {
      if(a.subscription_id) await syncSquareSubscription(admin,a);
      const latest=check(await admin.from('square_billing_attempts').select('status,subscription_id,payment_id').eq('id',a.id).single());
      return jsonResponse(200,latest);
    }
    if (action === 'cancel') {
      if (!a.subscription_id) return jsonError(400,'subscription','No Square subscription found.');
      const result = await squareRequest('/v2/subscriptions/'+encodeURIComponent(a.subscription_id)+'/cancel',{});
      await syncSquareSubscription(admin,a);
      return jsonResponse(200,{status:result.subscription?.status,canceled_date:result.subscription?.canceled_date});
    }
    if (action !== 'pay') return jsonError(400,'action','Unsupported action');
    if (a.status === 'completed' || a.subscription_id) return jsonResponse(200,{status:a.status,subscription_id:a.subscription_id});
    if (typeof body.source_id !== 'string' || !body.source_id) return jsonError(400,'source','Enter your payment details.');
    check(await admin.from('square_billing_attempts').update({status:'processing'}).eq('id',a.id));
    if (a.kind === 'subscription') {
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
      const result = await squareRequest('/v2/subscriptions',{idempotency_key:a.id,location_id:config.locationId,customer_id:a.customer_id,card_id:a.card_id,plan_variation_id:a.variation_id,tax_percentage:String(a.tax_cents/a.amount_cents*100)});
      check(await admin.from('square_billing_attempts').update({subscription_id:result.subscription.id,status:'awaiting_payment'}).eq('id',a.id));
      // ACTIVE is a subscription lifecycle state, not proof of a paid invoice.
      return jsonResponse(200,{status:'awaiting_payment',subscription_id:result.subscription.id});
    }
    const result = await squareRequest('/v2/payments',{idempotency_key:a.id,source_id:body.source_id,location_id:config.locationId,amount_money:{amount:a.amount_cents+a.tax_cents,currency:a.currency},reference_id:a.id,autocomplete:true,buyer_email_address:user.email});
    const payment = result.payment;
    check(await admin.from('square_billing_attempts').update({payment_id:payment.id}).eq('id',a.id));
    if (payment.status === 'COMPLETED') check(await admin.rpc('fulfill_square_addon',{p_attempt:a.id,p_payment:payment.id,p_amount:Number(payment.amount_money.amount),p_currency:payment.amount_money.currency}));
    return jsonResponse(200,{status:payment.status === 'COMPLETED'?'completed':'processing'});
  } catch (error) {
    return jsonError(400,'square_billing',error instanceof Error?error.message:'Could not complete Square checkout.');
  }
});
