import { getCaller, isAdminUser, serviceRoleClient } from '../_shared/callerGuard.ts';
import { sendGuardedSms } from '../_shared/smsGuard.ts';
import { isGoogleRoutingConfigured } from '../_shared/googleRouting.ts';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return json({error:'POST required'},405);
 const caller=await getCaller(req);if(!caller||!await isAdminUser(caller.id))return json({error:'Admin access required'},403);
 const db=serviceRoleClient();
 try{
  const raw=await req.text();if(raw.length>6000)return json({error:'Request too large'},413);const body=JSON.parse(raw);
  if(body.action==='connections')return json({google_routes:isGoogleRoutingConfigured(),sms:!!(Deno.env.get('TWILIO_FROM_NUMBER')||Deno.env.get('TWILIO_PHONE_NUMBER'))&&!!((Deno.env.get('LOVABLE_API_KEY')&&Deno.env.get('TWILIO_API_KEY'))||(Deno.env.get('TWILIO_ACCOUNT_SID')&&Deno.env.get('TWILIO_AUTH_TOKEN'))),sms_test_mode:Deno.env.get('SMS_TEST_MODE')==='true',sms_callbacks:!!Deno.env.get('TWILIO_AUTH_TOKEN'),google_browser:!!Deno.env.get('GOOGLE_MAPS_BROWSER_KEY'),ga4:false});
  if(body.action==='review_feedback'){
   if(!uuid(body.id))return json({error:'Invalid feedback ID'},400);
   const {data,error}=await db.from('feedback_submissions').update({reviewed_at:new Date().toISOString(),reviewed_by:caller.id}).eq('id',body.id).select('id').maybeSingle();
   if(error||!data)return json({error:'Feedback could not be updated'},409);return json({ok:true});
  }
  if(body.action==='set_feedback'){
   if(typeof body.enabled!=='boolean')return json({error:'Enabled must be true or false'},400);
   const {error}=await db.from('operations_settings').update({enabled:body.enabled,updated_by:caller.id,updated_at:new Date().toISOString()}).eq('id','post_publish_feedback');
   if(error)throw error;return json({ok:true});
  }
  if(!['sms_preview','sms_send'].includes(body.action)||!uuid(body.user_id))return json({error:'Invalid action or user'},400);
  const {data:prefs,error:prefError}=await db.from('sms_preferences').select('id,phone_e164,phone_verified_at,transactional_status').eq('user_id',body.user_id).eq('transactional_status','opted_in').not('phone_verified_at','is',null).order('updated_at',{ascending:false}).limit(1);
  if(prefError)throw prefError;const pref=prefs?.[0];if(!pref)return json({error:'This user has no verified, opted-in text number'},409);
  const {data:blocked,error:blockError}=await db.from('sms_suppressions').select('id').eq('phone_e164',pref.phone_e164).is('released_at',null).limit(1);
  if(blockError)throw blockError;if(blocked?.length)return json({error:'This number has opted out'},409);
  if(body.action==='sms_preview')return json({ok:true,phone:'••• ••• '+pref.phone_e164.slice(-4)});
  if(!uuid(body.request_id)||typeof body.message!=='string'||body.message.trim().length<5||body.message.length>400||body.confirmed!==true)return json({error:'Review a support message of 5–400 characters first'},400);
  const message=`Vendibook support: ${body.message.trim()} Reply STOP to opt out or HELP for help.`;
  const {error:claim}=await db.from('operations_actions').insert({id:body.request_id,actor_id:caller.id,action:'support_sms',target_id:body.user_id});
  if(claim){if(claim.code==='23505')return json({error:'This send was already attempted. Check its delivery log before trying again.'},409);throw claim;}
  const {data:allowed,error:rateError}=await db.rpc('reserve_update_action',{p_bucket:`admin-sms:${body.user_id}`,p_limit:3,p_seconds:86400});
  if(rateError||!allowed){await db.from('operations_actions').update({status:'blocked',result:{reason:'rate_limit'}}).eq('id',body.request_id);return json({error:'Daily text limit reached or unavailable'},429);}
  const result=await sendGuardedSms({recipientPhone:pref.phone_e164,userId:body.user_id,category:'customer_care',templateId:'admin-support',businessPurpose:'admin_support',templateVariables:{message:body.message.trim()},idempotencyKey:body.request_id,body:message});
  await db.from('operations_actions').update({status:result.ok?'accepted':'blocked',result}).eq('id',body.request_id);
  return result.ok?json({ok:true,status:'accepted',message:'Accepted by the text provider. Delivery is not yet confirmed.'}):json({error:`Text not confirmed: ${result.reason}. Check the log before retrying.`},409);
 }catch(e){console.error('admin-operations',e instanceof Error?e.message:'Request failed');return json({error:'Request could not be completed. Refresh and check the activity log.'},500);}
});
