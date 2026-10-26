import { createClient } from 'npm:@supabase/supabase-js@2';
import * as React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { template as notice } from '../_shared/transactional-email-templates/generic-notice.tsx';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts';
import { maskContactDetails } from '../_shared/contactPatterns.ts';
import { relayDisplayName, relayVisible, relayBody, relayEmailContent } from '../_shared/managedRelayPolicy.ts';
import { adminAlertEmails, adminNoticeKey } from '../_shared/adminRecipients.ts';

const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Content-Type':'application/json'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Cache-Control':'no-store'}});
function checked<T>(r:{data:T;error:unknown}):T {if(r.error)throw r.error;return r.data;}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const text=await req.text();if(text.length>14000)return json({error:'Request too large'},413);
  const p=JSON.parse(text);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let actor:string|null=null;let admin=false;
  const bearer=req.headers.get('authorization')?.replace(/^Bearer /i,'');
  if(bearer){const result=await db.auth.getUser(bearer);actor=result.data.user?.id??null;}
  if(actor){
   if(!checked(await db.rpc('message_account_active',{actor})))return json({error:'Account unavailable'},403);
   admin=!!checked(await db.rpc('has_role',{_user_id:actor,_role:'admin'}));
  }
  const reviewAlert=async(id:string,key:string)=>Promise.all(adminAlertEmails().map(to=>invokeTransactionalEmail({templateName:'generic-notice',recipientEmail:to,idempotencyKey:adminNoticeKey(`managed-review:${key}`,to),templateData:{heading:'A listing message is awaiting review',paragraphs:['No message has been relayed to the other participant. Review the original, remove private contact details, then release the approved message.'],ctaLabel:'Review conversation',ctaUrl:`https://vendibook.com/inquiries/${id}`}})));
  if(p.action==='create'){
   if(!uuid.test(p.listing_id)||!uuid.test(p.request_key)||typeof p.email!=='string'||typeof p.name!=='string'||typeof p.message!=='string')return json({error:'Enter your name, email and message.'},400);
   const secret=token();
   const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
   if(!ip)return json({error:'Unable to verify request. Please try again.'},503);
   const id=checked(await db.rpc('create_managed_inquiry',{p_listing:p.listing_id,p_email:p.email,p_name:p.name,p_body:p.message,p_token_hash:await sha(secret),p_request:p.request_key,p_ip_hash:await sha(`${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}:${ip}`)}));
   const result=await invokeTransactionalEmail({templateName:'generic-notice',recipientEmail:p.email.trim().toLowerCase(),idempotencyKey:`managed-access:${id}`,templateData:{kicker:'Your private conversation',heading:'Confirm your email for your listing inquiry',paragraphs:['Open your secure conversation to verify your email. Vendibook reviews every message before relaying it. The seller is notified only after an approved message is sent.','Neither participant receives the other’s email or phone number.'],ctaLabel:'Open my conversation',ctaUrl:`https://vendibook.com/inquiries/${id}#access=${secret}`,footnote:'This private link expires in seven days. Do not forward it. No marketing subscription was created.'}});
   await reviewAlert(String(id),p.request_key);
   if(result.error)return json({error:'Inquiry saved, but the access email failed. Contact support to request your secure link.'},502);
   return json({ok:true,verification_required:true});
  }
  if(p.action==='inbox'){
   if(!actor)return json({error:'Sign in to view your inbox'},401);
   let query=db.from('managed_inquiries').select('id,listing_id,host_id,guest_name,email,created_at,last_activity_at,verified_at,released_at,closed_at,listing:listings(title)').order('last_activity_at',{ascending:false}).limit(100);
   if(!admin)query=query.eq('host_id',actor).not('released_at','is',null);
   const rows=checked(await query);
   return json({threads:rows.map(r=>({id:r.id,listing_id:r.listing_id,title:maskContactDetails((r.listing as any)?.title||'Listing inquiry'),name:relayDisplayName(r.guest_name),last_activity_at:r.last_activity_at,verified:!!r.verified_at,released:!!r.released_at,closed:!!r.closed_at,...(admin?{email:r.email}: {})})),admin});
  }
  if(!uuid.test(p.id))return json({error:'Conversation unavailable'},404);
  const thread=checked(await db.from('managed_inquiries').select('*').eq('id',p.id).maybeSingle());
  if(!thread)return json({error:'Conversation unavailable'},404);
  if(p.action==='request_access'){
   if(typeof p.email==='string'&&p.email.trim().toLowerCase()===thread.email){
    const secret=token();
    const changed=checked(await db.from('managed_inquiries').update({token_hash:await sha(secret),token_expires_at:new Date(Date.now()+7*86400000).toISOString(),access_sent_at:new Date().toISOString()}).eq('id',thread.id).lt('access_sent_at',new Date(Date.now()-15*60000).toISOString()).select('id'));
    if(changed.length)await invokeTransactionalEmail({templateName:'generic-notice',recipientEmail:thread.email,idempotencyKey:`managed-access:${thread.id}:${await sha(secret)}`,templateData:{heading:'Your secure Vendibook conversation',paragraphs:['Use this private link to read and submit replies for review. Do not forward it.'],ctaLabel:'Open conversation',ctaUrl:`https://vendibook.com/inquiries/${thread.id}#access=${secret}`,footnote:'Expires in seven days. No marketing subscription was created.'}});
   }
   return json({ok:true});
  }
  const guest=typeof p.token==='string'&&/^[a-f0-9]{64}$/.test(p.token)&&Date.parse(thread.token_expires_at)>Date.now()&&await sha(p.token)===thread.token_hash;
  const seller=actor===thread.host_id;
  if(!guest&&!seller&&!admin)return json({error:'Open the secure email link, or sign in as the listing owner.'},403);
  if(seller&&!admin&&!thread.released_at)return json({error:'Conversation unavailable'},404);
  const role=admin?'support':seller?'seller':'guest';
  if(p.action==='read'){
   if(guest&&!thread.verified_at)checked(await db.from('managed_inquiries').update({verified_at:new Date().toISOString()}).eq('id',thread.id));
   let q=db.from('managed_inquiry_messages').select('*').eq('inquiry_id',thread.id).order('created_at',{ascending:false}).limit(100);
   if(!admin)q=q.or(`sent_at.not.is.null,sender_role.eq.${role}`);
   if(p.before&&typeof p.before==='string')q=q.lt('created_at',p.before);
   const messages=checked(await q).reverse().filter(m=>relayVisible(m,role)).map(m=>({id:m.id,sender_role:m.sender_role,body:relayBody(m,admin),held:!m.sent_at,created_at:m.created_at,sent_at:m.sent_at,hold_reason:admin?m.hold_reason:null,...(admin?{released_body:m.released_body,send_started_at:m.send_started_at,provider_email_id:m.provider_email_id}: {})}));
   const profile=checked(await db.from('profiles').select('full_name').eq('id',thread.host_id).maybeSingle());
   return json({messages,role,name:relayDisplayName(thread.guest_name),seller_name:relayDisplayName(profile?.full_name??'','Seller'),listing_id:thread.listing_id,closed:!!thread.closed_at,...(admin?{email:thread.email}: {})});
  }
  if(p.action==='reply'){
   if(!uuid.test(p.request_key)||typeof p.message!=='string')return json({error:'Enter a message'},400);
   const id=checked(await db.rpc('append_managed_inquiry_message',{p_inquiry:thread.id,p_role:role,p_actor:admin||seller?actor:null,p_body:p.message,p_request:p.request_key}));
   if(admin)checked(await db.from('managed_inquiry_messages').update({recipient_role:p.recipient_role==='guest'?'guest':'seller'}).eq('id',id).is('send_started_at',null));
   await reviewAlert(thread.id,String(id));return json({ok:true,id,status:'awaiting_review'});
  }
  if(p.action==='review'&&admin){
   if(!uuid.test(p.message_id)||p.decision!=='release')return json({error:'Invalid review'},400);
   const m=checked(await db.from('managed_inquiry_messages').select('*').eq('id',p.message_id).eq('inquiry_id',thread.id).single());
   if(m.sent_at)return json({ok:true,status:'already_sent'});
   if(m.send_started_at)return json({error:'Dispatch already started. Check Resend delivery evidence before retrying to avoid duplicate email.'},409);
   const key=Deno.env.get('RESEND_API_KEY');if(!key)return json({error:'Resend relay sending is not configured.'},503);
   const profile=checked(await db.from('profiles').select('email,full_name').eq('id',thread.host_id).single());
   const recipient=m.recipient_role==='guest'?thread.email:profile?.email;
   if(!recipient)return json({error:'Recipient unavailable'},409);
   const screened=maskContactDetails(typeof p.message==='string'?p.message:m.body).trim();
   const sender=m.sender_role==='guest'?relayDisplayName(thread.guest_name):m.sender_role==='seller'?relayDisplayName(profile.full_name??'','Seller'):'Vendibook support';
   const subject=`New message from ${sender} [VB-${thread.id}]`;
   const replyKey=m.recipient_role==='guest'?thread.guest_reply_key:thread.seller_reply_key;
   const email=relayEmailContent(m.recipient_role,sender,screened,thread.id,replyKey);
   const component=React.createElement(notice.component,email.props);
   const html=await renderAsync(component);const plain=email.text;
   const reservation=checked(await db.rpc('reserve_managed_relay',{p_message:m.id,p_body:screened,p_review_label:'Vendibook administrator',p_reviewer:actor}));
   if(reservation.status!=='reserved')return json({error:'This message is already being sent or has been sent.'},409);
   const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`managed-relay-${m.id}`},body:JSON.stringify({from:'Vendibook Concierge <hello@updates.vendibook.com>',to:[recipient],reply_to:email.replyTo,subject,html,text:plain})});
   const result=await sent.json();
   if(!sent.ok||!result.id)return json({error:'Email dispatch could not be confirmed. Message remains private; check Resend before retrying.'},502);
   checked(await db.rpc('complete_managed_relay',{p_message:m.id,p_email_id:result.id}));
   return json({ok:true,status:'sent',email_id:result.id});
  }
  return json({error:'Unsupported action'},400);
 }catch(error){console.error('Managed inquiry failed',error instanceof Error?error.message:'request failed');return json({error:'Could not complete this request. Please retry later or contact support.'},400);}
});
