import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { Blob as NodeBlob } from 'node:buffer';
import { beforeAll,afterAll,it,expect } from 'vitest';
import { relayDisplayName,relayVisible,relayBody,relayEmailContent } from '../../../supabase/functions/_shared/managedRelayPolicy';
let db:PGlite;
const seller='11111111-1111-4111-8111-111111111111', listing='22222222-2222-4222-8222-222222222222';
async function query(sql:string,args:any[]=[]){return (await db.query<any>(sql,args)).rows;}
async function lead(){return (await query(`insert into listing_leads(listing_id,host_id,name,email,message,source) values($1,$2,'Sean Coe','guest@example.invalid','Please share a walkthrough.','guest_inquiry') returning id`,[listing,seller]))[0].id;}
async function message(id:string){return (await query('select m.* from managed_inquiry_messages m join managed_inquiries t on t.id=m.inquiry_id where t.source_lead_id=$1',[id]))[0];}
beforeAll(async()=>{
 db=new PGlite({fsBundle:new NodeBlob([readFileSync('node_modules/@electric-sql/pglite/dist/pglite.data')]) as unknown as Blob});
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key);insert into auth.users values('${seller}');
 create function auth.uid() returns uuid language sql as $$select '${seller}'::uuid$$;
 create function is_admin(uuid) returns boolean language sql as $$select false$$;
 create function message_account_active(uuid) returns boolean language sql as $$select true$$;
 create function is_listing_publicly_visible(uuid) returns boolean language sql as $$select true$$;
 create function message_content_problem(text,boolean) returns text language sql as $$select case when $1 like '%@%' then 'contact' else null end$$;
 create table listings(id uuid primary key,host_id uuid);insert into listings values('${listing}','${seller}');
 create table listing_leads(id uuid primary key default gen_random_uuid(),listing_id uuid,host_id uuid,name text,email text,message text,source text,created_at timestamptz default now());
 alter table listing_leads enable row level security;grant select on listing_leads to authenticated;
 create policy "Hosts can view their listing leads" on listing_leads for select using(auth.uid()=host_id);
 create table notifications(id uuid default gen_random_uuid(),user_id uuid,type text,title text,message text,link text);
 `);
 for(const f of ['20261024170000_managed_inquiries.sql','20261025193000_managed_relay_review_gate.sql'])await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
},30000);
afterAll(async()=>await db?.close());
it('holds new guest leads without notifying seller and imports once',async()=>{
 const id=await lead(),m=await message(id);expect(m.held).toBe(true);expect(m.sent_at).toBeNull();
 expect(await query('select * from notifications')).toHaveLength(0);
 await query('select import_managed_lead($1)',[id]);expect(await query('select * from managed_inquiries where source_lead_id=$1',[id])).toHaveLength(1);
});
it('seller cannot read raw contact or call privileged release',async()=>{
 await db.exec('set role authenticated');
 try{expect(await query('select * from listing_leads')).toHaveLength(0);
 await expect(query('select * from managed_inquiries')).rejects.toThrow('permission denied');
 await expect(query('select reserve_managed_relay(gen_random_uuid(),\'x\',\'review\')')).rejects.toThrow('permission denied');
 }finally{await db.exec('reset role');}
});
it('reservation keeps messages private; confirmed send publishes exactly once',async()=>{
 const m=await message(await lead());
 await expect(query('select complete_managed_relay($1,$2)',[m.id,'fixture-delivery'])).rejects.toThrow('reservation');
 await expect(query('select reserve_managed_relay($1,$2,$3)',[m.id,'name@example.invalid','operator'])).rejects.toThrow('private contact');
 await expect(query('select reserve_managed_relay($1,null,$2)',[m.id,'operator'])).rejects.toThrow('required');
 await query('select reserve_managed_relay($1,$2,$3)',[m.id,'Approved walkthrough question','operator']);
 expect((await query('select held,sent_at,body,released_body from managed_inquiry_messages where id=$1',[m.id]))[0]).toEqual({held:true,sent_at:null,body:'Please share a walkthrough.',released_body:'Approved walkthrough question'});
 expect((await query('select reserve_managed_relay($1,$2,$3) r',[m.id,'Changed','operator']))[0].r.status).toBe('send_in_progress');
 await query('select complete_managed_relay($1,$2)',[m.id,'fixture-delivery']);
 await query('select complete_managed_relay($1,$2)',[m.id,'fixture-delivery']);
 expect(await query('select * from notifications where link=$1',['/inquiries/'+m.inquiry_id])).toHaveLength(1);
 expect((await query('select held from managed_inquiry_messages where id=$1',[m.id]))[0].held).toBe(false);
});
it('email replies are held, deduplicated, and cannot move to another thread',async()=>{
 const a=await message(await lead()),b=await message(await lead());
 const args=[a.inquiry_id,'seller','I can share a video.','resend:test-reply'];
 const first=(await query('select ingest_managed_reply($1,$2,$3,$4) id',args))[0].id;
 expect((await query('select ingest_managed_reply($1,$2,$3,$4) id',args))[0].id).toBe(first);
 expect((await query('select held,sent_at from managed_inquiry_messages where id=$1',[first]))[0]).toEqual({held:true,sent_at:null});
 await expect(query('select ingest_managed_reply($1,$2,$3,$4)',[b.inquiry_id,...args.slice(1)])).rejects.toThrow('another participant');
});
it('approved guest reply is included directly and uses the guest private return address',()=>{
 const email=relayEmailContent('guest','Lionel Y.','Yes, that day is available.','thread-fixture','guest-key');
 expect(email.text.split('\n\n')[1]).toBe('Yes, that day is available.');
 expect(email.props.paragraphs[0]).toBe('Yes, that day is available.');
 expect(email.props.ctaUrl).toBeUndefined();
 expect(email.replyTo).toBe('relay-guest-key@updates.vendibook.com');
});
it('guest email replies enter the private review queue without participant delivery',async()=>{
 const a=await message(await lead());
 const id=(await query('select ingest_managed_reply($1,$2,$3,$4) id',[a.inquiry_id,'guest','Thank you, I would like October 29.','resend:guest-reply-fixture']))[0].id;
 const m=(await query('select * from managed_inquiry_messages where id=$1',[id]))[0];
 expect(m.held).toBe(true);expect(m.sent_at).toBeNull();
 expect(relayVisible(m,'seller')).toBe(false);
});
it('participant visibility and display never expose raw released content',()=>{
 expect(relayDisplayName('Sean Coe')).toBe('Sean C.');
 expect(relayVisible({sender_role:'guest'},'seller')).toBe(false);
 expect(relayVisible({sender_role:'seller'},'seller')).toBe(true);
 expect(relayVisible({sender_role:'guest',sent_at:'now'},'seller')).toBe(true);
 expect(relayVisible({sender_role:'support',recipient_role:'guest',sent_at:'now'},'seller')).toBe(false);
 expect(relayBody({body:'secret@example.invalid',released_body:'Reviewed question',sent_at:'now'},false)).toBe('Reviewed question');
 expect(relayBody({body:'secret@example.invalid'},false)).not.toContain('@');
});
