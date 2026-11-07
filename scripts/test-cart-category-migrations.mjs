import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
await db.exec(`CREATE TYPE listing_category AS ENUM ('food_truck','food_trailer','ghost_kitchen','vendor_space','vendor_lot'); CREATE TYPE listing_status AS ENUM ('draft','published','archived');`);
await db.exec(readFileSync('supabase/migrations/20261106180000_carts_equipment_category.sql','utf8'));
await db.exec(`CREATE TABLE listings(id uuid PRIMARY KEY,category listing_category,subcategory text,title text,status listing_status,deleted_at timestamptz,price numeric,host_id text);
INSERT INTO listings VALUES
('86efe80b-2581-47a8-a836-769364460aa6','food_truck',NULL,'Charcuterie cart','published',NULL,500,'original-owner'),
('00000000-0000-0000-0000-000000000001','food_trailer',NULL,'Trailer with included cart','published',NULL,50000,'other-owner'),
('00000000-0000-0000-0000-000000000002','food_truck',NULL,'Archived sample cart','archived',NULL,100,'sample-owner');`);
const migration=readFileSync('supabase/migrations/20261106180100_reclassify_verified_charcuterie_cart.sql','utf8');
await db.exec(migration);
const row=(await db.query("SELECT * FROM listings WHERE title='Charcuterie cart'")).rows[0];
assert.equal(row.category,'food_cart');assert.equal(row.subcategory,'food_cart');assert.equal(row.status,'published');assert.equal(row.price,'500');assert.equal(row.host_id,'original-owner');
assert.equal((await db.query("SELECT category FROM listings WHERE title='Trailer with included cart'")).rows[0].category,'food_trailer');
assert.equal((await db.query("SELECT category FROM listings WHERE title='Archived sample cart'")).rows[0].category,'food_truck');
await db.exec(migration);
assert.equal((await db.query("SELECT count(*)::int AS n FROM listings WHERE category='food_cart'")).rows[0].n,1);
await db.exec(readFileSync('supabase/migrations/20261106180000_carts_equipment_category.sql','utf8'));
console.log('Cart enum and targeted reclassification passed: repeat safe; owner, price, publication and non-target listings preserved.');
await db.close();
