import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CommissionStats {
  totalEarnings: number;
  totalPending: number;
  last30DaysEarnings: number;
  last7DaysEarnings: number;
  completedTransactions: number;
  pendingPayoutTransactions: number;
}

interface TransactionBreakdown {
  id: string;
  listing_title: string;
  amount: number;
  platform_fee: number;
  seller_payout: number;
  status: string;
  payout_completed_at: string | null;
  created_at: string;
  buyer_name: string | null;
  seller_name: string | null;
}

interface PendingPayout {
  id: string;
  listing_title: string;
  seller_id: string;
  seller_name: string | null;
  seller_payout: number;
  status: string;
  created_at: string;
  message: string | null;
}

export const useAdminFinance = (userId: string | undefined) => {
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

  // Fetch commission stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin-finance-stats', userId],
    queryFn: async (): Promise<CommissionStats> => {
      if (!userId || !isAdmin) {
        return {
          totalEarnings: 0,
          totalPending: 0,
          last30DaysEarnings: 0,
          last7DaysEarnings: 0,
          completedTransactions: 0,
          pendingPayoutTransactions: 0,
        };
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch all completed transactions with payouts done
      const { data: completedWithPayout, error: err1 } = await supabase
        .from('sale_transactions')
        .select('platform_fee, created_at, payout_completed_at')
        .not('payout_completed_at', 'is', null);

      if (err1) throw err1;

      // Fetch transactions that are completed but payout pending
      const { data: pendingPayouts, error: err2 } = await supabase
        .from('sale_transactions')
        .select('platform_fee, seller_payout, status')
        .eq('status', 'completed')
        .is('payout_completed_at', null);

      if (err2) throw err2;

      // Calculate stats
      const totalEarnings = completedWithPayout?.reduce((sum, t) => sum + (t.platform_fee || 0), 0) || 0;
      const totalPending = pendingPayouts?.reduce((sum, t) => sum + (t.platform_fee || 0), 0) || 0;

      const last30Days = completedWithPayout?.filter(t => 
        t.payout_completed_at && new Date(t.payout_completed_at) >= new Date(thirtyDaysAgo)
      ) || [];
      const last30DaysEarnings = last30Days.reduce((sum, t) => sum + (t.platform_fee || 0), 0);

      const last7Days = completedWithPayout?.filter(t => 
        t.payout_completed_at && new Date(t.payout_completed_at) >= new Date(sevenDaysAgo)
      ) || [];
      const last7DaysEarnings = last7Days.reduce((sum, t) => sum + (t.platform_fee || 0), 0);

      return {
        totalEarnings,
        totalPending,
        last30DaysEarnings,
        last7DaysEarnings,
        completedTransactions: completedWithPayout?.length || 0,
        pendingPayoutTransactions: pendingPayouts?.length || 0,
      };
    },
    enabled: !!userId && isAdmin,
  });

  // Fetch recent completed transactions
  const { data: recentTransactions = [], isLoading: isLoadingRecent } = useQuery({
    queryKey: ['admin-finance-recent', userId],
    queryFn: async (): Promise<TransactionBreakdown[]> => {
      if (!userId || !isAdmin) return [];

      const { data, error } = await supabase
        .from('sale_transactions')
        .select(`
          id,
          amount,
          platform_fee,
          seller_payout,
          status,
          payout_completed_at,
          created_at,
          buyer_name,
          listing:listings(title)
        `)
        .not('payout_completed_at', 'is', null)
        .order('payout_completed_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch seller names separately
      const sellerIds = data?.map(t => (t as any).seller_id).filter(Boolean) || [];
      let sellerMap: Record<string, string> = {};
      
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', sellerIds);
        
        sellers?.forEach(s => {
          sellerMap[s.id] = s.full_name || 'Unknown';
        });
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        listing_title: t.listing?.title || 'Unknown Listing',
        amount: t.amount,
        platform_fee: t.platform_fee,
        seller_payout: t.seller_payout,
        status: t.status,
        payout_completed_at: t.payout_completed_at,
        created_at: t.created_at,
        buyer_name: t.buyer_name,
        seller_name: sellerMap[t.seller_id] || null,
      }));
    },
    enabled: !!userId && isAdmin,
  });

  // Fetch pending payouts
  const { data: pendingPayouts = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ['admin-finance-pending', userId],
    queryFn: async (): Promise<PendingPayout[]> => {
      if (!userId || !isAdmin) return [];

      const { data, error } = await supabase
        .from('sale_transactions')
        .select(`
          id,
          seller_id,
          seller_payout,
          status,
          created_at,
          message,
          listing:listings(title)
        `)
        .eq('status', 'completed')
        .is('payout_completed_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch seller names
      const sellerIds = [...new Set(data?.map(t => t.seller_id).filter(Boolean) || [])];
      let sellerMap: Record<string, string> = {};
      
      if (sellerIds.length > 0) {
        const results = await Promise.all(
          sellerIds.map(id => 
            supabase.rpc('get_safe_host_profile', { host_user_id: id })
          )
        );
        
        results.forEach((result, i) => {
          if (result.data?.[0]) {
            sellerMap[sellerIds[i]] = result.data[0].full_name || result.data[0].display_name || 'Unknown';
          }
        });
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        listing_title: t.listing?.title || 'Unknown Listing',
        seller_id: t.seller_id,
        seller_name: sellerMap[t.seller_id] || 'Unknown',
        seller_payout: t.seller_payout,
        status: t.status,
        created_at: t.created_at,
        message: t.message,
      }));
    },
    enabled: !!userId && isAdmin,
  });

  return {
    isAdmin,
    isCheckingAdmin,
    stats: stats || {
      totalEarnings: 0,
      totalPending: 0,
      last30DaysEarnings: 0,
      last7DaysEarnings: 0,
      completedTransactions: 0,
      pendingPayoutTransactions: 0,
    },
    recentTransactions,
    pendingPayouts,
    isLoading: isLoadingStats || isLoadingRecent || isLoadingPending,
  };
};
