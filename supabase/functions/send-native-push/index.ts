import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6';
import { classifyFcm, safeNotificationPath } from './policy.ts';

let cached: { token: string; expires: number } | undefined;
async function accessToken(account: any) {
 if(cached && cached.expires > Date.now()+60000) return cached.token;
 const key=await importPKCS8(account.private_key,'RS256');
 const assertion=await new SignJWT({scope:'https://www.googleapis.com/auth/firebase.messaging'})
  .setProtectedHeader({alg:'RS256',typ:'JWT'}).setIssuer(account.client_email)
  .setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('1h').sign(key);
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(10000)});
 const data=await response.json();
 if(!response.ok || !data.access_token) throw new Error('FCM authentication unavailable');
 cached={token:data.access_token,expires:Date.now()+Number(data.expires_in||3600)*1000};
 return cached.token;
}
const reply=(status:number, state:string)=>new Response(JSON.stringify({status:state}),{status,headers:{'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method!=='POST') return reply(405,'method_not_allowed');
 let input: any; try {input=await req.json();} catch{return reply(400,'invalid_request');}
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(input.job_id||'') || !uuid.test(input.capability||'')) return reply(400,'invalid_request');
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const {data:job,error}=await db.from('native_push_jobs').select('*').eq('id',input.job_id).eq('capability',input.capability).maybeSingle();
 if(error) return reply(503,'unavailable');
 if(!job) return reply(404,'not_found');
 if(!['queued','retry'].includes(job.status)||job.attempts>=5) return reply(200,'already_processed');
 const {data:claim}=await db.from('native_push_jobs').update({status:'sending',attempts:job.attempts+1,updated_at:new Date().toISOString()}).eq('id',job.id).eq('status',job.status).eq('attempts',job.attempts).select('id').maybeSingle();
 if(!claim) return reply(200,'already_processing');
 let attemptedSend=false;
 try {
  const [{data:notification,error:notificationError},{data:device,error:deviceError}]=await Promise.all([
   db.from('notifications').select('user_id,title,message,link').eq('id',job.notification_id).maybeSingle(),
   db.from('native_push_devices').select('user_id').eq('token',job.token).maybeSingle()
  ]);
  if(notificationError||deviceError) throw new Error('Lookup unavailable');
  if(!notification||!device||device.user_id!==notification.user_id){await db.from('native_push_jobs').update({status:'failed'}).eq('id',job.id);return reply(200,'no_recipient');}
  const account=JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')||'{}');
  if(account.project_id!=='vendibook-e242d'||!account.client_email||!account.private_key) throw new Error('Firebase configuration unavailable');
  const token=await accessToken(account);
  // Keep private message/transaction content off the device lock screen.
  const message={token:job.token,notification:{title:'Vendibook',body:'You have a new account update. Open Vendibook to view it.'},data:{url:safeNotificationPath(notification.link),user_id:device.user_id,notification_id:job.notification_id},android:{priority:'HIGH',notification:{channel_id:'vendibook_updates',tag:job.notification_id,icon:'ic_notification',visibility:'PRIVATE'}}};
  attemptedSend=true;
  const response=await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({message}),signal:AbortSignal.timeout(10000)});
  const result=classifyFcm(response.status,await response.json().catch(()=>({})));
  if(result==='unregistered'){await db.from('native_push_devices').delete().eq('token',job.token);return reply(200,'unregistered');}
  await db.from('native_push_jobs').update({status:result==='retry'&&job.attempts+1>=5?'failed':result,next_attempt_at:new Date(Date.now()+Math.min(3600000,60000*2**job.attempts)).toISOString(),updated_at:new Date().toISOString()}).eq('id',job.id);
  return reply(result==='retry'?503:200,result);
 } catch {
  // Before sending, safe to retry. After a timeout, delivery may have occurred.
  if(!attemptedSend) await db.from('native_push_jobs').update({status:job.attempts+1>=5?'failed':'retry',next_attempt_at:new Date(Date.now()+120000).toISOString(),updated_at:new Date().toISOString()}).eq('id',job.id);
  console.error('[NATIVE-PUSH] delivery incomplete', {job_id:job.id,ambiguous:attemptedSend});
  return reply(503,attemptedSend?'delivery_unknown':'temporarily_unavailable');
 }
});
