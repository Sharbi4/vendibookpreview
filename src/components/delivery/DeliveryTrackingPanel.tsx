import { useGoogleMapsToken } from '@/hooks/useGoogleMapsToken';
import { useDeliveryTracking,isDeliveryMode } from '@/hooks/useDeliveryTracking';
import { DeliveryJourneyView } from './DeliveryJourneyView';
interface Props {saleTransactionId?:string|null;bookingId?:string|null;fulfillmentType?:string|null;title?:string;listingImage?:string|null;}
export default function DeliveryTrackingPanel({saleTransactionId,bookingId,fulfillmentType,title,listingImage}:Props){
 const {session,isLoading,refresh,error}=useDeliveryTracking(saleTransactionId,bookingId);
 const deliveryOrder=isDeliveryMode(session?.mode)||isDeliveryMode(fulfillmentType)||['rental_delivery','equipment_delivery','shipping','delivery'].includes(fulfillmentType??'');
 const {apiKey}=useGoogleMapsToken(deliveryOrder);
 if(!deliveryOrder)return null;
 if(isLoading)return <div className="journey-map-empty">Loading delivery details…</div>;
 return <DeliveryJourneyView session={session} apiKey={apiKey} title={title} listingImage={listingImage} orderId={saleTransactionId??bookingId??undefined} onRefresh={()=>void refresh()} error={!!error}/>;
}
