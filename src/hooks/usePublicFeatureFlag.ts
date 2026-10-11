import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Reads a single global feature flag through the public read-only lookup.
 * Fails closed: any error, missing row, or
 * in-flight fetch resolves to `false` so gated surfaces stay hidden.
 */
export function usePublicFeatureFlag(key: string): boolean {
  const { data } = useQuery({
    queryKey: ['public-feature-flag', key],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_feature_flag', {
        flag_key: key,
      });
      if (error) return false;
      return data === true;
    },
  });

  return data === true;
}
