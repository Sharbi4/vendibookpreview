// Execute real migrations in isolated PostgreSQL/WASM, without production records.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { beforeAll, afterAll, expect, it } from 'vitest';
let db: PGlite;
const host='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const admin='33333333-3333-4333-8333-333333333333';
const rental='44444444-4444-4444-8444-444444444444';
const sale='55555555-5555-4555-8555-555555555555';
async function asUser(id: string) { await db.query("select set_config('test.uid',$1,false)",[id]); }
async function action(name: string,payload: unknown) {
 const result=await db.query<{value:any}>('select public.buyermatch_action($1,$2::jsonb) value',[name,JSON.stringify(payload)]);
 return result.rows[0].value;
}
beforeAll(async()=>{
 db=new PGlite({fsBundle:new NodeBlob([readFileSync('node_modules/@electric-sql/pglite/dist/pglite.data')]) as unknown as Blob});
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key);
 insert into auth.users values('${host}'),('${other}'),('${admin}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.has_role(uuid,text) returns boolean language sql stable as $$select $1='${admin}'::uuid and $2='admin'$$;
 create table listings(id uuid primary key,host_id uuid,title text,mode text,status text,deleted_at timestamptz,unlisted boolean,category text,make text,model text,price_sale numeric,price_daily numeric,price_hourly numeric,price_weekly numeric,price_monthly numeric,city text,state text,cover_image_url text,image_urls text[],description text,highlights text[],included_items text,condition text);
 create table sale_invoices(listing_id uuid,status text);
 create table host_subscriptions(user_id uuid,tier text,status text,current_period_end timestamptz);
 create table monetization_products(id uuid,slug text,metadata jsonb,description text);
 create table monetization_purchases(user_id uuid,product_id uuid,status text,fulfillment_status text,access_ends_at timestamptz);
 create table notifications(user_id uuid,type text,title text,message text,link text);
 insert into host_subscriptions values('${host}','vendibook_pro','active',now()+interval '1 month'),('${other}','vendibook_pro','active',now()+interval '1 month');
 insert into listings(id,host_id,title,mode,status,price_daily) values('${rental}','${host}','Kitchen','rent','published',125);
 insert into listings(id,host_id,title,mode,status,price_sale) values('${sale}','${host}','Truck','sale','published',50000);`);
 await db.exec(readFileSync('supabase/migrations/20261012230000_buyermatch_foundation.sql','utf8'));
 await db.exec(readFileSync('supabase/migrations/20261024190000_buyermatch_rentals.sql','utf8'));
},60000);
afterAll(async()=>{await db?.close();});
it('accepts a host rental, records its rate and keeps it pending review',async()=>{
 await asUser(host);
 const c=await action('submit',{listing_id:rental});
 expect(c).toMatchObject({status:'pending_activation',listing_snapshot:{mode:'rent',price_daily:125}});
 await db.query('select public.buyermatch_pause_ineligible()');
 expect((await db.query<{status:string}>('select status from buyermatch_campaigns where id=$1',[c.id])).rows[0].status).toBe('pending_activation');
});
it('retains owner, membership, campaign review and private-evidence restrictions',async()=>{
 await asUser(other);
 await expect(action('submit',{listing_id:rental})).rejects.toThrow('Choose your published');
 await asUser(host);
 const c=await action('submit',{listing_id:rental});
 await expect(action('activate',{campaign_id:c.id,research_started:true})).rejects.toThrow('Administrator required');
 await db.exec(`update host_subscriptions set current_period_end=now()-interval '1 day' where user_id='${host}'`);
 await expect(action('submit',{listing_id:sale})).rejects.toThrow('active Pro entitlement');
 await db.exec(`update host_subscriptions set current_period_end=now()+interval '1 month' where user_id='${host}'`);
 const grants=await db.query<{private_read:boolean,anon_rpc:boolean}>("select has_table_privilege('anon','buyermatch_prospects','SELECT') private_read,has_function_privilege('anon','buyermatch_action(text,jsonb)','EXECUTE') anon_rpc");
 expect(grants.rows[0]).toEqual({private_read:false,anon_rpc:false});
});
it('keeps sold sales ineligible and pauses withdrawn rentals',async()=>{
 await asUser(host);
 await db.exec(`insert into sale_invoices values('${sale}','paid')`);
 await expect(action('submit',{listing_id:sale})).rejects.toThrow('Reserved or sold');
 await db.exec(`update listings set status='paused' where id='${rental}'`);
 await db.query('select public.buyermatch_pause_ineligible()');
 expect((await db.query<{status:string}>('select status from buyermatch_campaigns where listing_id=$1',[rental])).rows[0].status).toBe('paused');
});
