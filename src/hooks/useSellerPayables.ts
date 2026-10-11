import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface SellerPayable {
  id: string;
  seller_id: string;
  payment_record_id: string | null;
  status: string;
  transaction_type: string | null;
  net_payout_cents: number | null;
  release_due_at: string | null;
  payout_eligible_at: string | null;
  payout_completed_at: string | null;
  created_at: string;
}

/** The money center always describes the signed-in seller, including admins. */
export function useSellerPayables() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['seller-payables', user?.id],
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<SellerPayable[]> => {
      const rows: SellerPayable[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('seller_payables')
          .select('id, seller_id, payment_record_id, status, transaction_type, net_payout_cents, release_due_at, payout_eligible_at, payout_completed_at, created_at')
          .eq('seller_id', user!.id)
          .order('created_at', { ascending: false }).order('id')
          .range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data ?? []) as SellerPayable[]);
        if (!data || data.length < 500) return rows;
      }
    },
  });
}
