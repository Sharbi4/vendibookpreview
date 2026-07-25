import { useQuery } from '@tanstack/react-query';
import { useHostEntitlements, type HostTier } from '@/hooks/useHostEntitlements';
import { useHostListings } from '@/hooks/useHostListings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Active-listing quotas per host tier for accounts created AFTER
 * grandfathering cutoff. Drafts don't count against quota.
 * `null` = unlimited.
 *
 * Grandfathered ("founding member") accounts always resolve to unlimited
 * regardless of tier — see profiles.grandfathered_listings.
 */
export const HOST_LISTING_QUOTAS: Record<HostTier, number | null> = {
  free: 2,
  starter: 5,
  pro: null,
  premium: null,
};

export interface ListingQuotaInfo {
  tier: HostTier;
  limit: number | null;
  used: number;
  remaining: number | null;
  isUnlimited: boolean;
  isAtLimit: boolean;
  isOverLimit: boolean;
  percent: number; // 0..100 (0 when unlimited)
  isLoading: boolean;
  /** True when the account is a founding member — unlimited listings forever. */
  isGrandfathered: boolean;
}

export function useListingQuota(): ListingQuotaInfo {
  const { user } = useAuth();
  const { tier, isLoading: entLoading } = useHostEntitlements();
  const { listings, isLoading: listLoading } = useHostListings();

  const { data: grandfathered, isLoading: gfLoading } = useQuery({
    queryKey: ['profile-grandfathered', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('grandfathered_listings')
        .eq('id', user!.id)
        .maybeSingle();
      return !!(data as { grandfathered_listings?: boolean } | null)?.grandfathered_listings;
    },
  });

  const tierLimit = HOST_LISTING_QUOTAS[tier];
  const isGrandfathered = !!grandfathered;
  const limit = isGrandfathered ? null : tierLimit;

  const used = listings.filter(
    (l) => l.status === 'published' || l.status === 'paused',
  ).length;

  const isUnlimited = limit === null;
  const remaining = isUnlimited ? null : Math.max(0, (limit as number) - used);
  const isAtLimit = !isUnlimited && used >= (limit as number);
  const isOverLimit = !isUnlimited && used > (limit as number);
  const percent = isUnlimited ? 0 : Math.min(100, Math.round((used / (limit as number)) * 100));

  return {
    tier,
    limit,
    used,
    remaining,
    isUnlimited,
    isAtLimit,
    isOverLimit,
    percent,
    isLoading: entLoading || listLoading || gfLoading,
    isGrandfathered,
  };
}
