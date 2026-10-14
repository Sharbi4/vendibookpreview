import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface PayableNote {
  id: string;
  payout_provider: string | null;
  hold_reason: string | null;
}

/**
 * Hold reasons and payout provider for the seller's own payables (RLS scopes
 * seller_payables to seller_id). The same columns the old Earnings & payouts
 * panel read, kept so the payouts table can say why a payout is held and
 * when PayPal already paid the seller directly. Read-only.
 */
export function usePayableNotes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['seller-payable-notes', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_payables')
        .select('id, payout_provider, hold_reason')
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const map = new Map<string, PayableNote>();
      for (const row of (data ?? []) as PayableNote[]) map.set(row.id, row);
      return map;
    },
  });
}
