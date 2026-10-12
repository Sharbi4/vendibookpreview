import {useSaleActionState} from '@/hooks/useSaleActionState';
export default function SaleAvailabilityNote({listingId}:{listingId:string}) {
  const state=useSaleActionState(listingId);
  if(state.isError)return <p role="alert" className="text-xs text-destructive">Availability could not be verified. <button type="button" className="underline" onClick={()=>void state.refetch()}>Try again</button></p>;
  if(state.isLoading)return <p role="status" className="text-xs text-muted-foreground">Checking availability…</p>;
  const status=state.data?.reservation_status;
  if(!status)return null;
  return <p role="status" className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-950">{status==='sold'?'Sold':status==='payment_pending'?'Payment Pending — reserved for invoice payment':'Sale Pending — awaiting handoff'}</p>;
}
