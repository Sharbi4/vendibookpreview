import {describe,it,expect} from 'vitest';
import {parseNarrative} from '../../../supabase/functions/_shared/pricepilot/model';
describe('PricePilot AI output',()=>{
 it('rejects empty or malformed output so deterministic output remains available',()=>{
  for(const input of ['', 'not json','[]','null','{"headline":" ","summary":{}}'])expect(parseNarrative(input)).toBeNull();
 });
 it('keeps only renderable text and arrays',()=>{
  const r=parseNarrative(JSON.stringify({headline:'Estimate ready',summary:{invalid:true},drivers_positive:['Good condition',{},null,2],caveats:'not an array'}));
  expect(r?.summary).toBeUndefined();expect(r?.drivers_positive).toEqual(['Good condition']);expect(r?.caveats).toEqual([]);
 });
});
