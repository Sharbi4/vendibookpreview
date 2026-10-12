import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
export const commerceDb = supabase as any;
export function useCommerceRecords() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['commerce-records',user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const [requests,invoices] = await Promise.all([
        commerceDb.from('sale_purchase_requests').select('*').or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`).order('created_at',{ascending:false}),
        commerceDb.from('sale_invoices').select('*').or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`).order('issued_at',{ascending:false}),
      ]);
      if(requests.error || invoices.error) throw requests.error || invoices.error;
      return {requests:requests.data ?? [],invoices:invoices.data ?? []};
    },
  });
}
export async function commerceAction(body: Record<string,unknown>) {
  const { data,error } = await supabase.functions.invoke('commerce-invoices',{body});
  if(error) {
    const response = (error as any).context;
    const detail = response instanceof Response ? await response.clone().json().catch(()=>null) : null;
    throw new Error(detail?.message || detail?.error || error.message);
  }
  if(data?.error) throw new Error(data.message || data.error);
  return data;
}
export const invoiceMoney = (cents: number|string) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents)/100);
