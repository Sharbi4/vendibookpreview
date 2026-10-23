import { describe,it,expect } from 'vitest';
import { cookingIntent,matchCookingEquipment,normalizeAtlasState } from '@/lib/atlas/atlasEquipment';
describe('equipment-based cooking fit',()=>{
 it('matches a generic kitchen with a flat top for tacos without a taco keyword',()=>{
  const intent=cookingIntent('taco truck')!;
  expect(matchCookingEquipment({title:'Mobile kitchen',amenities:['flat_top_griddle']},intent)).toMatchObject({status:'potential_equipment_match'});
  expect(matchCookingEquipment({title:'Taco truck'},intent)).toMatchObject({status:'equipment_unconfirmed',cooking:[]});
  expect(intent.optional).toContain('fryer');
 });
 it('does not invent equipment from negations, planned space, or a missing description',()=>{
  const intent=cookingIntent('tacos')!;
  for(const description of ['No griddle included','Space for a flat top','Needs a grill','Griddle not working','Room for grill','No grill or griddle'])
    expect(matchCookingEquipment({description},intent).cooking,description).toEqual([]);
  expect(matchCookingEquipment({description:'No fryer. Includes a working grill.'},intent).cooking).toContain('grill');
 });
 it('uses fryer equipment for fried menus and keeps griddles optional',()=>{
  const intent=cookingIntent('fry truck for churros')!;
  expect(matchCookingEquipment({amenities:['deep fryer','refrigerator']},intent).status).toBe('potential_equipment_match');
  expect(matchCookingEquipment({amenities:['griddle']},intent).status).toBe('equipment_unconfirmed');
 });
 it('normalizes state names without guessing unsupported places',()=>{
  expect(normalizeAtlasState(' Arizona ')).toBe('AZ');expect(normalizeAtlasState('tx')).toBe('TX');expect(normalizeAtlasState('Atlantis')).toBe('');
 });
});
