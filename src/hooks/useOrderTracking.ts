import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TrackingTransaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: string;
  fulfillment_type: string | null;
  delivery_address: string | null;
  delivery_instructions: string | null;
  delivery_fee: number | null;
  freight_cost: number | null;
  created_at: string;
  // Tracking fields
  shipping_status: string | null;
  tracking_number: string | null;
  carrier: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  estimated_delivery_date: string | null;
  delivered_at: string | null;
  shipping_notes: string | null;
  // Cash transaction confirmation fields
  buyer_confirmed_at: string | null;
  seller_confirmed_at: string | null;
  // Joined fields
  listing?: {
    id: string;
    title: string;
    cover_image_url: string | null;
    pickup_location_text: string | null;
  };
}

export const useOrderTracking = (transactionId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: transaction, isLoading, error, refetch } = useQuery({
    queryKey: ['order-tracking', transactionId],
    queryFn: async () => {
      if (!transactionId || !user) return null;
      
      const { data, error } = await supabase
        .from('sale_transactions')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          amount,
          status,
          fulfillment_type,
          delivery_address,
          delivery_instructions,
          delivery_fee,
          freight_cost,
          created_at,
          shipping_status,
          tracking_number,
          carrier,
          tracking_url,
          shipped_at,
          estimated_delivery_date,
          delivered_at,
          shipping_notes,
          buyer_confirmed_at,
          seller_confirmed_at,
          listing:listings(id, title, cover_image_url, pickup_location_text)
        `)
        .eq('id', transactionId)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .single();

      if (error) throw error;
      return data as TrackingTransaction;
    },
    enabled: !!transactionId && !!user,
  });

  // Set up real-time subscription for tracking updates
  useEffect(() => {
    if (!transactionId || !user) return;

    const channel = supabase
      .channel(`order-tracking-${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sale_transactions',
          filter: `id=eq.${transactionId}`,
        },
        (payload) => {
          // Update the cache with new data
          queryClient.setQueryData(['order-tracking', transactionId], (old: TrackingTransaction | null) => {
            if (!old) return old;
            return { ...old, ...payload.new };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transactionId, user, queryClient]);

  return {
    transaction,
    isLoading,
    error,
    refetch,
  };
};

// Hook to get all orders with tracking for buyer dashboard
export const useMyOrders = () => {
  const { user } = useAuth();

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('sale_transactions')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          amount,
          status,
          fulfillment_type,
          shipping_status,
          tracking_number,
          carrier,
          shipped_at,
          estimated_delivery_date,
          delivered_at,
          created_at,
          listing:listings(id, title, cover_image_url)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrackingTransaction[];
    },
    enabled: !!user,
  });

  // Real-time updates for all orders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('my-orders-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sale_transactions',
          filter: `buyer_id=eq.${user.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const activeShipments = orders.filter(o => 
    ['processing', 'shipped', 'in_transit', 'out_for_delivery'].includes(o.shipping_status || '')
  );

  return {
    orders,
    activeShipments,
    isLoading,
    refetch,
  };
};