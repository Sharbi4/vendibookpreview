/**
 * Unlock ladder resolver.
 *
 * For a given premium tool slug, returns the ordered list of ways to unlock
 * it — cheapest first. Never returns a tier that doesn't actually include
 * the feature. Consumed by <UnlockLadder /> and <ToolUnlockDialog />.
 */
import { getToolBySlug, type ToolTier } from '@/lib/tools/catalog';
import type { MonetizationProduct } from './products';

export type LadderKind = 'one_time' | 'weekly_pass' | 'subscription';

export interface LadderOption {
  kind: LadderKind;
  productSlug: string;
  productName: string;
  /** Display price (formatted like "$29"). */
  priceLabel: string;
  /** e.g. "one-time · unlocks this tool", "7-day pass", "/mo". */
  cadenceLabel: string;
  /** One-line honest framing. */
  reason: string;
  /** True for the recommended row. */
  bestValue?: boolean;
  /** Raw product (needed to hand to the checkout flow). */
  product: MonetizationProduct;
}

const TIER_TO_SLUG: Record<Exclude<ToolTier, 'free'>, string> = {
  starter: 'host_starter',
  pro: 'host_growth',
  premium: 'host_operator',
};

const usd = (cents: number): string =>
  `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: cents % 100 === 0 ? 0 : 2 })}`;

/**
 * Build the ladder for a specific tool.
 *
 * @param toolSlug   the tool the user is trying to unlock
 * @param products   the full active monetization_products list (any category)
 */
export function resolveUnlockLadder(
  toolSlug: string,
  products: MonetizationProduct[],
): LadderOption[] {
  const tool = getToolBySlug(toolSlug);
  if (!tool || tool.minTier === 'free') return [];

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const ladder: LadderOption[] = [];

  // 1. One-time unlock for this specific tool (cheapest first).
  if (tool.unlockProductSlug) {
    const p = bySlug.get(tool.unlockProductSlug);
    if (p) {
      ladder.push({
        kind: 'one_time',
        productSlug: p.slug,
        productName: p.name,
        priceLabel: usd(p.price_cents),
        cadenceLabel: 'one-time',
        reason: `Unlocks ${tool.name} — no subscription.`,
        product: p,
      });
    }
  }

  // 2. Pro Weekly Pass — only for pro-tier tools (the pass grants tier=pro).
  if (tool.minTier === 'pro') {
    const wk = bySlug.get('pro_weekly_pass');
    if (wk) {
      ladder.push({
        kind: 'weekly_pass',
        productSlug: wk.slug,
        productName: wk.name,
        priceLabel: usd(wk.price_cents),
        cadenceLabel: '7-day pass',
        reason: 'Unlocks every Growth tool for a week — no subscription.',
        product: wk,
      });
    }
  }

  // 3. Subscription tier that includes the tool. Always include the *lowest*
  //    tier that includes it, plus Growth as the "best value" anchor when it
  //    covers this tool and isn't already the lowest one.
  const growthMath =
    'Includes this and all 6 premium tools — bought separately these run $150+/mo.';

  const minSubSlug = TIER_TO_SLUG[tool.minTier];
  const minSub = bySlug.get(minSubSlug);
  if (minSub) {
    const isGrowth = minSubSlug === 'host_growth';
    ladder.push({
      kind: 'subscription',
      productSlug: minSub.slug,
      productName: minSub.name,
      priceLabel: usd(minSub.price_cents),
      cadenceLabel: '/mo',
      reason: isGrowth
        ? growthMath
        : `Includes ${tool.name} plus enhanced listing tools. Cancel anytime.`,
      bestValue: isGrowth,
      product: minSub,
    });
  }

  // 4. For starter-tier tools, also surface Growth as the best-value anchor.
  if (tool.minTier === 'starter') {
    const growth = bySlug.get('host_growth');
    if (growth) {
      ladder.push({
        kind: 'subscription',
        productSlug: growth.slug,
        productName: growth.name,
        priceLabel: usd(growth.price_cents),
        cadenceLabel: '/mo',
        reason: growthMath,
        bestValue: true,
        product: growth,
      });
    }
  }

  return ladder;
}


/**
 * Compact honest one-liner for the ladder header, e.g.:
 *   "Unlock PricePilot — $29 for a week · Included in Growth $89/mo"
 */
export function ladderHeadline(toolName: string, ladder: LadderOption[]): string {
  if (ladder.length === 0) return `Unlock ${toolName}`;
  const parts = ladder.map((o) => {
    if (o.kind === 'one_time') return `${o.priceLabel} once`;
    if (o.kind === 'weekly_pass') return `${o.priceLabel} for a week`;
    return `${o.priceLabel}${o.cadenceLabel}`;
  });
  return `Unlock ${toolName} — ${parts.join(' · ')}`;
}
