// Existing hourly job. One request per publication, 24h delay, at most one per recipient/day.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts';
import { isAdminOrBackendCaller, forbiddenResponse } from '../_shared/callerGuard.ts';
const corsHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type,x-cron-secret'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(!await isAdminOrBackendCaller(req))return forbiddenResponse(corsHeaders);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
 try{
  const {data:setting,error:settingError}=await db.from('operations_settings').select('enabled').eq('id','post_publish_feedback').single();
  if(settingError)throw settingError;if(!setting.enabled)return respond({ok:true,paused:true,sent:0});
  const {data:listings,error:queryError}=await db.rpc('claim_post_publish_feedback',{p_limit:50});
  if(queryError)throw queryError;
  let sent=0,failed=0,suppressed=0;
  for(const listing of listings||[]){
   const profile=listing;const email=listing.email;
   try{
    const {data:previous,error:previousError}=await db.from('feedback_submissions').select('metadata').eq('context_type','listing_publish').eq('context_id',listing.id).eq('user_id',listing.host_id).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(previousError)throw previousError;
    let token=previous?.metadata?.token;
    if(!token){token=crypto.randomUUID()+crypto.randomUUID();const {error}=await db.from('feedback_submissions').insert({user_id:listing.host_id,context_type:'listing_publish',context_id:listing.id,email,metadata:{token,status:'pending',listing_title:listing.title}});if(error)throw error;}
    const {data,error}=await invokeTransactionalEmail({templateName:'feedback-request',recipientEmail:email,idempotencyKey:`feedback-publish-${listing.id}`,metadata:{context_type:'listing_publish',context_id:listing.id},templateData:{recipientName:profile.first_name||profile.full_name?.split(' ')[0],contextLabel:listing.title?`publishing "${listing.title}"`:'publishing your listing',contextType:'listing_publish',feedbackToken:token}});
    if(error)throw error;
    const status=data?.sent===true?'sent':data?.suppressed||data?.status==='suppressed'?'suppressed':'failed';
    const {error:logError}=await db.from('feedback_email_sent').update({dispatch_status:status,last_error:status==='failed'?'Provider did not confirm acceptance':null,updated_at:new Date().toISOString()}).eq('id',listing.claim_id);
    if(logError)throw logError;
    if(status==='sent')sent++;else if(status==='suppressed')suppressed++;else failed++;
   }catch(e){failed++;await db.from('feedback_email_sent').update({dispatch_status:'failed',last_error:(e instanceof Error?e.message:'Send failed').slice(0,300),updated_at:new Date().toISOString()}).eq('id',listing.claim_id);}
  }
  return respond({ok:true,sent,failed,suppressed});
 }catch(e){console.error('post_publish_feedback',e instanceof Error?e.message:'Failed');return respond({ok:false,error:'Feedback workflow could not finish'},500);}
});
