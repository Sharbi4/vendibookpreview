import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SaleTransaction } from './useSaleTransactions';

export const useAdminTransactions = (userId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is admin
  const { data: isAdmin = false, isLoading: isCheckingAdmin } = useQuery({
    queryKey: ['is-admin', userId],
    queryFn: async () => {
      if (!userId) return false;
      
      const { data, error } = await supabase.rpc('is_admin', { user_id: userId });
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      return data as boolean;
    },
    enabled: !!userId,
  });

  // Fetch all disputed transactions (only works for admins)
  const { data: disputedTransactions = [], isLoading: isLoadingTransactions, refetch } = useQuery({
    queryKey: ['admin-disputed-transactions', userId],
    queryFn: async () => {
      if (!userId || !isAdmin) return [];
      
      const { data, error } = await (supabase
        .from('sale_transactions' as any)
        .select(`
          *,
          listing:listings(id, title, cover_image_url, category),
          buyer:profiles!sale_transactions_buyer_id_fkey(id, full_name, avatar_url, email),
          seller:profiles!sale_transactions_seller_id_fkey(id, full_name, avatar_url, email)
        `)
        .eq('status', 'disputed')
        .order('updated_at', { ascending: false })) as any;

      if (error) {
        console.error('Error fetching disputed transactions:', error);
        throw error;
      }
      return data as SaleTransaction[];
    },
    enabled: !!userId && isAdmin,
  });

  // Fetch all transactions for admin view
  const { data: allTransactions = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['admin-all-transactions', userId],
    queryFn: async () => {
      if (!userId || !isAdmin) return [];
      
      const { data, error } = await (supabase
        .from('sale_transactions' as any)
        .select(`
          *,
          listing:listings(id, title, cover_image_url, category),
          buyer:profiles!sale_transactions_buyer_id_fkey(id, full_name, avatar_url, email),
          seller:profiles!sale_transactions_seller_id_fkey(id, full_name, avatar_url, email)
        `)
        .order('created_at', { ascending: false })) as any;

      if (error) {
        console.error('Error fetching all transactions:', error);
        throw error;
      }
      return data as SaleTransaction[];
    },
    enabled: !!userId && isAdmin,
  });

  const resolveDispute = useMutation({
    mutationFn: async ({ 
      transactionId, 
      resolution, 
      adminNotes 
    }: { 
      transactionId: string; 
      resolution: 'refund_buyer' | 'release_to_seller';
      adminNotes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('resolve-dispute', {
        body: { 
          transaction_id: transactionId, 
          resolution,
          admin_notes: adminNotes,
        },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Dispute Resolved',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-disputed-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-transactions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Resolution Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const stats = {
    total: allTransactions.length,
    disputed: disputedTransactions.length,
    pending: allTransactions.filter(t => t.status === 'pending').length,
    inEscrow: allTransactions.filter(t => ['paid', 'buyer_confirmed', 'seller_confirmed'].includes(t.status)).length,
    completed: allTransactions.filter(t => t.status === 'completed').length,
    refunded: allTransactions.filter(t => t.status === 'refunded').length,
  };

  return {
    isAdmin,
    isCheckingAdmin,
    disputedTransactions,
    allTransactions,
    isLoading: isLoadingTransactions || isLoadingAll,
    refetch,
    resolveDispute: resolveDispute.mutate,
    isResolving: resolveDispute.isPending,
    stats,
  };
};
