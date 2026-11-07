import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { CATEGORY_LABELS, SUBCATEGORIES_BY_CATEGORY, AMENITIES_BY_CATEGORY, LISTING_TAGS, isMobileAsset, isStaticLocation } from '@/types/listing';
import { DEFAULT_DOCUMENTS_BY_CATEGORY } from '@/types/documents';
import { getCategoryBasics, isTitledAsset, getPhotoPrompts, requiresSaleDimensions } from './stages';
import { buildEquipmentSummary } from './publicSummary';
import { CATEGORY_OPTIONS, QUESTIONS, buildListingPayload } from '@/lib/vendi-listing/script';

describe('Carts & Equipment listing category',()=>{
 it('exposes carts in phone search and draft creation tool schemas',()=>{
  const tools=JSON.parse(readFileSync('docs/atlas/phone-agent-tools.json','utf8'));
  for(const name of ['search_listings','start_listing_draft']){
   const tool=tools.find((tool: {name:string})=>tool.name===name);
   expect(tool.api_schema.request_body_schema.properties.category.enum).toContain('food_cart');
  }
 });
 it('has complete category metadata and dessert equipment types',()=>{
  expect(CATEGORY_LABELS.food_cart).toBe('Carts & Equipment');
  expect(SUBCATEGORIES_BY_CATEGORY.food_cart.map(s=>s.value)).toContain('ice_cream_dessert');
  expect(AMENITIES_BY_CATEGORY.food_cart.flatMap(g=>g.items.map(i=>i.id))).toEqual(expect.arrayContaining(['downdraft_vent','fire_suppression']));
  expect(LISTING_TAGS.food_cart.general).toContain('Standalone Equipment');
  expect(DEFAULT_DOCUMENTS_BY_CATEGORY.food_cart).toEqual([]);
 });
 it('uses equipment dimensions and operational readiness without a title or vehicle year',()=>{
  expect(getCategoryBasics('food_cart')).toEqual({modelYear:false,kitchenBuildYear:false,dimensions:true,titled:false,readiness:'operational'});
  expect(isTitledAsset('food_cart','sale')).toBe(false);
  expect(requiresSaleDimensions('sale','food_cart')).toBe(true);
  expect(isMobileAsset('food_cart')).toBe(true);
  expect(isStaticLocation('food_cart')).toBe(false);
  expect(getPhotoPrompts('food_cart')[0]).toContain('standalone equipment');
  const rows=buildEquipmentSummary({category:'food_cart',mode:'sale',values:{},confirmedSections:[],ownershipPublic:{title_summary:'Clear'}});
  expect(rows.some(row=>/title status|trailer year|vehicle year|kitchen build year/i.test(row.label))).toBe(false);
 });
 it('supports a real cart in the guided listing flow with pickup instead of on-site access',()=>{
  expect(CATEGORY_OPTIONS.some(o=>o.value==='food_cart')).toBe(true);
  const draft={category:'food_cart',mode:'sale'} as const;
  expect(QUESTIONS.find(q=>q.id==='title_status')?.when?.(draft)).toBe(false);
  const payload=buildListingPayload(draft,[]);
  expect(payload.category).toBe('food_cart');
  expect(payload.fulfillment_type).toBe('pickup');
 });
 it('accepts carts in the actual draft request schema while rejecting unknown categories',()=>{
  const source=readFileSync('supabase/functions/create-listing-draft/index.ts','utf8');
  const schema=new Function('z',source.slice(source.indexOf('const BodySchema'),source.indexOf('const json'))+';return BodySchema;')(z);
  expect(schema.safeParse({mode:'sale',category:'food_cart'}).success).toBe(true);
  expect(schema.safeParse({mode:'rent',category:'food_cart'}).success).toBe(true);
  expect(schema.safeParse({mode:'sale',category:'unknown_equipment'}).success).toBe(false);
 });
});
