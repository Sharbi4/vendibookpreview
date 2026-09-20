import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { squareConfig, squareRequest, verifySquareSignature } from '../_shared/square.ts';
import { syncSquareSubscription } from '../_shared/squareSubscription.ts';
Deno.serve(async req => {
  if(req.method !== 'POST') return new Response('POST required',{status:405});
  const raw=await req.text();
  const valid=await verifySquareSignature(raw,req.headers.get('x-square-hmacsha256-signature') || '',Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY') || '',Deno.env.get('SQUARE_WEBHOOK_URL') || '');
  if(!valid) return new Response('Invalid signature',{status:403});
  try {
    const config=squareConfig();
    const event=JSON.parse(raw);
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    if(event.type?.startsWith('payment.')) {
      const id=event.data?.object?.payment?.id;
      if(!id) return new Response('Invalid payment event',{status:400});
      const {payment}=await squareRequest('/v2/payments/'+encodeURIComponent(id));
      if(payment.location_id !== config.locationId) return new Response('Ignored');
      const reference=payment.reference_id;
      if(reference && /^[0-9a-f-]{36}$/i.test(reference)) {
        const {data:a,error}=await admin.from('square_billing_attempts').select('*').eq('id',reference).eq('environment',config.environment).maybeSingle();
        if(error) throw error;
        if(a && payment.status==='COMPLETED') {
          const result=await admin.rpc('fulfill_square_addon',{p_attempt:a.id,p_payment:payment.id,p_amount:Number(payment.amount_money.amount),p_currency:payment.amount_money.currency});
          if(result.error) throw result.error;
        }
      }
    }
    if(event.type?.startsWith('subscription.') || event.type?.startsWith('invoice.')) {
      const object=event.data?.object?.subscription || event.data?.object?.invoice;
      const customer=object?.customer_id || object?.primary_recipient?.customer_id;
      if(customer) {
        const {data:attempts,error}=await admin.from('square_billing_attempts').select('*').eq('customer_id',customer).eq('environment',config.environment).eq('kind','subscription');
        if(error) throw error;
        for(const attempt of attempts || []) {
          // Returning 500 retries events racing the create-subscription DB save.
          if(!attempt.subscription_id) throw new Error('Subscription mapping pending');
          await syncSquareSubscription(admin,attempt);
        }
      }
    }
    return new Response('OK');
  } catch { return new Response('Reconciliation pending; retry',{status:500}); }
});
