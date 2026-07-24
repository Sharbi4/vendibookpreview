import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type HostTier = 'free' | 'starter' | 'pro' | 'premium';

const TIER_RANK: Record<HostTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  premium: 3,
};

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

export interface HostEntitlements {
  tier: HostTier;
  status: string | null;
  isActive: boolean;
  isPastDue: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  // Feature flags
  canAdvancedAnalytics: boolean;
  canPriorityPlacement: boolean;
  canBulkListings: boolean;
  canPrioritySupport: boolean;
  canDedicatedConcierge: boolean;
  hasAtLeast: (tier: HostTier) => boolean;
}

const FREE: HostEntitlements = {
  tier: 'free',
  status: null,
  isActive: false,
  isPastDue: false,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  canAdvancedAnalytics: false,
  canPriorityPlacement: false,
  canBulkListings: false,
  canPrioritySupport: false,
  canDedicatedConcierge: false,
  hasAtLeast: () => false,
};

export function useHostEntitlements(): HostEntitlements & { isLoading: boolean } {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['host-entitlements', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<HostEntitlements> => {
      const { data: sub } = await supabase
        .from('host_subscriptions')
        .select('tier, status, current_period_end, cancel_at_period_end')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub) return FREE;

      const status = sub.status ?? null;
      const isActive = !!status && ACTIVE_STATUSES.has(status);
      const tier: HostTier = isActive
        ? ((sub.tier as HostTier) ?? 'free')
        : 'free';
      const rank = TIER_RANK[tier] ?? 0;

      return {
        tier,
        status,
        isActive,
        isPastDue: status === 'past_due',
        cancelAtPeriodEnd: !!sub.cancel_at_period_end,
        currentPeriodEnd: sub.current_period_end ?? null,
        canAdvancedAnalytics: rank >= TIER_RANK.pro,
        canPriorityPlacement: rank >= TIER_RANK.pro,
        canBulkListings: rank >= TIER_RANK.pro,
        canPrioritySupport: rank >= TIER_RANK.pro,
        canDedicatedConcierge: rank >= TIER_RANK.premium,
        hasAtLeast: (t: HostTier) => rank >= (TIER_RANK[t] ?? 0),
      };
    },
  });

  return { ...(data ?? FREE), isLoading };
}
