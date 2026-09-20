import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const host='11111111-1111-4111-8111-111111111111';
const renter='22222222-2222-4222-8222-222222222222';
const listing='33333333-3333-4333-8333-333333333333';
await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'service_role'::text $$;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"email":"renter@example.com"}'::jsonb $$;
 CREATE TABLE listings(id uuid primary key,host_id uuid,instant_book boolean,total_slots integer,category text,
  price_daily numeric,price_weekly numeric,price_monthly numeric,price_hourly numeric,delivery_fee numeric,deposit_amount numeric);
 CREATE FUNCTION is_seller_identity_verified(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${host}'::uuid $$;
 CREATE TABLE booking_requests(id uuid primary key, listing_id uuid,host_id uuid,shopper_id uuid,status text default 'pending',
  payment_status text default 'unpaid',deposit_status text,hold_status text,host_confirmed_at timestamptz,payment_intent_id text,
  is_instant_book boolean, start_date date,end_date date,start_time text,end_time text,duration_hours numeric,is_hourly_booking boolean,
  hourly_slots jsonb,slot_number integer,slot_name text,fulfillment_selected text,delivery_address text,delivery_instructions text,
  total_price numeric,deposit_amount numeric,delivery_fee_snapshot numeric,business_info jsonb);
 CREATE TABLE payment_records(id uuid primary key,booking_request_id uuid,buyer_id uuid,payment_status text,fee_breakdown jsonb);
 CREATE TABLE notifications(id serial,user_id uuid);
 CREATE FUNCTION secure_booking_request_financials() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
 INSERT INTO listings VALUES('${listing}','${host}',true,3,'vendor_space',100,500,1500,25,20,50);
`);
await db.exec(await readFile(new URL('../../supabase/migrations/20260919180000_rental_checkout_integrity.sql',import.meta.url),'utf8'));
await db.exec(`CREATE TRIGGER test_insert_flow BEFORE INSERT ON booking_requests FOR EACH ROW EXECUTE FUNCTION guard_booking_requests_insert()`);
let seq=0;
async function booking(instant=false, owner=host) {
 const id=`44444444-4444-4444-8444-${String(++seq).padStart(12,'0')}`;
 await db.query(`INSERT INTO booking_requests(id,listing_id,host_id,shopper_id,is_instant_book,start_date,end_date,fulfillment_selected,slot_number,total_price,renter_snapshot)
 VALUES($1,$2,$3,$4,$5,'2026-09-22','2026-09-23','pickup',1,999,$6)`,[id,listing,owner,renter,instant,
 {first_name:'Jane',last_name:'Doe',phone_number:'5205551113',address1:'1 Main',city:'Tucson',state:'AZ',zip_code:'85714'}]);
 return id;
}
async function payment(b) {
 const id=`55555555-5555-4555-8555-${String(++seq).padStart(12,'0')}`;
 await db.query(`INSERT INTO payment_records SELECT $1,id,shopper_id,'created',jsonb_build_object('rental_fingerprint',rental_checkout_fingerprint(to_jsonb(b))) FROM booking_requests b WHERE id=$2`,[id,b]);
 return id;
}
const claim=p=>db.query('SELECT claim_rental_capture($1)',[p]);
await test('server persists request override; normal requests cannot capture before approval',async()=>{
 const b=await booking(false); const p=await payment(b);
 assert.equal((await db.query('SELECT is_instant_book FROM booking_requests WHERE id=$1',[b])).rows[0].is_instant_book,false);
 await assert.rejects(claim(p),/approve/);
 await db.query("UPDATE booking_requests SET status='approved' WHERE id=$1",[b]);
 await claim(p); await claim(p);
});
await test('unverified instant host is persisted as a request',async()=>{
 const unverified='66666666-6666-4666-8666-666666666666';
 await db.query('UPDATE listings SET host_id=$1 WHERE id=$2',[unverified,listing]);
 const b=await booking(true,unverified);
 assert.equal((await db.query('SELECT is_instant_book FROM booking_requests WHERE id=$1',[b])).rows[0].is_instant_book,false);
 await assert.rejects(claim(await payment(b)),/approve/);
 await db.query('UPDATE listings SET host_id=$1 WHERE id=$2',[host,listing]);
});
await test('true Instant Book captures, and same-total edits invalidate existing orders',async()=>{
 const b=await booking(true); const stale=await payment(b);
 await db.query("UPDATE booking_requests SET start_date='2026-09-24',end_date='2026-09-25' WHERE id=$1",[b]);
 await assert.rejects(claim(stale),/Booking changed/);
 const fresh=await payment(b); await claim(fresh);
 await assert.rejects(db.query("UPDATE booking_requests SET slot_number=2 WHERE id=$1",[b]),/locked/);
});
await test('competing orders serialize; retries of the winning order remain idempotent',async()=>{
 const b=await booking(true); const p1=await payment(b); const p2=await payment(b);
 const outcomes=await Promise.allSettled([claim(p1),claim(p2)]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 const winner=outcomes[0].status==='fulfilled'?p1:p2; await claim(winner);
 await db.query("UPDATE payment_records SET payment_status='completed' WHERE id=$1",[winner]);
 await db.query("UPDATE booking_requests SET payment_status='paid' WHERE id=$1",[b]);
 await claim(winner); await assert.rejects(claim(winner===p1?p2:p1),/already paid/);
});
await test('same-price fulfillment/address/space/contact edits change the fingerprint',async()=>{
 const b=await booking(true); const p=await payment(b);
 await db.query("UPDATE booking_requests SET slot_number=2 WHERE id=$1",[b]);
 await assert.rejects(claim(p),/Booking changed/);
 const p2=await payment(b);
 await db.query("UPDATE booking_requests SET renter_snapshot=jsonb_set(renter_snapshot,'{address1}','\"2 Main\"') WHERE id=$1",[b]);
 await assert.rejects(claim(p2),/Booking changed/);
 await assert.rejects(db.query("UPDATE booking_requests SET fulfillment_selected='delivery',delivery_address='' WHERE id=$1",[b]),/Delivery address/);
});
await test('contact snapshot and financial quote are transaction-owned',async()=>{
 const b=await booking(false);
 const row=(await db.query('SELECT renter_snapshot,total_price FROM booking_requests WHERE id=$1',[b])).rows[0];
 assert.equal(row.renter_snapshot.first_name,'Jane'); assert.equal(Number(row.total_price),225.80);
 assert.equal((await db.query('SELECT rental_period_subtotal(3,null,null,1500) AS total')).rows[0].total,'1500');
});
await test('duplicate booking notifications are rejected atomically',async()=>{
 await db.query('INSERT INTO notifications(user_id,booking_event_key) VALUES($1,$2)',[renter,'booking:paid']);
 await assert.rejects(db.query('INSERT INTO notifications(user_id,booking_event_key) VALUES($1,$2)',[renter,'booking:paid']),/unique/);
});
await test('self booking is blocked',async()=>{await assert.rejects(booking(true,renter),/own listing/);});
await test('hourly total uses actual unique slots, not client duration', async()=>{
 const b=await booking(false);
 await db.query(`UPDATE booking_requests SET is_hourly_booking=true,duration_hours=1,hourly_slots=$2 WHERE id=$1`,[b,[{date:'2026-09-22',slots:['09:00','10:00']}]]);
 const row=(await db.query('SELECT duration_hours,total_price FROM booking_requests WHERE id=$1',[b])).rows[0];
 assert.equal(Number(row.duration_hours),2); assert.equal(Number(row.total_price),56.45);
 await assert.rejects(db.query('UPDATE booking_requests SET hourly_slots=$2 WHERE id=$1',[b,[{date:'2026-09-24',slots:['09:00']}]]),/dates/);
 await assert.rejects(db.query('UPDATE booking_requests SET hourly_slots=$2 WHERE id=$1',[b,[{date:'2026-09-22',slots:['09:00','09:00']}]]),/duplicate/);
});
await db.close();
