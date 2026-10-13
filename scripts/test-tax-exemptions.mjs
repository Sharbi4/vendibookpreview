// Tax-exemption certificates: instant on upload, owner-only access, admin review/revoke.
// Isolated PostgreSQL (PGlite), never a connection to production.
// Run: PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-tax-exemptions.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const buyer = id(1), other = id(2), admin = id(3);
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create function auth.role() returns text language sql as $$ select nullif(current_setting('test.role',true),'') $$;
create table public.user_roles(user_id uuid, role text);
create function public.has_role(uuid,text) returns boolean language sql security definer as $$ select exists(select 1 from public.user_roles where user_id=$1 and role=$2) $$;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
create table public.booking_requests(id uuid primary key);
create table public.square_billing_attempts(id uuid primary key);
create table public.monetization_purchases(id uuid primary key);
grant usage on schema public, auth, storage to authenticated;
grant execute on all functions in schema auth, public, storage to authenticated;
grant select on public.user_roles to authenticated;
`);
await db.exec(await readFile('supabase/migrations/20261013200000_tax_exemptions.sql', 'utf8'));
await db.exec('grant select, insert on storage.objects to authenticated');
for (const u of [buyer, other, admin]) await db.query('insert into auth.users values($1)', [u]);
await db.query("insert into user_roles values($1,'admin')", [admin]);

const as = async (uid, fn) => {
  await db.exec(`set role authenticated; select set_config('test.uid','${uid}',false), set_config('test.role','authenticated',false);`);
  try { return await fn(); } finally { await db.exec("reset role; select set_config('test.uid','',false);"); }
};
const q = (sql, p = []) => db.query(sql, p);
const file = (u, n = 'cert.pdf') => `${u}/${n}`;
const insert = (u, state = 'AZ', extra = {}) => q(
  "insert into tax_exemptions(user_id,state,exemption_type,entity_name,certificate_number,document_path,status) values($1,$2,'resale','Taco Trailer LLC','AZ-123456',$3,$4) returning id",
  [u, state, extra.path ?? file(u), extra.status ?? 'active']);
let count = 0;
const test = async (name, fn) => { await fn(); count++; console.log('PASS ' + name); };

let cert;
await test('a buyer can add an active certificate for their own account', async () => {
  cert = (await as(buyer, () => insert(buyer))).rows[0].id;
  assert.ok(cert);
});
await test('one active certificate per state', async () => {
  await assert.rejects(as(buyer, () => insert(buyer, 'AZ', { path: file(buyer, 'b.pdf') })));
  await as(buyer, () => insert(buyer, 'NV', { path: file(buyer, 'nv.pdf') }));
});
await test('a buyer cannot file for someone else or point at another user\'s file', async () => {
  await assert.rejects(as(buyer, () => insert(other, 'TX', { path: file(other) })));
  await assert.rejects(as(buyer, () => insert(buyer, 'TX', { path: file(other) })));
  await assert.rejects(as(buyer, () => insert(buyer, 'TX', { path: file(buyer, 'tx.pdf'), status: 'revoked' })));
});
await test('other buyers cannot see a certificate; admins can', async () => {
  assert.equal((await as(other, () => q('select id from tax_exemptions'))).rows.length, 0);
  assert.equal((await as(admin, () => q('select id from tax_exemptions'))).rows.length, 2);
});
await test('buyers cannot mark their own certificate reviewed or edit its details', async () => {
  await assert.rejects(as(buyer, () => q('update tax_exemptions set reviewed_at=now() where id=$1', [cert])));
  await assert.rejects(as(buyer, () => q("update tax_exemptions set certificate_number='X-1' where id=$1", [cert])));
});
await test('admins mark reviewed and the reviewer is recorded', async () => {
  await as(admin, () => q('update tax_exemptions set reviewed_at=now() where id=$1', [cert]));
  const r = (await q('select reviewed_by from tax_exemptions where id=$1', [cert])).rows[0];
  assert.equal(r.reviewed_by, admin);
});
await test('a buyer can withdraw, and a withdrawn certificate cannot be reactivated', async () => {
  await as(buyer, () => q("update tax_exemptions set status='revoked' where id=$1", [cert]));
  const r = (await q('select status, revoked_at, revoked_by from tax_exemptions where id=$1', [cert])).rows[0];
  assert.equal(r.status, 'revoked'); assert.ok(r.revoked_at); assert.equal(r.revoked_by, buyer);
  await assert.rejects(as(admin, () => q("update tax_exemptions set status='active' where id=$1", [cert])));
  await as(buyer, () => insert(buyer, 'AZ', { path: file(buyer, 'new.pdf') }));
});
await test('the certificate bucket is private and limited to the owner folder', async () => {
  const b = (await q("select public, file_size_limit from storage.buckets where id='tax-exemption-certificates'")).rows[0];
  assert.equal(b.public, false); assert.equal(Number(b.file_size_limit), 10485760);
  await as(buyer, () => q("insert into storage.objects(bucket_id,name) values('tax-exemption-certificates',$1)", [file(buyer, 'x.pdf')]));
  await assert.rejects(as(buyer, () => q("insert into storage.objects(bucket_id,name) values('tax-exemption-certificates',$1)", [file(other, 'x.pdf')])));
  assert.equal((await as(other, () => q("select name from storage.objects where bucket_id='tax-exemption-certificates'"))).rows.length, 0);
});
console.log(`${count} tax exemption checks passed`);
