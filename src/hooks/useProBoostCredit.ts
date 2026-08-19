import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProBoostCredit {
  id: string;
  period_start: string;
  period_end: string;
}

/**
 * The member's unused Featured Boost credit for the current Vendibook Pro
 * billing period. Credits are non-rolling — one per period, expiring with it.
 */
export function useProBoostCredit() {
  return useQuery({
    queryKey: ['pro-boost-credit'],
    queryFn: async (): Promise<ProBoostCredit | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;

      const { data, error } = await supabase
        .from('pro_boost_credits')
        .select('id, period_start, period_end')
        .eq('user_id', auth.user.id)
        .eq('status', 'available')
        .gt('period_end', new Date().toISOString())
        .order('period_end', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return (data as ProBoostCredit) ?? null;
    },
    staleTime: 60_000,
  });
}

export function useRedeemProBoostCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: string) => {
      const { data, error } = await supabase.functions.invoke('pro-boost-redeem', {
        body: { listing_id: listingId },
      });
      if (error) throw error;
      if (data && (data as { error?: unknown }).error) {
        throw new Error(
          (data as { message?: string }).message ?? 'We couldn’t apply your boost credit.',
        );
      }
      return data as { ok: boolean; fulfilled: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pro-boost-credit'] });
      queryClient.invalidateQueries({ queryKey: ['boost-history'] });
      queryClient.invalidateQueries({ queryKey: ['host-listings'] });
    },
  });
}
