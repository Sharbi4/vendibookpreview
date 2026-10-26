import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.25.76';
import {getCaller,isAdminUser,serviceRoleClient} from '../_shared/callerGuard.ts';
import {eligibility,followupDraft,OPENERS,SEGMENTS,OUTCOMES,pilotLimit} from '../_shared/growthOutreach.ts';
import {FEE_CONFIG} from '../_shared/feeConfig.ts';
const AGENT_ID='agent_6701m5wwwxm0f3p8rf0hmmbc54j1';
const text=z.string().trim().max(1000);
const leadSchema=z.object({record_id:z.string().trim().min(1).max(100),phone:z.string().regex(/^\+1\d{10}$/),prospect_name:text.default(''),business_name:text.default(''),market:text.default(''),segment:z.enum(SEGMENTS),state:z.string().regex(/^[A-Z]{2}$/),timezone:z.string().min(1).max(80),asset_type:text.optional(),lead_context:text.optional(),last_inquiry:text.optional(),matched_listing_url:text.optional(),matched_listing_title:text.optional(),relationship_context:text.optional(),eligibility_status:text.optional(),ai_call_consent_status:text.optional(),ai_call_consent_at:text.optional(),ai_call_consent_source:text.optional(),sms_marketing_consent_status:text.optional()});
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('snapshot')}),z.object({action:z.literal('provider_status')}),
 z.object({action:z.literal('import'),leads:z.array(leadSchema).min(1).max(500)}),
 z.object({action:z.literal('evidence'),lead_id:z.string().uuid(),channel:z.enum(['ai_call','sms_marketing']),source:z.string().min(1).max(2000),evidence_text:z.string().min(20).max(4000),accepted_at:z.string().datetime(),ai_marketing:z.boolean(),vendibook_named:z.boolean()}),
 z.object({action:z.literal('review_consent'),consent_id:z.string().uuid(),approve:z.boolean(),jurisdiction_approved:z.boolean(),dnc_checked_at:z.string().datetime(),window_start:z.number().int().min(10).max(17),window_end:z.number().int().min(11).max(18)}),
 z.object({action:z.literal('preview'),lead_ids:z.array(z.string().uuid()).min(1).max(10)}),
 z.object({action:z.literal('approve_audit'),batch_id:z.string().uuid()}),
 z.object({action:z.literal('disposition'),lead_id:z.string().uuid(),outcome:z.enum(OUTCOMES)}),
 z.object({action:z.literal('draft_followup'),lead_id:z.string().uuid()}),
 z.object({action:z.literal('dispatch'),batch_id:z.string().uuid()}),z.object({action:z.literal('send_sms'),followup_id:z.string().uuid()}),
]);
Deno.serve(async(req)=>{
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
 if(req.method==='OPTIONS')return json({});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const caller=await getCaller(req);if(!caller||!await isAdminUser(caller.id))return json({error:'Administrator access required'},403);
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return json({error:'Invalid request fields'},400);
 const b=parsed.data,db=serviceRoleClient();
 const audit=async(action:string,record_id?:string,details:object={})=>{const {error}=await db.from('growth_outreach_audit').insert({actor_id:caller.id,action,record_id,details});if(error)throw new Error('Audit write failed');};
 const read=async(table:string)=>{const {data,error}=await db.from(table).select('*').order('created_at',{ascending:false}).limit(1000);if(error)throw new Error('Outreach records unavailable');return data??[];};
 const lead=async(id:string)=>{const {data,error}=await db.from('growth_outreach_leads').select('*').eq('id',id).single();if(error||!data)throw new Error('Lead unavailable');return data;};
 const check=async(row:any)=>{const {data,error}=await db.from('growth_outreach_consent').select('*').eq('lead_id',row.id).eq('channel','ai_call').order('created_at',{ascending:false}).limit(1);if(error)throw new Error('Consent unavailable');const {data:s,error:se}=await db.from('growth_outreach_suppressions').select('phone').eq('phone',row.phone);if(se)throw new Error('Suppression unavailable');return eligibility({...row,suppressed:row.suppressed||!!s?.length},data?.[0]??null);};
 try{
  if(b.action==='dispatch'||b.action==='send_sms'){await audit('blocked_'+b.action);return json({error:'OUTBOUND_CALLING_ENABLED is OFF. Dispatch and SMS are not implemented; no provider submission occurred.'},423);}
  if(b.action==='provider_status'){
   const key=Deno.env.get('ELEVENLABS_API_KEY');if(!key)return json({key_set:false,error:'ElevenLabs connection unavailable'},503);
   const get=async(path:string)=>{const r=await fetch('https://api.elevenlabs.io/v1'+path,{headers:{'xi-api-key':key}});if(!r.ok)throw new Error(`ElevenLabs read failed (${r.status})`);return r.json();};
   const agent=await get('/convai/agents/'+AGENT_ID),phones=await get('/convai/phone-numbers');
   const {data:jobs,error}=await db.from('growth_outreach_batches').select('provider_batch_id').not('provider_batch_id','is',null).limit(10);if(error)throw new Error('Batch records unavailable');
   const statuses=[];for(const job of jobs??[]){if(!/^[a-zA-Z0-9_-]+$/.test(job.provider_batch_id))continue;const status=await get('/convai/batch-calling/'+job.provider_batch_id);statuses.push({id:job.provider_batch_id,status:status.status});}
   return json({key_set:true,agent_id:agent.agent_id,name:agent.name,record_voice:agent.platform_settings?.privacy?.record_voice,zero_retention_mode:agent.platform_settings?.privacy?.zero_retention_mode,auth_enabled:agent.platform_settings?.auth?.enable_auth,phones:(Array.isArray(phones)?phones:phones.phone_numbers??[]).map((p:any)=>({id:p.phone_number_id,label:'Imported phone • redacted',supports_outbound:p.supports_outbound,assigned_agent_id:p.assigned_agent?.agent_id??null,separate_available:p.supports_outbound===true&&!p.assigned_agent})),batch_statuses:statuses,calling_enabled:false});
  }
  if(b.action==='snapshot'){
   const [leads,consents,batches,followups]=await Promise.all([read('growth_outreach_leads'),read('growth_outreach_consent'),read('growth_outreach_batches'),read('growth_outreach_followups')]);
   const rows=[];for(const l of leads)rows.push({id:l.id,record_id:l.record_id,phone:'••••••••••',prospect_name:'Contact redacted',business_name:l.business_name,market:l.market,segment:l.segment,state:l.state,timezone:l.timezone,attempts:l.attempts,disposition:l.disposition,suppressed:l.suppressed,opener:OPENERS[l.segment as keyof typeof OPENERS],blockers:await check(l)});
   return json({agent_id:AGENT_ID,calling_enabled:false,leads:rows,consents:consents.map(({evidence_text,source,...c}:any)=>({...c,source_recorded:!!source,evidence_recorded:!!evidence_text})),batches,followups,fees:FEE_CONFIG,metrics:{imported:leads.length,eligible:rows.filter(l=>!l.blockers.length).length,calls_placed:leads.reduce((n,l)=>n+l.attempts,0),sms_sent:0},founder_approval_available:false});
  }
  if(b.action==='import'){
   await audit('import_requested',undefined,{count:b.leads.length});let imported=0,duplicates=0;
   for(const l of b.leads){try{new Intl.DateTimeFormat('en-US',{timeZone:l.timezone});}catch{return json({error:'Invalid timezone; prior imports remain saved',imported},400);}
    const {record_id,phone,prospect_name,business_name,market,segment,state,timezone,...context}=l;
    const {error}=await db.from('growth_outreach_leads').insert({record_id,phone,prospect_name,business_name,market,segment,state,timezone,context,created_by:caller.id});
    if(error?.code==='23505')duplicates++;else if(error)throw new Error('Lead import failed; previous rows remain saved');else imported++;
   }return json({imported,duplicates,consent_verified:false});
  }
  if(b.action==='evidence'){
   if(Date.parse(b.accepted_at)>Date.now())return json({error:'Consent date cannot be in the future'},400);
   const l=await lead(b.lead_id);await audit('evidence_added',l.id);
   const {action,lead_id,...fields}=b;const {error}=await db.from('growth_outreach_consent').insert({...fields,lead_id,state:l.state,timezone:l.timezone,status:'pending'});if(error)throw new Error('Evidence save failed');return json({saved:true,status:'pending'});
  }
  if(b.action==='review_consent'){
   if(b.window_start>=b.window_end||Date.parse(b.dnc_checked_at)>Date.now())return json({error:'Invalid DNC date or calling window'},400);
   await audit('consent_review',b.consent_id,{approved:b.approve});
   const {error}=await db.from('growth_outreach_consent').update({status:b.approve?'verified':'rejected',reviewed_by:caller.id,reviewed_at:new Date().toISOString(),jurisdiction_approved:b.jurisdiction_approved,dnc_checked_at:b.dnc_checked_at,window_start:b.window_start,window_end:b.window_end}).eq('id',b.consent_id);if(error)throw new Error('Review save failed');return json({saved:true});
  }
  if(b.action==='preview'){
   const ids=[...new Set(b.lead_ids)];if(!pilotLimit(ids.length))return json({error:'Pilot limit is ten unique leads'},400);
   const checks=[];for(const id of ids){const l=await lead(id);checks.push({lead_id:id,blockers:await check(l)});}
   await audit('batch_preview',undefined,{count:ids.length});const {data,error}=await db.from('growth_outreach_batches').insert({lead_ids:ids,audit:checks,created_by:caller.id,status:'preview'}).select('id').single();if(error)throw new Error('Preview save failed');return json({batch_id:data.id,checks,dispatch_enabled:false});
  }
  if(b.action==='approve_audit'){
   const {data:batch,error}=await db.from('growth_outreach_batches').select('*').eq('id',b.batch_id).single();if(error||!batch)throw new Error('Batch unavailable');
   for(const id of batch.lead_ids){if((await check(await lead(id))).length)return json({error:'Fresh audit failed: at least one lead is blocked'},409);}
   await audit('audit_approved',batch.id);const {error:e}=await db.from('growth_outreach_batches').update({status:'audit_approved'}).eq('id',batch.id);if(e)throw new Error('Approval save failed');return json({audit_approved:true,founder_approved:false,dispatch_enabled:false});
  }
  if(b.action==='disposition'){
   const l=await lead(b.lead_id);await audit('disposition',l.id,{outcome:b.outcome});
   const suppress=['do_not_call','not_interested','wrong_number'].includes(b.outcome);
   if(suppress){const {error}=await db.from('growth_outreach_suppressions').upsert({phone:l.phone,reason:b.outcome,created_by:caller.id});if(error)throw new Error('Suppression save failed');const {error:e}=await db.from('growth_outreach_followups').update({status:'suppressed'}).eq('lead_id',l.id);if(e)throw new Error('Follow-up suppression failed');}
   const {error}=await db.from('growth_outreach_leads').update({disposition:b.outcome,suppressed:l.suppressed||suppress}).eq('id',l.id);if(error)throw new Error('Disposition save failed');return json({saved:true});
  }
  if(b.action==='draft_followup'){
   const l=await lead(b.lead_id);if(l.suppressed)return json({error:'Suppressed contact'},409);await audit('followup_drafted',l.id);
   const {error}=await db.from('growth_outreach_followups').insert({lead_id:l.id,draft:followupDraft(l.segment),created_by:caller.id});if(error)throw new Error('Draft save failed');return json({saved:true,sent:false});
  }
  return json({error:'Unsupported action'},400);
 }catch{return json({error:'Outreach operation could not complete. No calls or SMS were submitted.'},502);}
});