import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PayoutRecord {
  id: string;
  amount: number;
  seller_payout: number;
  platform_fee: number;
  status: string;
  payout_completed_at: string | null;
  created_at: string;
  listing_title: string;
}

export interface RevenueAnalytics {
  totalEarnings: number;
  totalPaidOut: number;
  pendingPayout: number;
  monthlyRevenue: { month: string; revenue: number; payouts: number }[];
  payoutHistory: PayoutRecord[];
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueTrend: number;
  averageOrderValue: number;
  totalTransactions: number;
}

export const useRevenueAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch sales where user is the seller
      const salesPromise = (supabase
        .from('sale_transactions' as any)
        .select(`
          id,
          amount,
          seller_payout,
          platform_fee,
          status,
          payout_completed_at,
          created_at,
          listing:listings(title)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })) as any;

      // Fetch rental bookings where user is the host and payment is captured.
      // Rentals collect 12.9% commission, so seller_payout = total_price * (1 - 0.129).
      const rentalsPromise = supabase
        .from('booking_requests')
        .select('id, total_price, payment_status, paid_at, payout_processed_at, created_at, listing:listings(title)')
        .eq('host_id', user.id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      const [{ data: salesData, error: salesError }, { data: rentalsData, error: rentalsError }] =
        await Promise.all([salesPromise, rentalsPromise]);

      if (salesError) throw salesError;
      if (rentalsError) throw rentalsError;

      // Normalize rentals into the same shape used downstream so all calculations stay unified.
      const RENTAL_COMMISSION = 0.129;
      const normalizedRentals = (rentalsData || []).map((r: any) => {
        const amount = Number(r.total_price) || 0;
        const platformFee = +(amount * RENTAL_COMMISSION).toFixed(2);
        const sellerPayout = +(amount - platformFee).toFixed(2);
        return {
          id: r.id,
          amount,
          seller_payout: sellerPayout,
          platform_fee: platformFee,
          status: 'paid',
          payout_completed_at: r.payout_processed_at,
          created_at: r.paid_at || r.created_at,
          listing: r.listing,
        };
      });

      const transactions = [...(salesData || []), ...normalizedRentals]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const completedTransactions = transactions?.filter(
        (t: any) => ['completed', 'buyer_confirmed', 'seller_confirmed', 'paid'].includes(t.status)
      ) || [];

      // Calculate totals
      const totalEarnings = completedTransactions.reduce(
        (sum: number, t: any) => sum + (t.seller_payout || 0), 
        0
      );

      const paidOutTransactions = transactions?.filter(
        (t: any) => t.payout_completed_at !== null
      ) || [];
      
      const totalPaidOut = paidOutTransactions.reduce(
        (sum: number, t: any) => sum + (t.seller_payout || 0), 
        0
      );

      const pendingPayout = totalEarnings - totalPaidOut;

      // Calculate monthly revenue (last 6 months)
      const now = new Date();
      const monthlyRevenue: { month: string; revenue: number; payouts: number }[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
        
        const monthTransactions = completedTransactions.filter((t: any) => {
          const date = new Date(t.created_at);
          return date >= monthDate && date <= monthEnd;
        });

        const monthPayouts = paidOutTransactions.filter((t: any) => {
          const date = new Date(t.payout_completed_at);
          return date >= monthDate && date <= monthEnd;
        });

        monthlyRevenue.push({
          month: monthName,
          revenue: monthTransactions.reduce((sum: number, t: any) => sum + (t.seller_payout || 0), 0),
          payouts: monthPayouts.reduce((sum: number, t: any) => sum + (t.seller_payout || 0), 0),
        });
      }

      // Revenue this month vs last month
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const revenueThisMonth = completedTransactions
        .filter((t: any) => new Date(t.created_at) >= thisMonthStart)
        .reduce((sum: number, t: any) => sum + (t.seller_payout || 0), 0);

      const revenueLastMonth = completedTransactions
        .filter((t: any) => {
          const date = new Date(t.created_at);
          return date >= lastMonthStart && date <= lastMonthEnd;
        })
        .reduce((sum: number, t: any) => sum + (t.seller_payout || 0), 0);

      const revenueTrend = revenueLastMonth > 0 
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
        : revenueThisMonth > 0 ? 100 : 0;

      // Payout history (last 10)
      const payoutHistory: PayoutRecord[] = (transactions || [])
        .filter((t: any) => t.payout_completed_at || ['completed', 'paid', 'buyer_confirmed', 'seller_confirmed'].includes(t.status))
        .slice(0, 10)
        .map((t: any) => ({
          id: t.id,
          amount: t.amount,
          seller_payout: t.seller_payout,
          platform_fee: t.platform_fee,
          status: t.status,
          payout_completed_at: t.payout_completed_at,
          created_at: t.created_at,
          listing_title: t.listing?.title || 'Unknown Listing',
        }));

      // Average order value
      const averageOrderValue = completedTransactions.length > 0
        ? totalEarnings / completedTransactions.length
        : 0;

      setAnalytics({
        totalEarnings,
        totalPaidOut,
        pendingPayout,
        monthlyRevenue,
        payoutHistory,
        revenueThisMonth,
        revenueLastMonth,
        revenueTrend,
        averageOrderValue,
        totalTransactions: completedTransactions.length,
      });
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      setAnalytics({
        totalEarnings: 0,
        totalPaidOut: 0,
        pendingPayout: 0,
        monthlyRevenue: [],
        payoutHistory: [],
        revenueThisMonth: 0,
        revenueLastMonth: 0,
        revenueTrend: 0,
        averageOrderValue: 0,
        totalTransactions: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, isLoading, refetch: fetchAnalytics };
};
