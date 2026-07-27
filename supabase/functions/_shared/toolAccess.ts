// deno-lint-ignore-file no-explicit-any
/**
 * Server-side tool-access resolver.
 *
 * Mirrors src/hooks/useToolAccess.ts. Edge functions that expose paid
 * functionality (PermitPath Plus, PricePilot, etc.) call `assertToolAccess`
 * to gate the request before doing any work. UI-only hiding is not enough.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

export type ToolSlug =
  | 'permitpath'
  | 'pricepilot'
  | 'listing-studio'
  | 'marketing-studio'
  | 'concept-lab'
  | 'market-radar'
  | 'buildkit'
  | 'startup-guide'
  | 'regulations-hub';

type Tier = 'free' | 'starter' | 'pro' | 'premium';

const TIER_RANK: Record<Tier, number> = { free: 0, starter: 1, pro: 2, premium: 3 };
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

const TOOL_TIER: Record<ToolSlug, Tier> = {
  'permitpath': 'free',
  'startup-guide': 'free',
  'regulations-hub': 'free',
  'pricepilot': 'pro',
  'listing-studio': 'pro',
  'marketing-studio': 'pro',
  'concept-lab': 'pro',
  'market-radar': 'pro',
  'buildkit': 'premium',
};

const TOOL_UNLOCK_SLUG: Partial<Record<ToolSlug, string>> = {
  'permitpath': 'permit_path_plus',
  'pricepilot': 'tool_pricepilot',
  'listing-studio': 'tool_listing_studio',
  'marketing-studio': 'tool_marketing_studio',
  'concept-lab': 'tool_concept_lab',
  'market-radar': 'tool_market_radar',
  'buildkit': 'tool_buildkit',
};

export type ToolAccessReason =
  | 'free' | 'subscription' | 'purchase' | 'grandfathered' | 'locked';

// Exported for unit tests. Keep in lockstep with
// src/hooks/useHostEntitlements.ts:resolveTier.
export function resolveTierFromSub(raw: string | null | undefined): Tier {
  if (!raw) return 'free';
  const k = raw.toLowerCase().replace(/_annual$/, '').replace(/_monthly$/, '');
  if (k === 'starter' || k === 'seller_plus' || k === 'seller-plus' || k === 'host_starter' || k === 'host-starter') return 'starter';
  // `host_pro` is a legacy alias from before the catalog was renamed to host_growth.
  if (k === 'pro' || k === 'host_pro' || k === 'host-pro' || k === 'host_growth' || k === 'host-growth') return 'pro';
  if (k === 'premium' || k === 'host_operator' || k === 'host-operator') return 'premium';
  return 'free';
}

export interface ToolAccessResult {
  unlocked: boolean;
  reason: ToolAccessReason;
  tier: Tier;
  userId: string;
  tool: ToolSlug;
}

export async function resolveToolAccess(userId: string, tool: ToolSlug): Promise<ToolAccessResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  const minTier = TOOL_TIER[tool] ?? 'premium';
  if (minTier === 'free') {
    return { unlocked: true, reason: 'free', tier: 'free', userId, tool };
  }

  // 1) Subscription
  const { data: sub } = await admin
    .from('host_subscriptions')
    .select('tier,status')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let tier: Tier = 'free';
  if (sub && ACTIVE_STATUSES.has(sub.status ?? '')) {
    tier = resolveTierFromSub(sub.tier);
    if (TIER_RANK[tier] >= TIER_RANK[minTier]) {
      return { unlocked: true, reason: 'subscription', tier, userId, tool };
    }
  }

  // 2) One-time unlock purchase
  const unlockSlug = TOOL_UNLOCK_SLUG[tool];
  if (unlockSlug) {
    const { data: purchase } = await admin
      .from('monetization_purchases')
      .select('id,status,monetization_products!inner(slug)')
      .eq('user_id', userId)
      .eq('monetization_products.slug', unlockSlug)
      .in('status', ['paid', 'fulfilled'])
      .limit(1)
      .maybeSingle();
    if (purchase) return { unlocked: true, reason: 'purchase', tier, userId, tool };
  }

  // 3) PermitPath grandfathering
  if (tool === 'permitpath') {
    const [{ count: c1 }, { count: c2 }] = await Promise.all([
      admin.from('saved_permit_roadmaps').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      admin.from('permit_items').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    if ((c1 ?? 0) + (c2 ?? 0) > 0) {
      return { unlocked: true, reason: 'grandfathered', tier, userId, tool };
    }
  }

  return { unlocked: false, reason: 'locked', tier, userId, tool };
}

/**
 * Convenience: throw a 403 Response (unified entitlement error) if the caller
 * cannot access the tool.
 */
export async function assertToolAccess(userId: string, tool: ToolSlug, _corsHeaders: Record<string, string>): Promise<ToolAccessResult> {
  const res = await resolveToolAccess(userId, tool);
  if (!res.unlocked) {
    const { entitlementError } = await import('./jsonError.ts');
    throw entitlementError({
      tool,
      current: res.tier,
      requires: TOOL_TIER[tool],
      feature: tool,
      extra: { unlock_product_slug: TOOL_UNLOCK_SLUG[tool] ?? null },
    });
  }
  return res;
}
