import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { validateUpdateSignup, UPDATE_CONSENT_VERSION, UPDATE_SMS_DISCLOSURE } from '../_shared/updatePreferences.ts';
import { updateConfirmationEmail } from '../_shared/marketing-templates/updateConfirmation.ts';
import { MARKETING_FROM, MARKETING_REPLY_TO } from '../_shared/marketing-templates/brand.ts';
import { unsubToken } from '../_shared/unsubscribeToken.ts';

const headers = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Content-Type':'application/json' };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null,{headers});
  if (req.method !== 'POST') return reply(405,{error:'Method not allowed.'});
  try {
    const raw = await req.text();
    if (raw.length>6000) return reply(413,{error:'Request too large.'});
    let body: Record<string, any>;
    try { body=JSON.parse(raw); } catch { return reply(400,{error:'Invalid request.'}); }
    if (!body || typeof body !== 'object') return reply(400,{error:'Invalid request.'});
    const admin = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
    async function limit(bucket:string,count:number,seconds:number) {
      const {data,error}=await admin.rpc('reserve_update_action',{p_bucket:bucket,p_limit:count,p_seconds:seconds});
      if(error) throw new Error('Preference service unavailable. Please try again.');
      return data===true;
    }
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = await hash(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')+':updates:'+ip);
    if(body.action==='subscribe') {
      if(body.website) return reply(200,{ok:true});
      let input: ReturnType<typeof validateUpdateSignup>;
      try { input=validateUpdateSignup(body); } catch(e) { return reply(400,{error:(e as Error).message}); }
      if(!await limit('email-ip:'+ipHash,12,3600) || !await limit('email:'+await hash(input.email),3,3600)) return reply(429,{error:'Please wait before requesting another confirmation.'});
      const [unsub,suppression]=await Promise.all([
        admin.from('email_unsubscribes').select('email').eq('email',input.email).limit(1),
        admin.from('suppressed_emails').select('email').eq('email',input.email).limit(1),
      ]);
      if(unsub.error || suppression.error) throw new Error('We couldn’t check email preferences. Please try again.');
      // Do not disclose membership or override a previous opt-out.
      if(unsub.data?.length || suppression.data?.length) return reply(200,{ok:true});
      const apiKey=Deno.env.get('RESEND_API_KEY');
      if(!apiKey) throw new Error('Email confirmation is temporarily unavailable.');
      const token=crypto.randomUUID()+crypto.randomUUID();
      const tokenHash=await hash(token);
      const authorization=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
      const user=authorization ? (await admin.auth.getUser(authorization)).data.user : null;
      const {data:request,error}=await admin.from('marketplace_update_requests').insert({
        email:input.email,name:input.name,role:input.role,zip:input.zip,topics:input.topics,
        phone_e164:input.phone,sms_consent:input.smsConsent,consent_version:UPDATE_CONSENT_VERSION,
        sms_disclosure:input.smsConsent ? UPDATE_SMS_DISCLOSURE : null,
        source:['homepage','published','subscribe_page'].includes(body.source) ? body.source : 'homepage',
        user_id:user?.email?.toLowerCase()===input.email ? user.id : null,
        token_hash:tokenHash,ip_hash:ipHash,user_agent:req.headers.get('user-agent')?.slice(0,300),
      }).select('id').single();
      if(error || !request) throw new Error('We couldn’t save your request. Please try again.');
      // Fragment keeps the bearer token out of server access logs/referrers.
      const confirmUrl='https://vendibook.com/updates/confirm#token='+token;
      const unsubscribeUrl=`${Deno.env.get('SUPABASE_URL')}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(input.email)}&t=${unsubToken(input.email)}`;
      const email=updateConfirmationEmail({...input,confirmUrl,unsubscribeUrl});
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':'update-confirm-'+request.id},body:JSON.stringify({
        from:MARKETING_FROM,to:[input.email],reply_to:MARKETING_REPLY_TO,subject:'Confirm your Vendibook updates',html:email.html,text:email.text,
        headers:{'List-Unsubscribe':`<${unsubscribeUrl}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'},
        tags:[{name:'type',value:'update_confirmation'}],
      }),signal:AbortSignal.timeout(15000)});
      if(!response.ok || !(await response.json()).id) throw new Error('We saved your request but couldn’t send the confirmation. Please try again later.');
      return reply(200,{ok:true});
    }
    if(!['confirm','send_code','verify_code'].includes(body.action)) return reply(400,{error:'Unknown action.'});
    if(typeof body.token!=='string' || !/^[a-f0-9-]{72}$/.test(body.token)) return reply(400,{error:'Invalid confirmation link.'});
    const tokenHash=await hash(body.token);
    if(body.action==='confirm') {
      const {data,error}=await admin.rpc('confirm_marketplace_updates',{p_hash:tokenHash});
      if(error) throw new Error('We couldn’t confirm your preferences. Please try again.');
      return reply(data?.ok ? 200 : 400,data);
    }
    const {data:r,error:readError}=await admin.from('marketplace_update_requests').select('*').eq('token_hash',tokenHash).maybeSingle();
    if(readError) throw new Error('Verification is temporarily unavailable.');
    if(!r || !r.confirmed_at || !r.sms_consent || Date.parse(r.expires_at)<=Date.now()) return reply(400,{error:'Confirm your email first, or request a new confirmation link.'});
    const {data:p,error:pError}=await admin.from('marketplace_update_preferences').select('sms_status').eq('request_id',r.id).maybeSingle();
    if(pError) throw new Error('We couldn’t check your text preferences.');
    if(p?.sms_status!=='pending_verification') return reply(400,{error:'This verification is no longer pending. Use your most recent confirmation email.'});
    const {data:blocked,error:blockError}=await admin.from('sms_suppressions').select('id').eq('phone_e164',r.phone_e164).is('released_at',null).limit(1);
    if(blockError) throw new Error('We couldn’t check your text preferences.');
    if(blocked?.length) return reply(400,{error:'This number is opted out. Contact support for help with text preferences.'});
    if(body.action==='verify_code') {
      if(!/^\d{6}$/.test(String(body.code))) return reply(400,{error:'Enter the six-digit code.'});
      const {data,error}=await admin.rpc('verify_update_phone',{p_hash:tokenHash,p_code_hash:await hash(r.id+':'+r.phone_e164+':'+body.code)});
      if(error) throw new Error('Verification is temporarily unavailable.');
      return reply(data ? 200 : 400,data ? {ok:true} : {error:'That code is incorrect or expired. Request a new one.'});
    }
    if(body.verificationConsent!==true) return reply(400,{error:'Request a verification text to continue.'});
    if(!await limit('sms-phone-minute:'+r.phone_e164,1,60) || !await limit('sms-phone-day:'+r.phone_e164,5,86400) || !await limit('sms-ip:'+ipHash,10,3600)) return reply(429,{error:'Please wait before requesting another code.'});
    const lovable=Deno.env.get('LOVABLE_API_KEY'), twilio=Deno.env.get('TWILIO_API_KEY'), from=Deno.env.get('TWILIO_FROM_NUMBER')||Deno.env.get('TWILIO_PHONE_NUMBER');
    if(!lovable || !twilio || !from) throw new Error('Text verification is temporarily unavailable.');
    let random:number; do { random=crypto.getRandomValues(new Uint32Array(1))[0]; } while(random>=4294000000);
    const code=String(random%1000000).padStart(6,'0');
    const {error:saveError}=await admin.from('marketplace_update_requests').update({code_hash:await hash(r.id+':'+r.phone_e164+':'+code),code_attempts:0,code_delivered:false,code_expires_at:new Date(Date.now()+600000).toISOString(),code_sent_at:new Date().toISOString()}).eq('id',r.id);
    if(saveError) throw new Error('We couldn’t prepare your verification code.');
    // Same Twilio connection as signup-phone-verification; no marketing content in this OTP.
    const sent=await fetch('https://connector-gateway.lovable.dev/twilio/Messages.json',{method:'POST',headers:{Authorization:'Bearer '+lovable,'X-Connection-Api-Key':twilio,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({To:r.phone_e164,From:from,Body:`Vendibook: Your requested verification code is ${code}. Expires in 10 minutes. Reply STOP to opt out or HELP for help. Msg & data rates may apply.`}),signal:AbortSignal.timeout(15000)});
    const result=sent.ok ? await sent.json() : null;
    if(!result?.sid || ['failed','undelivered','canceled'].includes(result.status)) throw new Error('We couldn’t send your code. Please try again later.');
    const {error:deliveredError}=await admin.from('marketplace_update_requests').update({code_delivered:true}).eq('id',r.id);
    if(deliveredError) throw new Error('We couldn’t prepare verification. Please request another code later.');
    return reply(200,{ok:true,retry_after:60});
  } catch(e) {
    console.error('marketplace-updates failed');
    return reply(500,{error:(e as Error).message || 'Please try again later.'});
  }
});
