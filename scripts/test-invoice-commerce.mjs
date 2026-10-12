// Isolated PostgreSQL execution, never a connection to production.
// Install @electric-sql/pglite locally, or point PGLITE_MODULE at its ESM entry.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create function public.has_role(uuid,text) returns boolean language sql as $$ select $1='00000000-0000-4000-8000-000000000004'::uuid $$;
create table public.profiles(id uuid primary key,business_name text,full_name text);
create table public.listings(id uuid primary key,host_id uuid,status text,mode text,freight_payer text,title text);
create table public.sale_transactions(id uuid primary key,listing_id uuid,buyer_id uuid,seller_id uuid,status text,terms_id uuid,amount numeric,delivery_fee numeric,freight_cost numeric,fulfillment_type text,delivery_address text,delivery_instructions text,buyer_name text,buyer_email text,fee_rate_pct numeric,platform_fee numeric,seller_payout numeric,tax_amount numeric,tax_source text,tax_jurisdiction text);
create table public.offers(id uuid primary key,buyer_id uuid,seller_id uuid,listing_id uuid,status text,agreed_amount numeric);
create table public.notifications(id uuid default gen_random_uuid(),user_id uuid,type text,title text,message text,link text);
`);
await db.exec(await readFile('supabase/migrations/20261012014545_invoice_commerce_foundation.sql','utf8'));
await db.exec(await readFile('supabase/migrations/20261012170000_invoice_live_validation.sql','utf8'));
await db.exec("alter table listings add column accept_cash_payment boolean, add column accept_paypal_checkout boolean");
await db.exec(await readFile('supabase/migrations/20261012180000_retire_new_cash_sales.sql','utf8'));
await db.exec(await readFile('supabase/migrations/20261012200000_commerce_email_delivery.sql','utf8'));
await db.exec(await readFile('supabase/migrations/20261012160000_invoice_request_bridge.sql','utf8'));
await db.exec(await readFile('supabase/migrations/20261012210000_invoice_request_retry_safety.sql','utf8'));
await db.exec(await readFile('supabase/migrations/20261012220000_invoice_snapshot_protection.sql','utf8'));
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const buyer=id(1), seller=id(2), other=id(3), admin=id(4), listing=id(5), sale=id(6), sale2=id(7);
const query=(sql,params=[])=>db.query(sql,params);
for(const u of [buyer,seller,other,admin])await query('insert into auth.users values($1)',[u]);
await query('insert into profiles values($1,$2,$2)',[seller,'Legal Seller LLC']);
await query("insert into listings(id,host_id,status,mode,freight_payer,title) values($1,$2,'published','sale','seller','Truck')",[listing,seller]);
for(const [s,b] of [[sale,buyer],[sale2,other]]) await query("insert into sale_transactions(id,listing_id,buyer_id,seller_id,status,terms_id,amount,delivery_fee,freight_cost,fulfillment_type,buyer_name,buyer_email,fee_rate_pct) values($1,$2,$3,$4,'pending',$5,5000,200,900,'vendibook_freight','Buyer','buyer@example.com',8.7)",[s,listing,b,seller,s===sale?id(8):id(9)]);
await query("update sale_transactions set invoice_required=true");
const offer=id(91);
await query("insert into offers values($1,$2,$3,$4,'accepted',5000)",[offer,buyer,seller,listing]);
await query("update sale_transactions set source_offer_id=$1 where id=$2",[offer,sale]);
let count=0;
const test=async(name,fn)=>{await fn(); count++; console.log('PASS '+name);};
const submit=(s,b,ack=true)=>query('select commerce_submit_request($1,$2,$3,$4) as id',[s,b,'purchase-request-2026-10-11',ack]);
await test('new cash transactions are rejected',()=>assert.rejects(query("insert into sale_transactions(id,status) values($1,'pending_cash')",[id(90)]),/Cash sales are retired/));
await test('manipulated listing flags normalize to invoice payment',async()=>{
  await query("update listings set accept_cash_payment=true,accept_paypal_checkout=false where id=$1",[listing]);
  assert.deepEqual((await query("select accept_cash_payment,accept_paypal_checkout from listings where id=$1",[listing])).rows[0],{accept_cash_payment:false,accept_paypal_checkout:true});
});
await test('disabled rollout rejects requests',()=>assert.rejects(submit(sale,buyer),/not activated/));
await test('null legal review cannot activate rollout',()=>assert.rejects(query('update commerce_rollout set requests_enabled=true,enabled_at=now()'),/check constraint/));
await query("update commerce_rollout set requests_enabled=true,enabled_at=now(),legal_review_reference='TEST ONLY'");
await test('acknowledgment cannot be bypassed',()=>assert.rejects(submit(sale,buyer,false),/acknowledgment/));
await test('unrelated buyer cannot request sale',()=>assert.rejects(submit(sale,other),/Not authorized/));
const request=(await submit(sale,buyer)).rows[0].id;
const request2=(await submit(sale2,other)).rows[0].id;
await test('request retry preserves one record and notifications',async()=>{assert.equal((await submit(sale,buyer)).rows[0].id,request); assert.equal((await query('select count(*)::int n from notifications')).rows[0].n,4);});
const action=(r,actor,act,revision=1,proposal=null)=>query('select commerce_request_action($1,$2,$3,$4,$5) as result',[r,actor,act,revision,proposal]);
await test('buyer cannot self-approve',()=>assert.rejects(action(request,buyer,'approve'),/Action not allowed/));
await test('no invented tax on invoice',()=>assert.rejects(action(request,seller,'approve'),/tax determination/));
const review=(r,actor=admin,rev=1)=>query('select commerce_review_tax($1,$2,$3,0,$4,$5,$6,$7)',[r,actor,rev,'Documented jurisdiction','not_taxable','equipment','TEST EXEMPTION']);
await test('seller cannot approve their own tax',()=>assert.rejects(review(request,seller),/Administrator/));
await review(request);await review(request2);
const invoice=(await action(request,seller,'approve')).rows[0].result.invoice_id;
await test('repeat approval creates no duplicate invoice',async()=>{assert.equal((await action(request,seller,'approve')).rows[0].result.invoice_id,invoice);assert.equal((await query('select count(*)::int n from sale_invoices')).rows[0].n,1);});
await test('another buyer cannot reserve the same equipment',()=>assert.rejects(action(request2,seller,'approve'),/reserved/));
await test('seller-covered freight is zero on buyer invoice',async()=>{const i=(await query('select * from sale_invoices where id=$1',[invoice])).rows[0];assert.equal(Number(i.freight_cents),0);assert.equal(Number(i.total_cents),520000);assert.equal(i.fee_snapshot.fee_cents,43500);});
await test('live payment gate requires live evidence',()=>assert.rejects(query('update commerce_rollout set payments_enabled=true'),/check constraint/));
await test('sandbox evidence cannot activate live payments',()=>assert.rejects(query("update commerce_rollout set payments_enabled=true,sandbox_validation_reference='TEST ONLY'"),/check constraint/));
await test('blank live evidence cannot activate payments',()=>assert.rejects(query("update commerce_rollout set payments_enabled=true,live_validation_reference='   '"),/check constraint/));
await query("update commerce_rollout set payments_enabled=true,live_validation_reference='TEST ONLY: non-charging readiness'");
await test('live evidence cannot activate sandbox payments',()=>assert.rejects(query("update commerce_rollout set payment_environment='sandbox',sandbox_validation_reference=null"),/check constraint/));
await test('invoice payment ownership enforced',()=>assert.rejects(query('select commerce_claim_invoice($1,$2)',[sale,other]),/Not authorized/));
await query('select commerce_claim_invoice($1,$2)',[sale,buyer]);
await test('in-flight payment cannot release reservation',async()=>{await assert.rejects(query('select commerce_cancel_invoice($1,$2)',[invoice,buyer]),/reconciliation/);await assert.rejects(query("update sale_invoices set due_at=now()-interval '1 day'"),/immutable/);await query('select commerce_expire_unpaid()');assert.equal((await query('select status from sale_invoices')).rows[0].status,'payment_processing');});
await test('unrelated users cannot read invoice data',async()=>{await query("select set_config('test.uid',$1,false)",[other]);await db.exec('set role authenticated');assert.equal((await query('select * from sale_invoices')).rows.length,0);await assert.rejects(query('select commerce_claim_invoice($1,$2)',[sale,buyer]),/permission denied/);await db.exec('reset role');});
await test('public badge reveals only listing status',async()=>{await db.exec('set role anon');const r=(await query('select * from equipment_reservation_status($1)',[[listing]])).rows;assert.deepEqual(r,[{listing_id:listing,status:'payment_pending'}]);await db.exec('reset role');});
await test('pending invoice intent is unique and cancelled requests release it',async()=>{
 await assert.rejects(query("insert into sale_transactions(id,listing_id,buyer_id,status,invoice_required) values($1,$2,$3,'pending',true)",[id(92),listing,other]),/unique constraint/);
 await action(request2,other,'cancel');
 assert.equal((await query('select status from sale_transactions where id=$1',[sale2])).rows[0].status,'cancelled');
 await query("insert into sale_transactions(id,listing_id,buyer_id,status,invoice_required) values($1,$2,$3,'pending',true)",[id(92),listing,other]);
});
await test('commerce email leases prevent duplicate work and retain failed sends',async()=>{
 const token=id(80),retry=id(81);
 const claimed=(await query('select * from claim_commerce_emails($1)',[token])).rows;
 assert.ok(claimed.length>0);
 assert.equal((await query('select * from claim_commerce_emails($1)',[retry])).rows.length,0);
 const event=claimed[0].id;
 await query('select finish_commerce_email($1,$2,null)',[event,retry]);
 assert.equal((await query('select email_sent_at from commerce_events where id=$1',[event])).rows[0].email_sent_at,null);
 await query("select finish_commerce_email($1,$2,'temporary failure')",[event,token]);
 assert.equal((await query('select * from claim_commerce_emails($1)',[retry])).rows.length,0);
 await query("update commerce_events set email_next_attempt_at=now()-interval '1 minute' where id=$1",[event]);
 assert.equal((await query('select * from claim_commerce_emails($1)',[retry])).rows.length,1);
 await query('select finish_commerce_email($1,$2,null)',[event,retry]);
 assert.ok((await query('select email_sent_at from commerce_events where id=$1',[event])).rows[0].email_sent_at);
 await db.exec('set role authenticated');
 await assert.rejects(query('select * from claim_commerce_emails($1)',[token]),/permission denied/);
 await db.exec('reset role');
});
await test('issued invoice amounts, parties, terms and due date cannot be rewritten',async()=>{
 for(const sql of ["equipment_cents=equipment_cents+1,total_cents=total_cents+1","fee_snapshot='{}'","tax_snapshot='{}'","seller_snapshot='{}'","buyer_snapshot='{}'","terms_snapshot='{}'","due_at=due_at+interval '1 day'","seller_id=buyer_id"]){
  await assert.rejects(query('update sale_invoices set '+sql+' where id=$1',[invoice]),/immutable/);
 }
});
await test('sale cannot diverge from the issued invoice',async()=>{
 for(const sql of ["amount=amount+1","platform_fee=0","seller_payout=0","tax_amount=1","tax_source='estimate'","tax_jurisdiction='elsewhere'","buyer_email='changed@example.com'","delivery_instructions='changed'"]){
  await assert.rejects(query('update sale_transactions set '+sql+' where id=$1',[sale]),/invoice|purchase|Purchase/);
 }
});
await test('purchased source offer preserves lifecycle updates but cannot seed a new sale',async()=>{
 await query("update offers set status='purchased' where id=$1",[offer]);
 await query("update sale_transactions set status='paid' where id=$1",[sale]);
 assert.equal((await query('select status from sale_transactions where id=$1',[sale])).rows[0].status,'paid');
 await assert.rejects(query("insert into sale_transactions(id,listing_id,buyer_id,seller_id,status,amount,source_offer_id) values($1,$2,$3,$4,'pending',5000,$5)",[id(93),listing,buyer,seller,offer]),/Accepted offer/);
});
await test('verified capture identity cannot be replaced',async()=>{
 await query("update sale_invoices set paypal_capture_id='TEST-CAPTURE',paid_at=now(),auto_disbursement_at=now()+interval '28 days' where id=$1",[invoice]);
 await assert.rejects(query("update sale_invoices set paypal_capture_id='OTHER-CAPTURE' where id=$1",[invoice]),/immutable/);
 await assert.rejects(query("update sale_invoices set auto_disbursement_at=auto_disbursement_at+interval '1 day' where id=$1",[invoice]),/immutable/);
});
await db.close();
console.log(`${count} database checks passed`);
