/**
 * Server-side host tier resolver — single source of truth for tier gating
 * across edge functions. Query the live DB every call (no caching) so that
 * expired subscriptions revert access immediately.
 *
 * Returns 'free' | 'starter' | 'pro' | 'premium'.
 *
 * A row in host_subscriptions with status IN ('active','trialing','past_due')
 * or a still-valid one-time monetization_purchases row for a subscription-
 * equivalent SKU (weekly pass) counts.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export type HostTier = 'free' | 'starter' | 'pro' | 'premium';

const TIER_RANK: Record<HostTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  premium: 3,
};

/** Normalize any DB tier / slug into a canonical rank tier. */
function normalizeTier(input: string | null | undefined): HostTier {
  if (!input) return 'free';
  const s = String(input).toLowerCase();
  if (s.includes('operator') || s === 'premium') return 'premium';
  if (s.includes('growth') || s === 'pro') return 'pro';
  if (s.includes('starter')) return 'starter';
  return 'free';
}

/** Resolve tier for a user. Never throws — returns 'free' on any failure. */
export async function resolveHostTier(userId: string): Promise<HostTier> {
  if (!userId) return 'free';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  let tier: HostTier = 'free';

  // 1. Active recurring subscription
  const { data: subs } = await supabase
    .from('host_subscriptions')
    .select('tier, status, current_period_end')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(3);

  for (const s of subs ?? []) {
    const t = normalizeTier(s.tier);
    if (TIER_RANK[t] > TIER_RANK[tier]) tier = t;
  }

  // 2. Time-boxed one-time purchase (weekly pass, etc.)
  const nowIso = new Date().toISOString();
  const { data: passes } = await supabase
    .from('monetization_purchases')
    .select('product_slug, access_ends_at, status')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .gt('access_ends_at', nowIso)
    .limit(5);

  for (const p of passes ?? []) {
    if ((p.product_slug ?? '').includes('pro_weekly_pass')) {
      if (TIER_RANK.pro > TIER_RANK[tier]) tier = 'pro';
    }
  }

  return tier;
}

/** True when the user's live tier meets or exceeds the required tier. */
export function tierAtLeast(actual: HostTier, required: HostTier): boolean {
  return TIER_RANK[actual] >= TIER_RANK[required];
}

/** Standard 403 body when a tier gate fails. */
export function tierRequiredBody(required: HostTier, actual: HostTier) {
  return {
    error: `This feature is included with ${required === 'pro' ? 'Growth' : required === 'premium' ? 'Operator' : 'Starter'} — upgrade to unlock.`,
    code: 'entitlement_required',
    requires: required,
    current: actual,
    upgrade_url: '/pricing',
  };
}

