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
console.log(`${passed} progress access/audit cases passed`);await db.close();
