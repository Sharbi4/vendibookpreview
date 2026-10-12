import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
export function useSaleActionState(listingId?:string) {
  const query=useQuery({
    queryKey:['sale-action-state',listingId],enabled:!!listingId,refetchInterval:15_000,
    queryFn:async()=>{
      const {data,error}=await supabase.rpc('sale_action_state' as never,{_listing:listingId} as never);
      if(error)throw error;
      return data as unknown as {can_request:boolean;can_offer:boolean;minimum_offer:number|null;reservation_status:string|null};
    },
  });
  return {...query,canRequest:query.isSuccess&&query.data?.can_request===true,canOffer:query.isSuccess&&query.data?.can_offer===true,minimumOffer:Number(query.data?.minimum_offer)||0};
}
