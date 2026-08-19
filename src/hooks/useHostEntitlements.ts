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
// Exported for unit tests. Keep in lockstep with
// supabase/functions/_shared/toolAccess.ts:resolveTierFromSub — any new
// legacy slug must be added in both places.
export function resolveTier(raw: string | null | undefined): { tier: HostTier; label: string } {
  if (!raw) return { tier: 'free', label: 'Free' };
  const key = raw.toLowerCase().replace(/_annual$/, '').replace(/_monthly$/, '');
  switch (key) {
    // Legacy canonical
    case 'starter': return { tier: 'starter', label: 'Starter' };
    case 'pro': return { tier: 'pro', label: 'Pro' };
    case 'premium': return { tier: 'premium', label: 'Premium' };
    // Legacy alias — older Stripe subs stored `host_pro` before the
    // catalog was renamed to host_growth. Must resolve to Pro, never Free.
    case 'host_pro':
    case 'host-pro':
      return { tier: 'pro', label: 'Pro' };
    // 2026 catalog
    case 'vendibook_pro':
    case 'vendibook-pro':
      return { tier: 'pro', label: 'Vendibook Pro' };
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
      // 1) Real Stripe subscription (monthly / annual)
      const { data: sub } = await supabase
        .from('host_subscriptions')
        .select('tier, status, current_period_end, cancel_at_period_end')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const subActive = !!sub?.status && ACTIVE_STATUSES.has(sub.status);

      // 2) Time-boxed account pass (Pro Weekly Pass etc.) — one-time purchase
      // with a metadata.grants_tier flag and an unexpired access_ends_at.
      const nowIso = new Date().toISOString();
      const { data: pass } = await supabase
        .from('monetization_purchases')
        .select('access_ends_at, product:monetization_products!inner(name, metadata)')
        .eq('user_id', user!.id)
        .gt('access_ends_at', nowIso)
        .in('status', ['paid', 'fulfilled'])
        .neq('fulfillment_status', 'expired')
        .order('access_ends_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      // deno-lint-ignore no-explicit-any
      const passTier = (pass as any)?.product?.metadata?.grants_tier as HostTier | undefined;
      const passLabel = (pass as any)?.product?.name as string | undefined;
      const passEndsAt = (pass as any)?.access_ends_at as string | undefined;

      // Pick the stronger entitlement source
      const subRank = subActive ? (TIER_RANK[resolveTier(sub!.tier).tier] ?? 0) : 0;
      const passRank = passTier ? (TIER_RANK[passTier] ?? 0) : 0;

      if (!subActive && !passTier) return FREE;

      const usePass = passRank > subRank;

      const status = usePass ? 'active' : (sub!.status ?? null);
      const { tier, label } = usePass
        ? { tier: passTier!, label: passLabel ?? `${passTier!.charAt(0).toUpperCase()}${passTier!.slice(1)} (weekly pass)` }
        : resolveTier(sub!.tier);
      const rank = TIER_RANK[tier] ?? 0;

      return {
        tier,
        planLabel: label,
        status,
        isActive: true,
        isPastDue: !usePass && status === 'past_due',
        cancelAtPeriodEnd: !usePass && !!sub?.cancel_at_period_end,
        currentPeriodEnd: usePass ? (passEndsAt ?? null) : (sub?.current_period_end ?? null),
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
