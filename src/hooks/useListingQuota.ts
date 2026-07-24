import { useHostEntitlements, type HostTier } from '@/hooks/useHostEntitlements';
import { useHostListings } from '@/hooks/useHostListings';

/**
 * Active-listing quotas per host tier. Drafts don't count against quota.
 * `null` = unlimited.
 */
export const HOST_LISTING_QUOTAS: Record<HostTier, number | null> = {
  free: 3,
  starter: 10,
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
}

export function useListingQuota(): ListingQuotaInfo {
  const { tier, isLoading: entLoading } = useHostEntitlements();
  const { listings, isLoading: listLoading } = useHostListings();

  const limit = HOST_LISTING_QUOTAS[tier];
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
    isLoading: entLoading || listLoading,
  };
}
