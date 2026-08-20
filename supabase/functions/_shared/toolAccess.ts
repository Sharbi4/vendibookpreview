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

/**
 * PermitPath note: the Basic checklist is free and never calls this resolver.
 * `permitpath` here means the PLUS layer (save, track, documents, reminders,
 * PDF export), which needs an active PermitPath Plus subscription or
 * Vendibook Pro. Keep in lockstep with src/lib/permits/permitPathAccess.ts.
 */
const TOOL_TIER: Record<ToolSlug, Tier> = {
  'permitpath': 'pro',
  'startup-guide': 'free',
  'regulations-hub': 'free',
  'pricepilot': 'pro',
  'listing-studio': 'pro',
  'marketing-studio': 'pro',
  'concept-lab': 'pro',
  'market-radar': 'pro',
  'buildkit': 'pro',
};

const TOOL_UNLOCK_SLUG: Partial<Record<ToolSlug, string>> = {
  'permitpath': 'permit_path_plus_monthly',
  'pricepilot': 'tool_pricepilot',
  'listing-studio': 'tool_listing_studio',
  'marketing-studio': 'tool_marketing_studio',
  'concept-lab': 'tool_concept_lab',
  'market-radar': 'tool_market_radar',
  'buildkit': 'tool_buildkit',
};

// All product slugs that unlock a tool, including retired SKUs kept for
// grandfathering. TOOL_UNLOCK_SLUG above is the slug we sell today.
const TOOL_UNLOCK_SLUGS: Partial<Record<ToolSlug, string[]>> = {
  'permitpath': ['permit_path_plus_monthly', 'permit_path_plus'],
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
  if (k === 'pro' || k === 'vendibook_pro' || k === 'vendibook-pro' || k === 'host_pro' || k === 'host-pro' || k === 'host_growth' || k === 'host-growth') return 'pro';
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

  // 1) Subscription — read every row: a member can hold Vendibook Pro and a
  // product subscription (e.g. PermitPath Plus) at the same time.
  const { data: subs } = await admin
    .from('host_subscriptions')
    .select('tier,status')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  const activeSubs = (subs ?? []).filter((s: { status?: string | null }) =>
    ACTIVE_STATUSES.has(s.status ?? ''),
  );

  // A standalone PermitPath Plus subscription unlocks PermitPath only.
  if (
    tool === 'permitpath' &&
    activeSubs.some((s: { tier?: string | null }) =>
      String(s.tier ?? '').toLowerCase().startsWith('permit_path_plus'),
    )
  ) {
    return { unlocked: true, reason: 'subscription', tier: 'free', userId, tool };
  }

  let tier: Tier = 'free';
  for (const s of activeSubs) {
    const t = resolveTierFromSub((s as { tier?: string | null }).tier);
    if (TIER_RANK[t] > TIER_RANK[tier]) tier = t;
  }
  if (TIER_RANK[tier] >= TIER_RANK[minTier]) {
    return { unlocked: true, reason: 'subscription', tier, userId, tool };
  }

  // 2) One-time unlock purchase
  const unlockSlugs = TOOL_UNLOCK_SLUGS[tool] ??
    (TOOL_UNLOCK_SLUG[tool] ? [TOOL_UNLOCK_SLUG[tool]!] : []);
  if (unlockSlugs.length) {
    const { data: purchase } = await admin
      .from('monetization_purchases')
      .select('id,status,monetization_products!inner(slug)')
      .eq('user_id', userId)
      .in('monetization_products.slug', unlockSlugs)
      .in('status', ['paid', 'fulfilled'])
      .limit(1)
      .maybeSingle();
    if (purchase) return { unlocked: true, reason: 'purchase', tier, userId, tool };
  }

  // 3) PermitPath grandfathering — durable entitlement row written when
  // Basic/Plus gating shipped. Never inferred from data timestamps.
  if (tool === 'permitpath') {
    const { data: gf } = await admin
      .from('permit_path_grandfathered')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (gf) return { unlocked: true, reason: 'grandfathered', tier, userId, tool };
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
