import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Reads a single global feature flag from the publicly readable
 * `app_feature_flags` table. Fails closed: any error, missing row, or
 * in-flight fetch resolves to `false` so gated surfaces stay hidden.
 */
export function usePublicFeatureFlag(key: string): boolean {
  const { data } = useQuery({
    queryKey: ['public-feature-flag', key],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_feature_flags')
        .select('enabled')
        .eq('key', key)
        .maybeSingle();
      if (error) return false;
      return data?.enabled === true;
    },
  });

  return data === true;
}
