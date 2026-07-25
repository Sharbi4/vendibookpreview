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
}

/**
 * Unified per-tool access resolver.
 *
 * Order of precedence:
 *   1. tool.minTier === 'free'  → always unlocked (free)
 *   2. active subscription rank ≥ tool.minTier → subscription
 *   3. one-time purchase matching tool.unlockProductSlug → purchase
 *   4. PermitPath legacy activity (saved roadmap or permit_items) → grandfathered
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
      const [r1, r2] = await Promise.all([
        (supabase as any)
          .from('saved_permit_roadmaps')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        (supabase as any)
          .from('permit_items')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);
      if (cancel) return;
      const total = (r1.count ?? 0) + (r2.count ?? 0);
      setLegacyPermitPath(total > 0);
    })();
    return () => { cancel = true; };
  }, [user]);

  const resolve = (tool: ToolDef): ToolAccess => {
    if (tool.minTier === 'free') {
      return { unlocked: true, reason: 'free', tier: host.tier };
    }
    if (host.hasAtLeast(tool.minTier)) {
      return { unlocked: true, reason: 'subscription', tier: host.tier };
    }
    if (tool.unlockProductSlug && ent.bySlug[tool.unlockProductSlug]) {
      const st = ent.bySlug[tool.unlockProductSlug].status;
      if (st === 'paid' || st === 'fulfilled' || st === 'active') {
        return { unlocked: true, reason: 'purchase', tier: host.tier };
      }
    }
    // Grandfather clause: users who used PermitPath before paid tiers
    // keep PermitPath Plus access forever.
    if (tool.slug === 'permitpath' && legacyPermitPath) {
      return { unlocked: true, reason: 'grandfathered', tier: host.tier };
    }
    return { unlocked: false, reason: 'locked', tier: host.tier };
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
