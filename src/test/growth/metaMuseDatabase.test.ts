// Executes the actual migration in isolated PostgreSQL/WASM: no production fixtures.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll,afterAll,describe,it,expect } from 'vitest';
let db:PGlite;
const admin='924e1f23-b87d-4b7f-8ff9-30228d196180', nonadmin='f99253cf-6fb3-4f55-a08e-3cbf63228373';
const listing='11111111-1111-4111-8111-111111111111';
async function rpc(action:string,payload:unknown){const r=await db.query<{value:any}>('select public.meta_muse_action($1,$2::jsonb) value',[action,JSON.stringify(payload)]);return r.rows[0].value;}
async function asUser(id:string){await db.query("select set_config('test.uid',$1,false)",[id]);}
async function lead(extra:Record<string,unknown>={}){return rpc('create_lead',{name:'Isolated fixture',intent:'buy',source_kind:'manual_authorized',provenance:'Isolated test authorization',contact:'test@example.invalid',contact_allowed:true,consent_evidence:'Isolated permission',...extra});}
async function draft(l:any){return rpc('create_draft',{lead_id:l.id,lead_revision:l.revision,body:'Review this option\nhttps://vendibook.com/listing/'+listing,listing_ids:[listing],generator:'template'});}
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.has_role(uuid,text) returns boolean language sql stable as $$select $1='${admin}'::uuid and $2='admin'$$;
 create table public.listings(id uuid primary key,title text,unlisted boolean,status text,published_at timestamptz,deleted_at timestamptz,moderation_status text,mode text,category text,city text,state text,price_sale numeric,price_daily numeric,price_weekly numeric,price_monthly numeric,vendibook_freight_enabled boolean,rental_min_days int,available_from date,available_to date);
 create table public.sale_transactions(listing_id uuid,status text);
 create function public.listing_purchase_state(uuid) returns jsonb language sql as $$select jsonb_build_object('purchasable',true)$$;
 create function public.sale_action_state(uuid) returns jsonb language sql as $$select jsonb_build_object('can_request',true)$$;
 create function public.check_booking_availability(uuid,date,date) returns jsonb language sql as $$select jsonb_build_object('available',coalesce(current_setting('test.available',true),'true')='true')$$;
 `);
 await db.exec(readFileSync('drizzle/migrations/0019_meta_muse_admin_lead_workspace.sql','utf8'));
 await db.exec(`insert into public.listings(id,title,unlisted,status,published_at,moderation_status,mode,category,city,state,price_sale) values('${listing}','Realistic isolated listing',false,'published',now(),'clear','sale','food_trailer','Phoenix','AZ',25000);`);
 await asUser(admin);
},30000);
afterAll(async()=>{await db?.close();});
describe('Meta Muse actual SQL authorization and transitions',()=>{
 it('denies nonadmin RPC and rate limiter',async()=>{await asUser(nonadmin);await expect(rpc('create_lead',{})).rejects.toThrow('Admin access required');await expect(db.query('select meta_muse_take_rate()')).rejects.toThrow('Admin access required');await asUser(admin);});
 it('RLS hides lead PII from ordinary members and rejects direct mutations',async()=>{await lead();await db.exec('set role authenticated');await asUser(nonadmin);const result=await db.query('select * from meta_muse_leads');expect(result.rows).toHaveLength(0);await expect(db.exec("insert into meta_muse_leads(created_by,name,intent,source_kind,provenance) values(gen_random_uuid(),'x','buy','voluntary','x')")).rejects.toThrow('permission denied');await db.exec('reset role');await asUser(admin);});
 it('approves exactly reviewed draft, not sent; replay rejected',async()=>{const l=await lead(),d=await draft(l);const approved=await rpc('approve',{draft_id:d.id,revision:d.revision});expect(approved.status).toBe('approved');expect(approved.approved_by).toBe(admin);await expect(rpc('approve',{draft_id:d.id,revision:d.revision})).rejects.toThrow('blocked');await expect(rpc('send',{draft_id:d.id})).rejects.toThrow('Sending disabled');});
 it('draft edits clear approval and stale revisions fail',async()=>{const l=await lead(),d=await draft(l);await rpc('approve',{draft_id:d.id,revision:d.revision});const changed=await rpc('edit_draft',{draft_id:d.id,revision:d.revision,body:'Changed'});expect(changed).toMatchObject({status:'draft',revision:2,approved_at:null,approved_by:null});await expect(rpc('approve',{draft_id:d.id,revision:1})).rejects.toThrow('changed');});
 it('lead edits invalidate all approvals and require redrafting',async()=>{const l=await lead(),d=await draft(l);await rpc('approve',{draft_id:d.id,revision:1});await rpc('edit_lead',{...l,lead_id:l.id,lead_revision:l.revision,name:'Changed'});const r=await db.query<{status:string}>('select status from meta_muse_drafts where id=$1',[d.id]);expect(r.rows[0].status).toBe('draft');await expect(rpc('approve',{draft_id:d.id,revision:1})).rejects.toThrow('blocked');});
 it('do-not-contact, missing consent and Messenger block approval',async()=>{for(const fields of [{do_not_contact:true},{consent_evidence:''},{contact_channel:'messenger'}]){const l=await lead(fields),d=await draft(l);await expect(rpc('approve',{draft_id:d.id,revision:1})).rejects.toThrow('blocked');}});
 it('rejects arbitrary links and mismatched IDs',async()=>{const l=await lead(),d=await draft(l);await rpc('edit_draft',{draft_id:d.id,revision:1,body:'https://evil.invalid'});await expect(rpc('approve',{draft_id:d.id,revision:2})).rejects.toThrow('canonical');});
 it('rejects unavailable, sold, unlisted, test and moderated listings',async()=>{for(const update of ["status='paused'","unlisted=true","title='QA fixture'","moderation_status='blocked'","deleted_at=now()","published_at=null"]){await db.exec('begin');await db.exec('update listings set '+update);const l=await lead(),d=await draft(l);await expect(rpc('approve',{draft_id:d.id,revision:1})).rejects.toThrow('eligible');await db.exec('rollback');}await db.exec('begin');await db.exec(`insert into sale_transactions values('${listing}','paid')`);const l=await lead(),d=await draft(l);await expect(rpc('approve',{draft_id:d.id,revision:1})).rejects.toThrow('eligible');await db.exec('rollback');});
 it('requires future rental dates and checks availability before approval',async()=>{await db.exec('begin');await db.exec("update listings set mode='rent'");const l=await lead({intent:'rent'}),d=await draft(l);await expect(rpc('approve',{draft_id:d.id,revision:1})).rejects.toThrow('dates required');const l2=await lead({intent:'rent',start_date:'2090-11-14',end_date:'2090-11-17'}),d2=await draft(l2);await db.exec("select set_config('test.available','false',false)");await expect(rpc('approve',{draft_id:d2.id,revision:1})).rejects.toThrow('Rental unavailable');await db.exec('rollback');});
 it('reject transition is audited and cannot be replayed',async()=>{const l=await lead(),d=await draft(l);expect((await rpc('reject',{draft_id:d.id,revision:1})).status).toBe('rejected');await expect(rpc('reject',{draft_id:d.id,revision:1})).rejects.toThrow('Only draft');const r=await db.query<{action:string}>('select action from meta_muse_audit where draft_id=$1 order by created_at desc',[d.id]);expect(r.rows.some(a=>a.action==='reject')).toBe(true);});
 it('atomic per-admin limiter stops the eleventh inference attempt',async()=>{for(let i=0;i<10;i++){const r=await db.query<{allowed:boolean}>('select meta_muse_take_rate() allowed');expect(r.rows[0].allowed).toBe(true);}const r=await db.query<{allowed:boolean}>('select meta_muse_take_rate() allowed');expect(r.rows[0].allowed).toBe(false);});
});
