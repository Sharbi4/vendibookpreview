import type { FulfillmentSession } from '@/hooks/useHandoff';
export const LOCATION_FRESH_MS=5*60*1000;
export function coordinate(v:unknown,limit:number){if(v===null||v===undefined||(typeof v==='string'&&!v.trim())||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)&&Math.abs(n)<=limit?n:null;}
export function deliveryState(session:FulfillmentSession|null,now=Date.now()){
 const lat=coordinate(session?.last_latitude,90),lng=coordinate(session?.last_longitude,180);
 const destinationLat=coordinate(session?.destination_latitude,90),destinationLng=coordinate(session?.destination_longitude,180);
 const closed=!!session&&(!!session.delivered_at||['completed','cancelled','canceled'].includes(session.status));
 const cancelled=['cancelled','canceled'].includes(session?.status||'');
 const active=!!session?.tracking_active&&!session?.tracking_paused&&!closed;
 const last=Date.parse(session?.last_location_at||'');const routeAt=Date.parse(session?.route_updated_at||'');
 const fresh=Number.isFinite(last)&&now-last>=-60000&&now-last<=LOCATION_FRESH_MS;
 const live=active&&fresh&&lat!==null&&lng!==null;
 const routeFresh=live&&Number.isFinite(routeAt)&&now-routeAt>=-60000&&now-routeAt<=LOCATION_FRESH_MS;
 const hasRoute=routeFresh&&session?.route_duration_seconds!=null&&session.route_duration_seconds>=0&&session?.route_distance_meters!=null&&session.route_distance_meters>=0;
 const status=cancelled?'Delivery cancelled':closed?'Delivery completed':session?.tracking_paused?'Location sharing paused':live?'Live delivery':active?'Waiting for a location update':session?.status==='en_route'?'Delivery started':'Preparing for delivery';
 return {live,active,closed,cancelled,status,fresh,hasRoute,driver:!closed&&lat!==null&&lng!==null?{lat,lng}:null,destination:destinationLat!==null&&destinationLng!==null?{lat:destinationLat,lng:destinationLng}:null,step:cancelled?-1:closed?4:session?.status==='arrived'?3:session?.status==='en_route'||live?2:session?.status==='scheduled'?1:0};
}
// Reject malformed/truncated input rather than looping past the buffer.
export function decodeRoute(encoded:string):{lat:number;lng:number}[]{
 if(encoded.length>100000)return [];
 let index=0,lat=0,lng=0;const points:{lat:number;lng:number}[]=[];
 const next=()=>{let result=0,shift=0;for(let i=0;i<6;i++){if(index>=encoded.length)throw Error('Truncated');const b=encoded.charCodeAt(index++)-63;if(b<0||b>63)throw Error('Invalid');result|=(b&31)<<shift;if(b<32)return result&1?~(result>>1):result>>1;shift+=5;}throw Error('Invalid');};
 try{while(index<encoded.length){lat+=next();lng+=next();if(Math.abs(lat/1e5)>90||Math.abs(lng/1e5)>180)return [];points.push({lat:lat/1e5,lng:lng/1e5});}return points;}catch{return [];}
}
