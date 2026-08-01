import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OrderDetail } from '../../supabase/functions/_shared/orders/buildOrderDetail';

export type { OrderDetail };

/** Server-driven order view. All status/next-action logic lives in the backend. */
export function useOrderDetail(orderId: string | undefined) {
  return useQuery({
    queryKey: ['order-detail', orderId],
    enabled: !!orderId,
    refetchInterval: (query) => {
      const order = (query.state.data as OrderDetail | undefined);
      const pending = order && ['payment_pending', 'payment_processing', 'payment_approved']
        .includes(order.payment.code);
      return pending ? 5000 : false;
    },
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-order-detail', {
        body: { order_id: orderId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any).order as OrderDetail;
    },
  });
}

export async function recoverOrderPayment(orderId: string, action: 'status' | 'retry') {
  const { data, error } = await supabase.functions.invoke('order-payment-recovery', {
    body: { order_id: orderId, action },
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}
