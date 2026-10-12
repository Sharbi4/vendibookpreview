// Runs only against the disposable PostgreSQL service created by GitHub Actions.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {default:pg}=await import(process.env.PG_MODULE);
const config={host:'127.0.0.1',port:5432,user:'postgres',password:'postgres',database:'offer_tests'};
const admin=new pg.Client(config); await admin.connect();
await admin.query(`
create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql as $$ select current_setting('role') $$;
grant usage on schema auth to public;
create function public.account_access_active() returns boolean language sql as $$select true$$;
create function public.is_admin(uuid) returns boolean language sql as $$select false$$;
create table profiles(id uuid primary key,account_suspended boolean default false);
create table listings(id uuid primary key,host_id uuid,title text,mode text,status text,accepts_offers boolean,min_offer_amount numeric);
create function public.listing_purchase_state(uuid) returns jsonb language sql as $$ select jsonb_build_object('purchasable',exists(select 1 from listings where id=$1 and status='published')) $$;
create table offers(id uuid primary key default gen_random_uuid(),listing_id uuid,buyer_id uuid,seller_id uuid,offer_amount numeric,message text,status text default 'pending',created_at timestamptz default now(),expires_at timestamptz default now()+interval '48 hours',responded_at timestamptz,seller_response text,counter_amount numeric,counter_message text,counter_expires_at timestamptz);
alter table offers enable row level security;
grant select,insert,update,delete on offers to authenticated;
create policy participants on offers for select to authenticated using(auth.uid() in (buyer_id,seller_id));
create table sale_invoices(id uuid default gen_random_uuid(),listing_id uuid,status text);
create table notifications(user_id uuid,type text,title text,message text,link text);
`);
await admin.query(await readFile('supabase/migrations/20261012190000_offer_security_and_reservations.sql','utf8'));
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const buyer=id(1),seller=id(2),other=id(3);
for(const u of [buyer,seller,other])await admin.query('insert into profiles(id) values($1)',[u]);
const clients=[];
async function actor(uid){const c=new pg.Client(config);await c.connect();clients.push(c);await c.query('set role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);return c;}
const b1=await actor(buyer),b2=await actor(buyer),s1=await actor(seller),s2=await actor(seller),o=await actor(other);
let seq=100;
async function listing(){const l=id(seq++);await admin.query("insert into listings values($1,$2,'Equipment','sale','published',true,500)",[l,seller]);return l;}
const terms=(await admin.query('select * from offer_terms_current()')).rows[0];
const submit=(c,l,amount=800,ack=true)=>c.query('select submit_offer($1,$2,null,$3,$4,$5) id',[l,amount,terms.version,terms.body,ack]);
const respond=(c,offer,action,amount=null)=>c.query('select respond_to_offer($1,$2,$3) result',[offer,action,amount]);
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
async function race(l,tasks){
  await admin.query('begin');await admin.query('select 1 from listings where id=$1 for update',[l]);
  // Attach rejection handlers immediately, then confirm both sessions are blocked.
  const pending=tasks.map(fn=>fn().then(value=>({ok:true,value}),error=>({ok:false,error})));
  let waiting=0;
  for(let tries=0;tries<60;tries++){
    await admin.query("select pg_stat_clear_snapshot()");
    const r=await admin.query("select count(*)::int n from pg_stat_activity where datname='offer_tests' and wait_event_type='Lock' and pid<>pg_backend_pid()");
    waiting=r.rows[0].n;if(waiting>=2)break;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  await admin.query('commit');
  const results=await Promise.all(pending);
  assert.ok(waiting>=2,'both independent sessions reached the same locked listing');
  assert.equal(results.filter(r=>r.ok).length,1);
  assert.equal(results.filter(r=>!r.ok).length,1);
  assert.equal(results.find(r=>!r.ok).error.code,'23505','conflict rejected without deadlock or unrelated error');
  return results;
}
await test('missing consent and below-minimum or NaN amounts fail',async()=>{
 const l=await listing();await assert.rejects(submit(b1,l,800,false),/acknowledgment/);
 await assert.rejects(submit(b1,l,499),/minimum/);await assert.rejects(submit(b1,l,'NaN'),/valid/);
});
let agreed,negotiated;
await test('simultaneous duplicate submissions create one offer',async()=>{
 const l=await listing();await race(l,[()=>submit(b1,l),()=>submit(b2,l)]);
 assert.equal((await admin.query('select count(*)::int n from offers where listing_id=$1',[l])).rows[0].n,1);
});
await test('simultaneous competing acceptances agree one buyer',async()=>{
 const l=await listing();const a=(await submit(b1,l)).rows[0].id;const b=(await submit(o,l)).rows[0].id;
 await race(l,[()=>respond(s1,a,'accept'),()=>respond(s2,b,'accept')]);
 const rows=(await admin.query("select * from offers where listing_id=$1 and status='accepted'",[l])).rows;
 assert.equal(rows.length,1);agreed=rows[0].id;
});
await test('buyer cannot self-accept or write identity, amount or status directly',async()=>{
 const l=await listing();const a=(await submit(b1,l)).rows[0].id;
 await assert.rejects(respond(b1,a,'accept'),/no longer/);
 for(const assignment of ["buyer_id='"+other+"'","seller_id='"+other+"'","listing_id='"+id(999)+"'","offer_amount=1","status='accepted'"]){
   await assert.rejects(b1.query('update offers set '+assignment+' where id=$1',[a]),/permission denied/);
 }
 await assert.rejects(b1.query('delete from offers where id=$1',[a]),/permission denied/);
 await assert.rejects(b1.query("insert into offers(listing_id,buyer_id,seller_id,offer_amount) values($1,$2,$3,1)",[l,buyer,seller]),/permission denied/);
 assert.equal((await o.query('select * from offers where id=$1',[a])).rows.length,0);
 await assert.rejects(respond(o,a,'accept'),/not found/);
});
await test('counteroffer requires explicit buyer acceptance and rejects replay',async()=>{
 const l=await listing();const a=(await submit(b1,l)).rows[0].id;negotiated=a;
 assert.equal((await respond(s1,a,'counter',900)).rows[0].result,'counter_offer');
 await assert.rejects(respond(s1,a,'accept'),/no longer/);
 assert.equal((await respond(b1,a,'accept')).rows[0].result,'counter_accepted');
 await assert.rejects(respond(b1,a,'accept'),/no longer/);
 const row=(await admin.query('select agreed_amount,agreed_at from offers where id=$1',[a])).rows[0];
 assert.equal(Number(row.agreed_amount),900);assert.ok(row.agreed_at);
 const consent=(await admin.query('select * from offer_terms_acceptances where offer_id=$1',[a])).rows[0];
 assert.equal(consent.terms_text,terms.body);assert.equal(consent.terms_version,terms.version);assert.ok(consent.accepted_at);
});
await test('even privileged writes cannot alter mutual agreement',async()=>{
 for(const assignment of ["agreed_amount=1","counter_amount=1","agreed_at=now()+interval '1 day'","status='pending'"]){
   await assert.rejects(admin.query('update offers set '+assignment+' where id=$1',[negotiated]),/immutable/);
 }
});
await test('buyer can explicitly decline counteroffer',async()=>{
 const l=await listing(),a=(await submit(b1,l)).rows[0].id;
 await respond(s1,a,'counter',900);assert.equal((await respond(b1,a,'decline')).rows[0].result,'counter_declined');
});
await test('expired counter cannot be accepted even with a null deadline',async()=>{
 const l=await listing(),a=(await submit(b1,l)).rows[0].id;
 await respond(s1,a,'counter',900);
 await admin.query("update offers set counter_expires_at=null,responded_at=now()-interval '49 hours' where id=$1",[a]);
 assert.equal((await respond(b1,a,'accept')).rows[0].result,'expired');
});
await test('null legacy pending deadline expires and does not block a new offer',async()=>{
 const l=await listing(),a=(await submit(b1,l)).rows[0].id;
 await admin.query("update offers set expires_at=null,created_at=now()-interval '49 hours' where id=$1",[a]);
 assert.ok((await submit(b1,l)).rows[0].id);
 assert.equal((await respond(s1,a,'accept')).rows[0].result,'expired');
});
await test('invoice reservation blocks submission and acceptance, cancellation restores eligibility',async()=>{
 const l=await listing(),a=(await submit(b1,l)).rows[0].id;
 await admin.query("insert into sale_invoices(listing_id,status) values($1,'issued')",[l]);
 await assert.rejects(submit(o,l),/reserved/);await assert.rejects(respond(s1,a,'accept'),/reserved/);
 assert.equal((await b1.query('select sale_action_state($1) state',[l])).rows[0].state.can_request,false);
 await admin.query("update sale_invoices set status='cancelled' where listing_id=$1",[l]);
 assert.equal((await b1.query('select sale_action_state($1) state',[l])).rows[0].state.can_offer,true);
});
await test('seller opt-out blocks offers',async()=>{
 const l=await listing();await admin.query('update listings set accepts_offers=false where id=$1',[l]);
 await assert.rejects(submit(b1,l),/not accepting/);
 assert.equal((await b1.query('select sale_action_state($1) state',[l])).rows[0].state.can_offer,false);
});
await test('notification lease prevents simultaneous duplicate sends and failures retry',async()=>{
 const key=[negotiated,'counter_accepted'];const token=id(900),otherToken=id(901);
 assert.equal((await admin.query('select claim_offer_email($1,$2,$3) ok',[...key,token])).rows[0].ok,true);
 assert.equal((await admin.query('select claim_offer_email($1,$2,$3) ok',[...key,otherToken])).rows[0].ok,false);
 await admin.query("select finish_offer_email($1,$2,$3,'temporary failure')",[...key,token]);
 assert.equal((await admin.query('select claim_offer_email($1,$2,$3) ok',[...key,otherToken])).rows[0].ok,false);
 await admin.query("update offer_events set next_attempt_at=now()-interval '1 minute' where offer_id=$1 and event_type=$2",key);
 assert.equal((await admin.query('select claim_offer_email($1,$2,$3) ok',[...key,otherToken])).rows[0].ok,true);
 await admin.query('select finish_offer_email($1,$2,$3,null)',[...key,otherToken]);
 assert.equal((await admin.query('select claim_offer_email($1,$2,$3) ok',[...key,token])).rows[0].ok,false);
});
await Promise.all(clients.map(c=>c.end()));await admin.end();
console.log(passed+' PostgreSQL security and concurrency checks passed');
