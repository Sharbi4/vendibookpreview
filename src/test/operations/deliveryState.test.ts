import {describe,it,expect} from 'vitest';
import {coordinate,deliveryState,decodeRoute} from '@/lib/operations/deliveryState';
import type {FulfillmentSession} from '@/hooks/useHandoff';
const now=Date.parse('2026-10-22T18:00:00Z');
const session={id:'one',status:'en_route',tracking_active:true,last_latitude:32.2,last_longitude:-110.9,last_location_at:new Date(now).toISOString(),route_updated_at:new Date(now).toISOString(),route_duration_seconds:500,route_distance_meters:1000} as FulfillmentSession;
describe('real delivery visibility',()=>{
 it('shows current consenting active location and route',()=>{const s=deliveryState(session,now);expect(s.live).toBe(true);expect(s.hasRoute).toBe(true);expect(s.step).toBe(2);});
 it.each([null,undefined,'', ' ',false,NaN,Infinity,91])('rejects invalid latitude %s',value=>expect(coordinate(value,90)).toBeNull());
 it('does not label an old position live or retain its estimate',()=>{const s=deliveryState(session,now+6*60000);expect(s.live).toBe(false);expect(s.hasRoute).toBe(false);expect(s.driver).not.toBeNull();});
 it('hides stale routes while location remains current',()=>expect(deliveryState({...session,route_updated_at:new Date(now-6*60000).toISOString()},now).hasRoute).toBe(false));
 it('paused location never has a live ETA',()=>{const s=deliveryState({...session,tracking_paused:true},now);expect(s.live).toBe(false);expect(s.hasRoute).toBe(false);});
 it.each(['completed','cancelled','canceled'])('closed %s session never exposes vehicle location',status=>{const s=deliveryState({...session,status},now);expect(s.driver).toBeNull();expect(s.hasRoute).toBe(false);});
 it('pending session is not delivery scheduled',()=>expect(deliveryState({...session,status:'pending',tracking_active:false},now).step).toBe(0));
 it('rejects missing coordinates, negative duration, and future timestamps',()=>{expect(deliveryState({...session,last_latitude:null},now).live).toBe(false);expect(deliveryState({...session,route_duration_seconds:-1},now).hasRoute).toBe(false);expect(deliveryState({...session,last_location_at:new Date(now+120000).toISOString()},now).live).toBe(false);});
 it('decodes a valid route and rejects truncated input',()=>{expect(decodeRoute('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toHaveLength(3);expect(decodeRoute('_')).toEqual([]);expect(decodeRoute('~~~~~~~')).toEqual([]);});
});
