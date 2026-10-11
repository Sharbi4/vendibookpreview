import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useHostEntitlements, type HostTier } from '@/hooks/useHostEntitlements';
import { useEntitlements } from '@/hooks/useEntitlements';
import { TOOLS, type ToolDef } from '@/lib/tools/catalog';

export type ToolAccessReason =
  | 'free'          // tool is free for everyone
  | 'subscription'  // unlocked by active host_subscription tier
  | 'purchase'      // unlocked by one-time monetization_purchase
  | 'grandfathered' // legacy PermitPath user before paid tiers
  | 'locked';       // no access

export interface ToolAccess {
  unlocked: boolean;
  reason: ToolAccessReason;
  tier: HostTier;
  /**
   * True when the PAID layer is unlocked. For tools with a free layer
   * (`hasFreeTier`) `unlocked` stays true so the route opens, while this flag
   * says whether the in-tool paid features are available.
   */
  plusUnlocked: boolean;
}

/**
 * Unified per-tool access resolver.
 *
 * Paid unlocks are evaluated FIRST so a tool that also has a free layer
 * (PermitPath Basic) still reports the correct paid state instead of
 * short-circuiting to "free". Order:
 *   1. active subscription rank ≥ tool.minTier → subscription
 *   2. one-time purchase matching tool.unlockProductSlug → purchase
 *   3. durable PermitPath grandfather entitlement → grandfathered
 *   4. tool.minTier === 'free' or tool.hasFreeTier → free (route open, paid layer locked)
 *   5. locked
 */
export function useToolAccess() {
  const { user } = useAuth();
  const host = useHostEntitlements();
  const ent = useEntitlements();
  const [legacyPermitPath, setLegacyPermitPath] = useState(false);

  useEffect(() => {
    let cancel = false;
    if (!user) { setLegacyPermitPath(false); return; }
    (async () => {
      // Durable entitlement row — never inferred from data timestamps.
      const { data } = await (supabase as any)
        .from('permit_path_grandfathered')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancel) return;
      setLegacyPermitPath(!!data);
    })();
    return () => { cancel = true; };
  }, [user]);

  const resolve = (tool: ToolDef): ToolAccess => {
    if (tool.minTier !== 'free' && host.hasAtLeast(tool.minTier)) {
      return { unlocked: true, reason: 'subscription', tier: host.tier, plusUnlocked: true };
    }
    // A standalone product subscription (e.g. PermitPath Plus) also unlocks.
    if (tool.unlockProductSlug && ent.bySlug[tool.unlockProductSlug]) {
      const st = ent.bySlug[tool.unlockProductSlug].status;
      if (st === 'paid' || st === 'fulfilled' || st === 'active') {
        return { unlocked: true, reason: 'purchase', tier: host.tier, plusUnlocked: true };
      }
    }
    // Grandfather clause: users who already had PermitPath data when gating
    // shipped keep PermitPath Plus access forever (durable DB entitlement).
    if (tool.slug === 'permitpath' && legacyPermitPath) {
      return { unlocked: true, reason: 'grandfathered', tier: host.tier, plusUnlocked: true };
    }
    if (tool.minTier === 'free' || tool.hasFreeTier) {
      return { unlocked: true, reason: 'free', tier: host.tier, plusUnlocked: false };
    }
    return { unlocked: false, reason: 'locked', tier: host.tier, plusUnlocked: false };
  };

  const bySlug: Record<string, ToolAccess> = {};
  for (const t of TOOLS) bySlug[t.slug] = resolve(t);


  return {
    resolve,
    bySlug,
    hostTier: host.tier,
    hostLabel: host.planLabel,
    isLoading: host.isLoading || ent.loading,
    legacyPermitPath,
  };
}
