import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Canonical host tier used throughout the app for gating.
 * DB `host_subscriptions.tier` may hold catalog slugs
 * (`host_starter`, `host_growth`, `host_operator`, `seller_plus_*`, plus
 * legacy `starter`/`pro`/`premium`); resolveTier() normalises those.
 */
export type HostTier = 'free' | 'starter' | 'pro' | 'premium';

const TIER_RANK: Record<HostTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  premium: 3,
};

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

/**
 * Map any DB tier string (legacy or new catalog slug) to the canonical rank.
 * Missing / unknown → 'free'. Annual variants collapse to the same rank as
 * their monthly counterpart.
 */
function resolveTier(raw: string | null | undefined): { tier: HostTier; label: string } {
  if (!raw) return { tier: 'free', label: 'Free' };
  const key = raw.toLowerCase().replace(/_annual$/, '').replace(/_monthly$/, '');
  switch (key) {
    // Legacy
    case 'starter': return { tier: 'starter', label: 'Starter' };
    case 'pro': return { tier: 'pro', label: 'Pro' };
    case 'premium': return { tier: 'premium', label: 'Premium' };
    // New catalog
    case 'seller_plus':
    case 'seller-plus':
    case 'host_starter':
    case 'host-starter':
      return { tier: 'starter', label: key.startsWith('seller') ? 'Seller Plus' : 'Host Starter' };
    case 'host_growth':
    case 'host-growth':
      return { tier: 'pro', label: 'Host Growth' };
    case 'host_operator':
    case 'host-operator':
      return { tier: 'premium', label: 'Host Operator' };
    default:
      return { tier: 'free', label: 'Free' };
  }
}

export interface HostEntitlements {
  tier: HostTier;
  planLabel: string;
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
  planLabel: 'Free',
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
      const { tier, label } = isActive ? resolveTier(sub.tier) : { tier: 'free' as HostTier, label: 'Free' };
      const rank = TIER_RANK[tier] ?? 0;

      return {
        tier,
        planLabel: label,
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
