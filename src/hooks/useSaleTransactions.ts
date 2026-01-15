import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SaleTransaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  platform_fee: number;
  seller_payout: number;
  payment_intent_id: string | null;
  checkout_session_id: string | null;
  status: 'pending' | 'paid' | 'buyer_confirmed' | 'seller_confirmed' | 'completed' | 'disputed' | 'refunded' | 'cancelled';
  buyer_confirmed_at: string | null;
  seller_confirmed_at: string | null;
  payout_completed_at: string | null;
  transfer_id: string | null;
  message: string | null;
  created_at: string;
  updated_at: string;
  // Fulfillment fields
  fulfillment_type: string | null;
  delivery_address: string | null;
  delivery_instructions: string | null;
  delivery_fee: number | null;
  freight_cost: number | null;
  // Joined fields
  listing?: {
    id: string;
    title: string;
    cover_image_url: string | null;
    category: string;
    pickup_location_text: string | null;
    pickup_instructions: string | null;
  };
  buyer?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
  seller?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export const useBuyerSaleTransactions = (userId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['buyer-sale-transactions', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Use type assertion to work around generated types not including this table yet
      const { data, error } = await (supabase
        .from('sale_transactions' as any)
        .select(`
          *,
          listing:listings(id, title, cover_image_url, category, pickup_location_text, pickup_instructions),
          seller:profiles!sale_transactions_seller_id_fkey(id, full_name, avatar_url)
        `)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false })) as any;

      if (error) throw error;
      return data as SaleTransaction[];
    },
    enabled: !!userId,
  });

  const confirmSale = useMutation({
    mutationFn: async (transactionId: string) => {
      const { data, error } = await supabase.functions.invoke('confirm-sale', {
        body: { transaction_id: transactionId, role: 'buyer' },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Purchase Confirmed',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['buyer-sale-transactions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Confirmation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const raiseDispute = useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('raise-dispute', {
        body: { transaction_id: transactionId, reason },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Dispute Submitted',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['buyer-sale-transactions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Submit Dispute',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const stats = {
    total: transactions.length,
    awaitingConfirmation: transactions.filter(t => ['paid', 'seller_confirmed'].includes(t.status)).length,
    confirmed: transactions.filter(t => t.buyer_confirmed_at !== null).length,
    completed: transactions.filter(t => t.status === 'completed').length,
    disputed: transactions.filter(t => t.status === 'disputed').length,
  };

  return {
    transactions,
    isLoading,
    refetch,
    confirmSale: confirmSale.mutate,
    isConfirming: confirmSale.isPending,
    raiseDispute: raiseDispute.mutate,
    isDisputing: raiseDispute.isPending,
    stats,
  };
};

export const useSellerSaleTransactions = (userId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['seller-sale-transactions', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await (supabase
        .from('sale_transactions' as any)
        .select(`
          *,
          listing:listings(id, title, cover_image_url, category, pickup_location_text, pickup_instructions),
          buyer:profiles!sale_transactions_buyer_id_fkey(id, full_name, avatar_url)
        `)
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })) as any;

      if (error) throw error;
      return data as SaleTransaction[];
    },
    enabled: !!userId,
  });

  const confirmSale = useMutation({
    mutationFn: async (transactionId: string) => {
      const { data, error } = await supabase.functions.invoke('confirm-sale', {
        body: { transaction_id: transactionId, role: 'seller' },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Sale Confirmed',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['seller-sale-transactions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Confirmation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const raiseDispute = useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('raise-dispute', {
        body: { transaction_id: transactionId, reason },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Dispute Submitted',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['seller-sale-transactions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Submit Dispute',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const stats = {
    total: transactions.length,
    awaitingConfirmation: transactions.filter(t => ['paid', 'buyer_confirmed'].includes(t.status)).length,
    confirmed: transactions.filter(t => t.seller_confirmed_at !== null).length,
    completed: transactions.filter(t => t.status === 'completed').length,
    pendingPayout: transactions.filter(t => t.status === 'completed' && !t.payout_completed_at).length,
    disputed: transactions.filter(t => t.status === 'disputed').length,
  };

  return {
    transactions,
    isLoading,
    refetch,
    confirmSale: confirmSale.mutate,
    isConfirming: confirmSale.isPending,
    raiseDispute: raiseDispute.mutate,
    isDisputing: raiseDispute.isPending,
    stats,
  };
};

// Hook to create transaction from checkout session
export const useCreateSaleTransaction = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.functions.invoke('create-sale-transaction', {
        body: { session_id: sessionId },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Purchase Recorded',
        description: 'Your purchase is now in escrow. Please confirm receipt of the item to release payment to the seller.',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to create sale transaction:', error);
    },
  });
};
