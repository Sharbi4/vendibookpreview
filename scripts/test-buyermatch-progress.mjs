import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const q = async (sql, args=[]) => (await db.query(sql,args)).rows;
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated;
create function has_role(uuid,text) returns boolean language sql stable as $$select $1='${id(1)}'::uuid and $2='admin'$$;
create table buyermatch_campaigns(id uuid primary key,seller_id uuid,status text default 'pending_activation',updated_at timestamptz default now());
alter table buyermatch_campaigns enable row level security;
grant select on buyermatch_campaigns to authenticated;
create policy owner on buyermatch_campaigns for select to authenticated using(seller_id=auth.uid() or has_role(auth.uid(),'admin'));
insert into buyermatch_campaigns(id,seller_id) values('${id(10)}','${id(2)}'),('${id(11)}','${id(3)}');
`);
await db.exec(readFileSync('supabase/migrations/20261030190000_buyermatch_progress.sql','utf8'));
await db.exec(readFileSync('supabase/migrations/20261030230000_buyermatch_status_reports.sql','utf8'));
const asUser=async n=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id(n)]);await db.exec('set role authenticated');};
const next='2099-01-01T00:00:00Z';
let passed=0;
const test=async(name,fn)=>{await db.exec('reset role; begin');try{await fn();console.log('PASS '+name);passed++;}finally{await db.exec('rollback; reset role');}};
const publish=(steps={community_access:'in_progress'},key='one',when=null)=>q("select publish_buyermatch_progress($1,$2,$3::jsonb,coalesce($4::timestamptz,now()+interval '30 minutes'),$5) id",[id(10),key,JSON.stringify(steps),when,'Owner-reported preparation; approvals not confirmed']);
await test('owner can read safe report but not private source or actor',async()=>{
 await asUser(1);await publish();await asUser(2);
 const rows=await q('select id,campaign_id,steps,created_at,next_update_at from buyermatch_progress_updates');assert.equal(rows.length,1);
 assert.equal(rows[0].steps.community_access,'in_progress');
 await db.exec('savepoint private');await assert.rejects(()=>q('select evidence_reference from buyermatch_progress_updates'),/permission denied/);await db.exec('rollback to savepoint private');
 await assert.rejects(()=>q('select recorded_by from buyermatch_progress_updates'),/permission denied/);
});
await test('other sellers cannot read a report',async()=>{await asUser(1);await publish();await asUser(3);assert.equal((await q('select id from buyermatch_progress_updates')).length,0);});
await test('members cannot publish or directly insert reports',async()=>{
 await asUser(2);await db.exec('savepoint rpc');await assert.rejects(()=>publish(),/Administrator required/);await db.exec('rollback to savepoint rpc');
 await assert.rejects(()=>q('insert into buyermatch_progress_updates default values'),/permission denied/);
});
await test('anonymous role has no report access',async()=>{await db.exec('set role anon');await assert.rejects(()=>q('select id from buyermatch_progress_updates'),/permission denied/);});
await test('operator retry is idempotent and does not activate campaign',async()=>{
 await asUser(1);const a=await publish();const b=await publish();assert.equal(a[0].id,b[0].id);
 assert.equal((await q('select id from buyermatch_progress_updates')).length,1);
 assert.equal((await q('select status from buyermatch_campaigns where id=$1',[id(10)]))[0].status,'pending_activation');
});
await test('reusing a key with changed content fails',async()=>{await asUser(1);await publish();await assert.rejects(()=>publish({priority:'complete'}),/different content/);});
for(const steps of [{'Private group name':'complete'},{priority:'Jane Smith'},{priority:null},{priority:{name:'secret'}},{}]) {
 await test('rejects arbitrary or empty payload '+JSON.stringify(steps),async()=>{await asUser(1);await assert.rejects(()=>publish(steps),/Unsupported progress step|Progress steps required/);});
}
await test('rejects misleading expected time beyond allowed horizon',async()=>{await asUser(1);await assert.rejects(()=>publish({},'future',next),/Progress steps required/);await db.exec('rollback; begin');await asUser(1);await assert.rejects(()=>publish({review:'planned'},'future',next),/next seven days/);});
const report={period_start:'2026-01-01T12:00:00Z',period_end:'2026-01-01T12:30:00Z',placements_as_of:'2026-01-01T11:30:00Z',posts_live:6,posts_pending:5,posts_review:1,marketplace_pending:1,prospects_under_review:1,drafts_pending:3,new_prospects:0,new_replies:0,new_conversions:0,discovery_paused:true,follow_up_held:true,new_draft_prepared:true};
const statusReport=(data=report)=>q("select publish_buyermatch_status_report($1,'status-one',$2::jsonb,now()+interval '30 minutes','Owner-pasted Muse report') id",[id(10),JSON.stringify(data)]);
await test('status report is owner-readable, idempotent and does not change campaign state',async()=>{
 await asUser(1);const a=await statusReport();const b=await statusReport();assert.equal(a[0].id,b[0].id);
 await asUser(2);assert.deepEqual((await q('select report from buyermatch_progress_updates'))[0].report,report);
 assert.equal((await q('select status from buyermatch_campaigns'))[0].status,'pending_activation');
});
await test('status report cannot be written by a subscriber',async()=>{await asUser(2);await assert.rejects(()=>statusReport(),/Administrator required/);});
await test('status report stays hidden from another subscriber',async()=>{await asUser(1);await statusReport();await asUser(3);assert.equal((await q('select report from buyermatch_progress_updates')).length,0);});
for(const change of [{lead_name:'Private Person'},{posts_live:'six'},{posts_live:-1},{posts_live:1.5},{new_replies:null},{discovery_paused:'yes'},{period_end:'2099-01-01T12:00:00Z'},{period_end:'2026-01-01T12:00:00Z secret'},{placements_as_of:'2026-01-01T13:00:00Z'}]) {
 await test('rejects unsafe or inconsistent status report '+JSON.stringify(change),async()=>{await asUser(1);await assert.rejects(()=>statusReport({...report,...change}),/approved public fields|nonnegative integers|status must be boolean|Report time|elapsed activity/);});
}
await test('cannot overwrite a published report under the same key',async()=>{await asUser(1);await statusReport();await assert.rejects(()=>statusReport({...report,posts_live:99}),/different report/);});
console.log(`${passed} progress access/audit cases passed`);await db.close();
