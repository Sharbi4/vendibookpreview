import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role;
create table profiles(id uuid primary key,account_suspended boolean default false);
create table host_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid,tier text,status text,current_period_start timestamptz,current_period_end timestamptz,created_at timestamptz default now());
create table listings(id uuid primary key default gen_random_uuid(),host_id uuid,title text default 'Test truck',status text default 'draft',published_at timestamptz,deleted_at timestamptz,unlisted boolean default false,moderation_status text default 'clear',featured_enabled boolean default false,featured_at timestamptz,featured_expires_at timestamptz,featured_source text);
create table monetization_products(id uuid primary key default gen_random_uuid(),slug text,promo_type text,duration_days int);
create table monetization_purchases(id uuid primary key default gen_random_uuid(),user_id uuid,product_id uuid,listing_id uuid,amount_cents int,currency text,status text,fulfillment_status text,idempotency_key text unique,payment_provider text,access_starts_at timestamptz,access_ends_at timestamptz,metadata jsonb);
create table pro_boost_credits(id uuid primary key default gen_random_uuid(),user_id uuid,subscription_id uuid,period_start timestamptz,period_end timestamptz,source text,status text default 'available',used_at timestamptz,listing_id uuid,purchase_id uuid,metadata jsonb default '{}',unique(user_id,period_start));
create table listing_promotions(listing_id uuid,product_id uuid,purchase_id uuid,promo_type text,starts_at timestamptz,ends_at timestamptz check(ends_at>starts_at),active boolean);
create unique index promo_unique on listing_promotions(listing_id,promo_type) where active=true;
create table notifications(user_id uuid,type text,title text,message text,link text);
create table sold(listing_id uuid);
create function featured_listing_sold(uuid) returns boolean language sql as $$select exists(select 1 from sold where listing_id=$1)$$;
insert into monetization_products(slug,promo_type,duration_days) values('boost-featured-30','featured_30',30);
`);
await db.exec(readFileSync('supabase/migrations/20261030180000_auto_pro_featured.sql','utf8'));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const q=async(s,a=[])=>(await db.query(s,a)).rows;
const count=async(t)=>(await q(`select count(*)::int n from ${t}`))[0].n;
let n=0;const test=async(name,fn)=>{await db.exec('begin');try{await fn();console.log('PASS '+name);n++;}finally{await db.exec('rollback');}};
const member=async(status='active',tier='pro')=>q("insert into host_subscriptions(user_id,tier,status,current_period_end) values($1,$2,$3,now()+interval '1 month') returning id",[id(1),tier,status]);
const listing=async(extra='')=>q(`insert into listings(host_id,status,published_at ${extra?',unlisted':''}) values($1,'published',now() ${extra?','+extra:''}) returning *`,[id(1)]);
await test('paid activation features listing and records a zero-charge fulfilled boost',async()=>{
 await listing();await member();assert.equal((await q('select featured_enabled from listings'))[0].featured_enabled,true);
 const p=(await q('select * from monetization_purchases'))[0];assert.equal(p.amount_cents,0);assert.equal(p.fulfillment_status,'active');
 assert.equal((await q('select status from pro_boost_credits'))[0].status,'used');assert.equal(await count('notifications'),1);
});
await test('subscription before publish keeps drafts private then auto-features',async()=>{
 await member();await q('insert into listings(host_id) values($1)',[id(1)]);assert.equal(await count('monetization_purchases'),0);
 await q("update listings set status='published',published_at=now()");assert.equal(await count('monetization_purchases'),1);
});
await test('repeated provider sync and listing updates never consume twice',async()=>{
 await listing();await member();await q('update host_subscriptions set current_period_end=current_period_end');await q('update listings set status=status');
 assert.equal(await count('monetization_purchases'),1);assert.equal(await count('pro_boost_credits'),1);
});
await test('one credit features only one of multiple listings',async()=>{
 await listing();await listing();await member();assert.equal((await q('select count(*)::int n from listings where featured_enabled'))[0].n,1);
});
await test('hidden, moderated, sold, and suspended listings do not activate',async()=>{
 await listing('true');await listing();await q("update listings set moderation_status='pending_review' where not unlisted");
 const [l]=await listing();await q('insert into sold values($1)',[l.id]);await member();assert.equal(await count('monetization_purchases'),0);
 await q('insert into profiles values($1,true)',[id(1)]);await listing();assert.equal(await count('monetization_purchases'),0);
});
await test('Free, unpaid and expired subscriptions do not grant boosts',async()=>{
 await listing();await member('active','free');await member('incomplete');await member('past_due');assert.equal(await count('pro_boost_credits'),0);
 await q("insert into host_subscriptions(user_id,tier,status,current_period_end) values($1,'pro','active',now()-interval '1 day')",[id(1)]);assert.equal(await count('pro_boost_credits'),0);
});
await test('existing fully covered Featured placement preserves unused credit',async()=>{
 await listing();await q("update listings set featured_enabled=true,featured_expires_at=now()+interval '31 days'");await member();
 assert.equal(await count('monetization_purchases'),0);assert.equal((await q('select status from pro_boost_credits'))[0].status,'available');
});
await test('renewal with missing Square start grants only the next period credit',async()=>{
 await listing();await member();await q("update listings set featured_expires_at=now()-interval '1 second'");
 await q("update host_subscriptions set current_period_end=current_period_end+interval '1 month'");
 assert.equal(await count('monetization_purchases'),2);
 assert.equal(await count('pro_boost_credits'),2);await q('update host_subscriptions set current_period_end=current_period_end');assert.equal(await count('pro_boost_credits'),2);
});
await test('annual aliases and moderation release use the same included benefit',async()=>{
 await listing();await q("update listings set moderation_status='pending_review'");await member('active','vendibook_pro_annual');
 assert.equal(await count('monetization_purchases'),0);await q("update listings set moderation_status='clear'");
 assert.equal(await count('monetization_purchases'),1);
});
await test('failed fulfillment rolls back credit and subscription activation together',async()=>{
 await listing();await q('delete from monetization_products');await db.exec('savepoint missing');
 await assert.rejects(()=>member(),/not configured/);await db.exec('rollback to savepoint missing');assert.equal(await count('pro_boost_credits'),0);assert.equal(await count('host_subscriptions'),0);
});
await test('anonymous and authenticated callers cannot invoke privileged activation',async()=>{
 for(const role of ['anon','authenticated']){await db.exec(`savepoint acl; set local role ${role}`);await assert.rejects(()=>q('select activate_pro_featured($1)',[id(1)]),/permission denied/);await db.exec('rollback to savepoint acl');}
});
console.log(`${n} database scenarios passed`);await db.close();
