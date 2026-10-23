import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_TEST_MODULE || '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated;
    create table profiles(id uuid primary key,account_suspended boolean);
    create table listings(id uuid primary key,host_id uuid,title text,description text,cover_image_url text,image_urls text[],
     price_sale numeric,category text,city text,state text,condition text,updated_at timestamptz,latitude double precision,longitude double precision,
     status text,published_at timestamptz,deleted_at timestamptz,moderation_status text,unlisted boolean,mode text);
    insert into profiles values('00000000-0000-0000-0000-000000000001',false),('00000000-0000-0000-0000-000000000002',true);
    insert into listings(id,host_id,title,category,city,state,latitude,longitude,status,published_at,moderation_status,unlisted,mode,updated_at,image_urls)
    select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000001',
     'Kitchen '||n,'food_truck','Houston','TX',29.7604+n*.01,-95.3698,'published',now(),'clear',false,'sale',now(),array['photo.jpg']
    from generate_series(1,16) n;
    update listings set unlisted=true where title='Kitchen 2';
    update listings set host_id='00000000-0000-0000-0000-000000000002' where title='Kitchen 3';
    update listings set title='QA kitchen' where title='Kitchen 4';
    update listings set mode='rent' where title='Kitchen 5';
    update listings set deleted_at=now() where title='Kitchen 6';
    update listings set moderation_status='review' where title='Kitchen 7';
    update listings set status='draft' where title='Kitchen 8';
    update listings set published_at=null where title='Kitchen 9';`);
  await db.exec(readFileSync('supabase/migrations/20261023010000_buyer_city_inventory.sql', 'utf8'));
  const query = async (lat=29.7604,lng=-95.3698,city='Houston',state='TX',stateName='Texas',cities=[]) =>
    (await db.query('select buyer_city_inventory($1,$2,$3,$4,$5,$6,$7) result',[lat,lng,city,state,stateName,'food_truck',cities])).rows[0].result;
  await db.exec('set role anon');
  let result = await query();
  assert.equal(result.listings.length,8);
  assert.equal(result.local_count,8);
  assert.equal(result.listings[0].title,'Kitchen 1');
  assert.equal(result.listings[0].cover_image_url,'photo.jpg');
  assert.equal(result.listings[0].condition,null);
  for (const row of result.listings) for (const field of ['host_id','latitude','longitude','address','email']) assert.equal(field in row,false);
  await assert.rejects(() => query(200),/Invalid market/);
  await assert.rejects(() => query(null),/Invalid market/);
  await db.exec(`reset role;
    update listings set title='Kitchen 4',unlisted=false,host_id='00000000-0000-0000-0000-000000000001',mode='sale',deleted_at=null,
     moderation_status='clear',status='published',published_at=now() where title in ('Kitchen 2','Kitchen 3','QA kitchen','Kitchen 5','Kitchen 6','Kitchen 7','Kitchen 8','Kitchen 9');
    update listings set title='Missing coordinates',latitude=null,longitude=null where id='00000000-0000-0000-0000-000000000001';
    set role anon;`);
  result=await query();
  assert.equal(result.listings.length,10);
  assert.equal(result.local_count,16);
  assert.ok(!result.listings.some(l => l.title==='Missing coordinates'));
  assert.ok(result.listings.every((r,i,rows) => i===0 || r.distance_miles>=rows[i-1].distance_miles));
  // A newly published closer listing displaces the furthest without changing page code.
  await db.exec(`reset role; update listings set latitude=29.7604,longitude=-95.3698,title='New closest truck' where id='00000000-0000-0000-0000-000000000016'; set role anon;`);
  assert.equal((await query()).listings[0].title,'New closest truck');
  const miami=await query(25.7617,-80.1918,'Miami','FL','Florida');
  assert.equal(miami.local_count,0);
  assert.ok(miami.listings.every(l=>l.is_local===false));
  await db.exec(`reset role; update listings set city='Pensacola',state='Florida',latitude=30.4213,longitude=-87.2169 where title='New closest truck'; set role anon;`);
  const north=await query(30.3322,-81.6557,'North Florida','FL','Florida',['Pensacola']);
  assert.equal(north.local_count,1);
  assert.equal(north.listings[0].city,'Pensacola');
  console.log('PASS: public projection, exclusions, exact ten cap, distance sorting, inventory growth, region matches and invalid input.');
} catch (error) { console.error(error.message); process.exitCode=1; }
finally { await db.close(); }
