// Runs only in an isolated GitHub Actions PostgreSQL instance (PGlite).
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create function public.has_role(uuid,text) returns boolean language sql as $$ select $1='00000000-0000-4000-8000-000000000004'::uuid $$;
create table host_subscriptions(user_id uuid,tier text,status text,current_period_end timestamptz);
create table monetization_products(id uuid primary key,metadata jsonb);
create table monetization_purchases(user_id uuid,product_id uuid,status text,fulfillment_status text,access_ends_at timestamptz);
create table listings(id uuid primary key,host_id uuid,mode text,status text,deleted_at timestamptz,unlisted boolean,title text,category text,make text,model text,price_sale numeric,city text,state text,cover_image_url text,image_urls text[],description text,highlights text[],included_items text,condition text);
create table sale_invoices(listing_id uuid,status text);
create table notifications(user_id uuid,type text,title text,message text,link text);
`);
await db.exec(await readFile('supabase/migrations/20261012230000_buyermatch_foundation.sql','utf8'));
await db.exec(await readFile('supabase/migrations/20261012231000_buyermatch_report_email.sql','utf8'));
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const seller=id(1),other=id(2),admin=id(4),listing=id(5);
for(const u of [seller,other,admin])await db.query('insert into auth.users values($1)',[u]);
await db.query("insert into host_subscriptions values($1,'vendibook_pro','active',now()+interval '1 month')",[seller]);
await db.query("insert into listings(id,host_id,mode,status,title) values($1,$2,'sale','published','Test truck')",[listing,seller]);
const who=async u=>{await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[u]);await db.exec('set role authenticated');};
const act=async(action,payload={})=>(await db.query('select buyermatch_action($1,$2::jsonb) result',[action,JSON.stringify(payload)])).rows[0].result;
let tests=0;const test=async(name,fn)=>{await fn();tests++;console.log('PASS '+name);};
await who(seller);let campaign;
await test('paid member submits a pending campaign and replay returns same ID',async()=>{
 campaign=await act('submit',{listing_id:listing});
 assert.equal(campaign.status,'pending_activation');
 assert.equal((await act('submit',{listing_id:listing})).id,campaign.id);
});
await test('browser writes and administrative activation are denied',async()=>{
 await assert.rejects(()=>db.query("update buyermatch_campaigns set status='researching'"));
 await assert.rejects(()=>act('activate',{campaign_id:campaign.id,research_started:true}));
});
await who(other);
await test('another seller cannot read or modify the campaign',async()=>{
 assert.equal((await db.query('select * from buyermatch_campaigns')).rows.length,0);
 await assert.rejects(()=>act('preferences',{campaign_id:campaign.id,geography:'Elsewhere'}));
 await assert.rejects(()=>act('submit',{listing_id:listing}));
});
await who(admin);
await test('activation is blocked before a real workflow is configured',async()=>{
 await assert.rejects(()=>act('activate',{campaign_id:campaign.id,research_started:true}));
 await act('settings',{submissions_enabled:true,fulfillment_enabled:true,max_campaigns:3,workflow_reference:'Approved manual review SOP'});
 await assert.rejects(()=>act('activate',{campaign_id:campaign.id}));
 await act('activate',{campaign_id:campaign.id,research_started:true});
});
const record={campaign_id:campaign.id,listing_id:listing,prospect_id:'prospect-1',buyer_intent_summary:'Public request for a truck',source_type:'public buying request',source_reference:'test fixture source',research_permission:'authorized research fixture',match_confidence:0.8,outreach_status:'discovered',discovered_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-02T00:00:00Z',private_contact:'private@example.test'};
const stage=(key,records)=>act('import',{campaign_id:campaign.id,batch_key:key,records});
const approve=(batch)=>act('approve_import',{campaign_id:campaign.id,import_id:batch.id,summary:'Reviewed public buying intent. No outreach has occurred.',review_confirmed:true});
let batch;
await test('invalid mapping, duplicates, missing evidence and future dates are rejected',async()=>{
 await assert.rejects(()=>stage('wrong',[{...record,listing_id:id(99)}]));
 await assert.rejects(()=>stage('dup',[record,record]));
 await assert.rejects(()=>stage('bad',[{...record,outreach_status:'replied'}]));
 await assert.rejects(()=>stage('future',[{...record,updated_at:'2999-01-01'}]));
});
await test('imports remain private until approval and batch keys are idempotent',async()=>{
 batch=await stage('batch-1',[record]);
 assert.equal((await stage('batch-1',[record])).id,batch.id);
 await assert.rejects(()=>stage('batch-1',[{...record,match_confidence:0.7}]));
 await who(seller);
 assert.equal((await db.query('select * from buyermatch_reports')).rows.length,0);
 assert.equal((await db.query('select * from buyermatch_imports')).rows.length,0);
 assert.equal((await db.query('select * from buyermatch_prospects')).rows.length,0);
 await assert.rejects(()=>approve(batch));
 await who(admin);await approve(batch);await approve(batch);
});
await test('seller sees reviewed metrics, no raw contacts, and no invented funnel activity',async()=>{
 await who(seller);
 const reports=(await db.query('select * from buyermatch_reports')).rows;
 assert.equal(reports.length,1);assert.equal(reports[0].metrics.discovered,1);assert.equal(reports[0].metrics.contacted,0);assert.equal(reports[0].metrics.responses,0);
 assert.ok(!JSON.stringify(reports).includes('private@example.test'));
 assert.equal((await db.query('select * from buyermatch_prospects')).rows.length,0);
});
await test('pause blocks import, resume requires operator activation',async()=>{
 await act('pause',{campaign_id:campaign.id});await who(admin);
 await assert.rejects(()=>stage('paused',[record]));
 await who(seller);await act('resume',{campaign_id:campaign.id});
 await who(admin);await assert.rejects(()=>stage('pending',[record]));
 await act('activate',{campaign_id:campaign.id,research_started:true});
});
await test('qualified activity does not invent replies or inquiries',async()=>{
 const qualified={...record,outreach_status:'qualified',updated_at:'2026-01-04T00:00:00Z',attempt_at:'2026-01-02T00:00:00Z',attempt_evidence:'reviewed communication log',outreach_channel:'email',permission_reference:'documented opt-in',qualified_at:'2026-01-03T00:00:00Z',qualified_evidence:'reviewed buying criteria'};
 await approve(await stage('qualified',[qualified]));
 const m=(await db.query('select metrics from buyermatch_reports order by published_at desc limit 1')).rows[0].metrics;
 assert.equal(m.discovered,1);assert.equal(m.contacted,1);assert.equal(m.qualified,1);assert.equal(m.responses,0);assert.equal(m.inquiries,0);
});
await test('opt-out is permanent and stale records cannot overwrite newer evidence',async()=>{
 await approve(await stage('optout',[{...record,outreach_status:'opted_out',updated_at:'2026-01-05T00:00:00Z'}]));
 await assert.rejects(()=>approve({id:id(999)}));
 const stale=await stage('stale',[record]);await assert.rejects(()=>approve(stale));
 const replay=await stage('unopt',[{...record,updated_at:'2026-01-06T00:00:00Z'}]);await assert.rejects(()=>approve(replay));
});
await test('expiration stops new activity and preserves historical reports',async()=>{
 await db.exec("reset role; update host_subscriptions set current_period_end=now()-interval '1 second'");
 await who(seller);assert.equal((await act('config')).entitled,false);
 assert.equal((await db.query('select status from buyermatch_campaigns')).rows[0].status,'paused');
 assert.ok((await db.query('select * from buyermatch_reports')).rows.length>0);
 await assert.rejects(()=>act('resume',{campaign_id:campaign.id}));
});
await test('canceled paid-through memberships retain eligibility, expired passes do not',async()=>{
 await db.exec("reset role; update host_subscriptions set status='canceled',current_period_end=now()+interval '1 day'");
 await who(seller);assert.equal((await act('config')).entitled,true);
});
await test('digest batching creates one email per campaign per day with exclusive leases',async()=>{
 await db.exec("reset role; update buyermatch_email_queue set next_attempt_at=now()-interval '1 second'");
 const queued=(await db.query('select * from buyermatch_email_queue')).rows;
 assert.equal(queued.length,1);
 const token=id(90);
 const claimed=(await db.query('select * from claim_buyermatch_emails($1)',[token])).rows;
 assert.equal(claimed.length,1);
 assert.equal((await db.query('select * from claim_buyermatch_emails($1)',[id(91)])).rows.length,0);
 await db.query('select finish_buyermatch_email($1,$2,null)',[claimed[0].id,id(91)]);
 assert.equal((await db.query('select delivered_at from buyermatch_email_queue')).rows[0].delivered_at,null);
 await db.query('select finish_buyermatch_email($1,$2,null)',[claimed[0].id,token]);
 assert.ok((await db.query('select delivered_at from buyermatch_email_queue')).rows[0].delivered_at);
});
await test('open campaign limit and unavailable listing checks are enforced',async()=>{
 await who(admin);await act('settings',{submissions_enabled:true,fulfillment_enabled:true,max_campaigns:1,workflow_reference:'Manual SOP'});
 await db.exec('reset role');
 await db.query("insert into listings(id,host_id,mode,status,title) values($1,$2,'sale','published','Second truck')",[id(6),seller]);
 await who(seller);await assert.rejects(()=>act('submit',{listing_id:id(6)}));
 await db.exec("reset role; update listings set unlisted=true");
 await who(seller);await assert.rejects(()=>act('resume',{campaign_id:campaign.id}));
});
await test('brief exports recheck availability and admin authorization',async()=>{
 await who(seller);await assert.rejects(()=>act('brief',{campaign_id:campaign.id}));
 await who(admin);await assert.rejects(()=>act('brief',{campaign_id:campaign.id}));
 await db.exec("reset role; update listings set unlisted=false");
 await who(seller);await act('resume',{campaign_id:campaign.id});
 await who(admin);await act('activate',{campaign_id:campaign.id,research_started:true});
 await db.exec("reset role; update listings set price_sale=12345 where id='"+listing+"'");
 await who(admin);const brief=await act('brief',{campaign_id:campaign.id});
 assert.equal(brief.listing.price_sale,12345);
 await act('settings',{submissions_enabled:true,fulfillment_enabled:false,max_campaigns:1,workflow_reference:'Manual SOP'});
 assert.equal((await db.query('select status from buyermatch_campaigns')).rows[0].status,'paused');
 await assert.rejects(()=>act('brief',{campaign_id:campaign.id}));
});
console.log(tests+' BuyerMatch security and workflow tests passed');
await db.close();
