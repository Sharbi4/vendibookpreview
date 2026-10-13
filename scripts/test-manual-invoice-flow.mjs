// Owner flow (2026-10-13): manual invoices and manual payout release.
// Isolated PostgreSQL (PGlite), never a connection to production.
// Run: PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-manual-invoice-flow.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const buyer = id(1), seller = id(2), other = id(3), admin = id(4), listing = id(5), sale = id(6), sale2 = id(7), listing2 = id(10), sale3 = id(11);
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create table public.user_roles(user_id uuid, role text);
create function public.has_role(uuid,text) returns boolean language sql as $$ select exists(select 1 from public.user_roles where user_id=$1 and role=$2) $$;
create table public.profiles(id uuid primary key,business_name text,full_name text);
create table public.listings(id uuid primary key,host_id uuid,status text,mode text,freight_payer text,title text);
create table public.sale_transactions(id uuid primary key,listing_id uuid,buyer_id uuid,seller_id uuid,status text,terms_id uuid,amount numeric,delivery_fee numeric,freight_cost numeric,fulfillment_type text,delivery_address text,delivery_instructions text,buyer_name text,buyer_email text,fee_rate_pct numeric,platform_fee numeric,seller_payout numeric,tax_amount numeric,tax_source text,tax_jurisdiction text);
create table public.offers(id uuid primary key,buyer_id uuid,seller_id uuid,listing_id uuid,status text,agreed_amount numeric);
create table public.notifications(id uuid default gen_random_uuid(),user_id uuid,type text,title text,message text,link text);
create table public.documents(id uuid primary key default gen_random_uuid(),transaction_id uuid,document_type text,status text,renter_signed_at timestamptz,host_signed_at timestamptz);
create table public.handoff_sessions(id uuid primary key default gen_random_uuid(),sale_transaction_id uuid);
create table public.handoff_media(id uuid primary key default gen_random_uuid(),handoff_session_id uuid,media_type text,storage_path text,byte_size bigint,created_at timestamptz default now());
`);
for (const f of ['20261012014545_invoice_commerce_foundation', '20261012170000_invoice_live_validation']) {
  await db.exec(await readFile(`supabase/migrations/${f}.sql`, 'utf8'));
}
await db.exec('alter table listings add column accept_cash_payment boolean, add column accept_paypal_checkout boolean');
for (const f of ['20261012180000_retire_new_cash_sales', '20261012200000_commerce_email_delivery', '20261012160000_invoice_request_bridge',
  '20261012210000_invoice_request_retry_safety', '20261012220000_invoice_snapshot_protection', '20261013180000_manual_invoice_owner_flow']) {
  await db.exec(await readFile(`supabase/migrations/${f}.sql`, 'utf8'));
}
const query = (sql, params = []) => db.query(sql, params);
for (const u of [buyer, seller, other, admin]) await query('insert into auth.users values($1)', [u]);
await query("insert into user_roles values($1,'admin')", [admin]);
await query('insert into profiles values($1,$2,$2)', [seller, 'Legal Seller LLC']);
for (const l of [listing, listing2]) await query("insert into listings(id,host_id,status,mode,freight_payer,title) values($1,$2,'published','sale','buyer','Truck')", [l, seller]);
for (const [s, b, l, t] of [[sale, buyer, listing, id(8)], [sale2, other, listing, id(9)], [sale3, other, listing2, id(12)]]) {
  await query("insert into sale_transactions(id,listing_id,buyer_id,seller_id,status,terms_id,amount,delivery_fee,freight_cost,fulfillment_type,buyer_name,buyer_email,fee_rate_pct,invoice_required) values($1,$2,$3,$4,'pending',$5,40000,500,0,'delivery','Buyer','buyer@example.com',8.7,true)", [s, l, b, seller, t]);
}
await query("update commerce_rollout set requests_enabled=true,enabled_at=now(),legal_review_reference='TEST ONLY'");

let count = 0;
const test = async (name, fn) => { await fn(); count++; console.log('PASS ' + name); };
const submit = (s, b) => query('select commerce_submit_request($1,$2,$3,true) as id', [s, b, 'purchase-request-2026-10-11']);
const action = (r, actor, act, revision = 1) => query('select commerce_request_action($1,$2,$3,$4,null) as result', [r, actor, act, revision]);
const events = async (type) => (await query('select recipient_id,event_key from commerce_events where event_type=$1 order by event_key', [type])).rows;
const recordInvoice = (r, actor, equipment = 4000000, opts = {}) => query(
  'select commerce_record_invoice_sent($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) as id',
  [r, actor, equipment, opts.delivery ?? 50000, 0, opts.tax ?? 0, opts.fee ?? 348000, opts.due ?? 7,
    opts.url ?? 'https://www.paypal.com/invoice/p/#TESTINVOICE', 'INV-TEST-1', 'Manual test invoice', opts.jurisdiction ?? null]);

const request = (await submit(sale, buyer)).rows[0].id;
const request2 = (await submit(sale2, other)).rows[0].id;

await test('new requests give the seller 14 days', async () => {
  const r = (await query("select extract(day from expires_at-created_at)::int d from sale_purchase_requests where id=$1", [request])).rows[0];
  assert.equal(r.d, 14);
});
await test('seller approval needs no tax review and issues no invoice', async () => {
  assert.equal((await action(request, seller, 'approve')).rows[0].result.status, 'approved');
  assert.equal((await query('select count(*)::int n from sale_invoices')).rows[0].n, 0);
  assert.equal((await query('select status from sale_purchase_requests where id=$1', [request])).rows[0].status, 'approved');
});
await test('approval alerts admin to send the invoice and tells the buyer Payment Pending', async () => {
  const admins = await events('invoice_requested');
  assert.deepEqual(admins.map(e => e.recipient_id), [admin]);
  assert.match(admins[0].event_key, /^invoice-requested:.+:admin:/);
  const buyerEvent = (await query("select title from commerce_events where event_type='purchase_approved' and recipient_id=$1", [buyer])).rows[0];
  assert.equal(buyerEvent.title, 'Payment Pending');
});
await test('repeat approval is idempotent', async () => {
  await action(request, seller, 'approve');
  assert.equal((await events('invoice_requested')).length, 1);
});
await test('approval reserves the equipment against a second buyer', async () => {
  await assert.rejects(action(request2, seller, 'approve'), /reserved/);
  const r = (await query('select * from equipment_reservation_status($1)', [[listing]])).rows;
  assert.deepEqual(r, [{ listing_id: listing, status: 'payment_pending' }]);
});
await test('only admin can record the invoice', () => assert.rejects(recordInvoice(request, seller), /Administrator/));
await test('invoice price must match the accepted price', () => assert.rejects(recordInvoice(request, admin, 3900000), /accepted price/));
await test('invoice fee cannot exceed the equipment price', () => assert.rejects(recordInvoice(request, admin, 4000000, { fee: 4000001 }), /valid invoice amounts/));
await test('payment link must be https', () => assert.rejects(recordInvoice(request, admin, 4000000, { url: 'http://pay.example' }), /https/));
let invoice;
await test('admin records the manual invoice; buyer gets Pay Invoice', async () => {
  invoice = (await recordInvoice(request, admin, 4000000, { tax: 120000, jurisdiction: 'AZ' })).rows[0].id;
  const i = (await query('select * from sale_invoices where id=$1', [invoice])).rows[0];
  assert.equal(i.invoice_method, 'manual');
  assert.equal(Number(i.total_cents), 4000000 + 50000 + 120000);
  assert.equal(i.fee_snapshot.fee_cents, 348000);
  assert.equal(i.external_invoice_url, 'https://www.paypal.com/invoice/p/#TESTINVOICE');
  const s = (await query('select amount,platform_fee,seller_payout,tax_amount,tax_source,tax_jurisdiction from sale_transactions where id=$1', [sale])).rows[0];
  assert.deepEqual({ ...s, amount: Number(s.amount), platform_fee: Number(s.platform_fee), seller_payout: Number(s.seller_payout), tax_amount: Number(s.tax_amount) },
    { amount: 40000, platform_fee: 3480, seller_payout: 36520, tax_amount: 1200, tax_source: 'reviewed_invoice', tax_jurisdiction: 'AZ' });
  const pay = (await query("select title,link from commerce_events where event_type='invoice_issued' and recipient_id=$1", [buyer])).rows[0];
  assert.deepEqual(pay, { title: 'Pay Invoice', link: '/invoices/' + invoice });
});
await test('a request cannot be invoiced twice', () => assert.rejects(recordInvoice(request, admin), /already has an invoice/));
await test('overdue manual invoices alert admin and are never auto-expired', async () => {
  await db.exec('alter table sale_invoices disable trigger guard_issued_invoice_snapshot');
  await query("update sale_invoices set due_at=now()-interval '1 day' where id=$1", [invoice]);
  await db.exec('alter table sale_invoices enable trigger guard_issued_invoice_snapshot');
  await query('select commerce_expire_unpaid()');
  await query('select commerce_expire_unpaid()');
  assert.equal((await query('select status from sale_invoices where id=$1', [invoice])).rows[0].status, 'issued');
  assert.equal((await events('invoice_overdue')).length, 1);
});
await test('only admin can record a payment, and a reference is required', async () => {
  await assert.rejects(query('select commerce_record_payment($1,$2,$3)', [invoice, buyer, 'X']), /Administrator/);
  await assert.rejects(query('select commerce_record_payment($1,$2,$3)', [invoice, admin, '  ']), /reference/);
});
await test('recording payment holds funds and marks the sale paid', async () => {
  await query('select commerce_record_payment($1,$2,$3)', [invoice, admin, 'PAYPAL-TXN-TEST']);
  await query('select commerce_record_payment($1,$2,$3)', [invoice, admin, 'PAYPAL-TXN-TEST']);
  const i = (await query('select status,disbursement_status,payment_reference from sale_invoices where id=$1', [invoice])).rows[0];
  assert.deepEqual(i, { status: 'paid', disbursement_status: 'held', payment_reference: 'PAYPAL-TXN-TEST' });
  assert.equal((await query('select status from sale_transactions where id=$1', [sale])).rows[0].status, 'paid');
  assert.equal((await query("select title from commerce_events where event_type='payment_received' and recipient_id=$1", [buyer])).rows[0].title, 'Sale Pending');
  assert.equal((await query('select * from equipment_reservation_status($1)', [[listing]])).rows[0].status, 'sale_pending');
});
await test('release is refused before confirmation, signatures and walkthrough', async () => {
  await assert.rejects(query('select commerce_record_release($1,$2,$3)', [invoice, admin, 'PAYOUT-1']), /Release conditions/);
  assert.equal((await events('payout_ready')).length, 0);
});
await test('signatures and walkthrough alone do not trigger release without buyer confirmation', async () => {
  const session = (await query('insert into handoff_sessions(sale_transaction_id) values($1) returning id', [sale])).rows[0].id;
  await query("insert into handoff_media(handoff_session_id,media_type,storage_path,byte_size) values($1,'video','walkthroughs/test.mp4',1000)", [session]);
  await query("insert into documents(transaction_id,document_type,status) values($1,'purchase_sale_agreement','sent')", [sale]);
  await query("update documents set status='completed',renter_signed_at=now(),host_signed_at=now() where transaction_id=$1", [sale]);
  await query('select commerce_expire_unpaid()');
  assert.equal((await events('payout_ready')).length, 0);
});
await test('buyer confirmation completes the conditions and alerts admin to release', async () => {
  await query("update sale_transactions set status='buyer_confirmed' where id=$1", [sale]);
  const ready = await events('payout_ready');
  assert.deepEqual(ready.map(e => e.recipient_id), [admin]);
  assert.equal((await query('select disbursement_status from sale_invoices where id=$1', [invoice])).rows[0].disbursement_status, 'release_requested');
  await query('select commerce_expire_unpaid()');
  assert.equal((await events('payout_ready')).length, 1);
});
await test('only admin releases, with a reference, exactly once', async () => {
  await assert.rejects(query('select commerce_record_release($1,$2,$3)', [invoice, seller, 'X']), /Administrator/);
  await assert.rejects(query('select commerce_record_release($1,$2,$3)', [invoice, admin, '']), /reference/);
  await query('select commerce_record_release($1,$2,$3)', [invoice, admin, 'PAYOUT-1']);
  await query('select commerce_record_release($1,$2,$3)', [invoice, admin, 'PAYOUT-2']);
  const i = (await query('select status,disbursement_status,release_reference from sale_invoices where id=$1', [invoice])).rows[0];
  assert.deepEqual(i, { status: 'completed', disbursement_status: 'released', release_reference: 'PAYOUT-1' });
  assert.equal((await events('payout_released')).length, 1);
});
await test('seller gets reminders and the request expires after 14 days with notices', async () => {
  const r3 = (await submit(sale3, other)).rows[0].id;
  await query("update sale_purchase_requests set created_at=now()-interval '13 days', expires_at=now()+interval '1 day' where id=$1", [r3]);
  await query('select commerce_expire_unpaid()');
  await query('select commerce_expire_unpaid()');
  const keys = (await events('purchase_reminder')).map(e => e.event_key.split(':').pop()).sort();
  assert.deepEqual(keys, ['d2', 'd7', 'final']);
  await query("update sale_purchase_requests set expires_at=now()-interval '1 minute' where id=$1", [r3]);
  await query('select commerce_expire_unpaid()');
  assert.equal((await query('select status from sale_purchase_requests where id=$1', [r3])).rows[0].status, 'expired');
  assert.equal((await query('select status from sale_transactions where id=$1', [sale3])).rows[0].status, 'cancelled');
  assert.equal((await events('purchase_expired')).length, 2);
});
await test('admin can cancel an approved request before payment and the equipment frees up', async () => {
  await query("update listings set status='published' where id=$1", [listing2]);
  await query("insert into sale_transactions(id,listing_id,buyer_id,seller_id,status,terms_id,amount,delivery_fee,freight_cost,fulfillment_type,buyer_name,buyer_email,fee_rate_pct,invoice_required) values($1,$2,$3,$4,'pending',$5,1000,0,0,'pickup','Buyer','b@example.com',8.7,true)", [id(20), listing2, buyer, seller, id(21)]);
  const r = (await submit(id(20), buyer)).rows[0].id;
  await action(r, seller, 'approve');
  await assert.rejects(query('select commerce_admin_cancel($1,$2,$3)', [r, seller, 'x']), /Administrator/);
  await query('select commerce_admin_cancel($1,$2,$3)', [r, admin, 'Buyer asked to cancel']);
  assert.equal((await query('select status from sale_purchase_requests where id=$1', [r])).rows[0].status, 'cancelled');
  assert.equal((await query('select * from equipment_reservation_status($1)', [[listing2]])).rows.length, 0);
});
await test('browser roles cannot call the admin functions', async () => {
  await db.exec('set role authenticated');
  await assert.rejects(query('select commerce_record_payment($1,$2,$3)', [invoice, admin, 'X']), /permission denied/);
  await assert.rejects(query('select commerce_record_release($1,$2,$3)', [invoice, admin, 'X']), /permission denied/);
  await db.exec('reset role');
});
await db.close();
console.log(`${count} manual invoice flow checks passed`);
