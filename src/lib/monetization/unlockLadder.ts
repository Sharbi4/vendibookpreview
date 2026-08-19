/**
 * Unlock ladder resolver — MAX TWO OPTIONS, cheapest first.
 *
 * Consumed by <UnlockLadder /> and <ToolUnlockDialog />. Never returns a
 * tier that doesn't actually include the feature. Never leads with the
 * most expensive tier. If the caller passes a `currentTier`, upgrade is
 * framed as the honest price difference ("Upgrade to Vendibook Pro").
 */
import { getToolBySlug, type ToolTier } from '@/lib/tools/catalog';
import type { MonetizationProduct } from './products';

export type LadderKind = 'one_time' | 'weekly_pass' | 'subscription' | 'upgrade';

export interface LadderOption {
  kind: LadderKind;
  productSlug: string;
  productName: string;
  /** Display price ("$29"). For upgrade rows this is the DIFFERENCE ("+$50/mo"). */
  priceLabel: string;
  /** e.g. "one-time", "7-day pass", "/mo". */
  cadenceLabel: string;
  /** One-line honest framing. */
  reason: string;
  /** True for the recommended row. */
  bestValue?: boolean;
  /** Raw product handed to the checkout flow. */
  product: MonetizationProduct;
}

// Every paid tool tier now resolves to the single active subscription,
// Vendibook Pro. Retired Starter/Growth/Operator slugs must never be offered.
const TIER_TO_SLUG: Record<Exclude<ToolTier, 'free'>, string> = {
  starter: 'vendibook_pro',
  pro: 'vendibook_pro',
  premium: 'vendibook_pro',
};

const TIER_RANK: Record<ToolTier, number> = {
  free: 0, starter: 1, pro: 2, premium: 3,
};

const usd = (cents: number): string =>
  `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: cents % 100 === 0 ? 0 : 2 })}`;

const GROWTH_MATH =
  'Includes all 6 premium tools + featured placement — cancel anytime.';

/**
 * Build the ladder for a specific tool. Returns at most 2 options.
 *
 * @param toolSlug     the tool the user is trying to unlock
 * @param products     the full active monetization_products list
 * @param currentTier  the caller's current entitlement tier ('free' if none)
 */
export function resolveUnlockLadder(
  toolSlug: string,
  products: MonetizationProduct[],
  currentTier: ToolTier = 'free',
): LadderOption[] {
  const tool = getToolBySlug(toolSlug);
  if (!tool || tool.minTier === 'free') return [];

  // Already unlocked by their current subscription — no ladder needed.
  if (TIER_RANK[currentTier] >= TIER_RANK[tool.minTier]) return [];

  const bySlug = new Map(products.map((p) => [p.slug, p]));

  // If they're already on a paid tier below the requirement, show ONLY the
  // honest upgrade-diff to the minimum tier that unlocks the feature.
  if (currentTier !== 'free') {
    const currentSub = bySlug.get(TIER_TO_SLUG[currentTier as Exclude<ToolTier, 'free'>]);
    const targetSub = bySlug.get(TIER_TO_SLUG[tool.minTier]);
    if (currentSub && targetSub && targetSub.price_cents > currentSub.price_cents) {
      const diff = targetSub.price_cents - currentSub.price_cents;
      return [
        {
          kind: 'upgrade',
          productSlug: targetSub.slug,
          productName: `Upgrade to ${targetSub.name}`,
          priceLabel: `+${usd(diff)}`,
          cadenceLabel: '/mo more',
          reason: `Unlocks ${tool.name} and everything else in ${targetSub.name}.`,
          bestValue: true,
          product: targetSub,
        },
      ];
    }
  }

  // Free (or unknown) user: cheapest unlock + best-value tier.
  let cheapest: LadderOption | null = null;
  let bestValue: LadderOption | null = null;

  // Cheapest = one-time SKU if it exists, otherwise weekly pass for pro tools,
  // otherwise the lowest sub that includes the tool.
  if (tool.unlockProductSlug) {
    const p = bySlug.get(tool.unlockProductSlug);
    if (p) {
      cheapest = {
        kind: 'one_time',
        productSlug: p.slug,
        productName: `Unlock ${tool.name}`,
        priceLabel: usd(p.price_cents),
        cadenceLabel: 'one-time',
        reason: `One purchase, unlocks ${tool.name}. No subscription.`,
        product: p,
      };
    }
  }
  const minSub = bySlug.get(TIER_TO_SLUG[tool.minTier]);
  if (!cheapest && minSub) {
    cheapest = {
      kind: 'subscription',
      productSlug: minSub.slug,
      productName: minSub.name,
      priceLabel: usd(minSub.price_cents),
      cadenceLabel: '/mo',
      reason: `Lowest plan that includes ${tool.name}. Cancel anytime.`,
      product: minSub,
    };
  }

  // Best-value = Vendibook Pro if it covers the tool, otherwise the min sub.
  const growth = bySlug.get('vendibook_pro');
  if (growth && TIER_RANK.pro >= TIER_RANK[tool.minTier]) {
    bestValue = {
      kind: 'subscription',
      productSlug: growth.slug,
      productName: growth.name,
      priceLabel: usd(growth.price_cents),
      cadenceLabel: '/mo',
      reason: GROWTH_MATH,
      bestValue: true,
      product: growth,
    };
  } else if (minSub) {
    // Fallback when Vendibook Pro isn't in the catalog payload.
    bestValue = {
      kind: 'subscription',
      productSlug: minSub.slug,
      productName: minSub.name,
      priceLabel: usd(minSub.price_cents),
      cadenceLabel: '/mo',
      reason: `Includes ${tool.name} and every premium tool.`,
      bestValue: true,
      product: minSub,
    };
  }

  const result: LadderOption[] = [];
  if (cheapest) result.push(cheapest);
  if (bestValue && bestValue.productSlug !== cheapest?.productSlug) result.push(bestValue);
  return result.slice(0, 2);
}

/** Compact one-liner for headers. */
export function ladderHeadline(toolName: string, ladder: LadderOption[]): string {
  if (ladder.length === 0) return `Unlock ${toolName}`;
  const parts = ladder.map((o) =>
    o.kind === 'one_time' ? `${o.priceLabel} once`
    : o.kind === 'weekly_pass' ? `${o.priceLabel} for a week`
    : o.kind === 'upgrade' ? `${o.priceLabel}${o.cadenceLabel}`
    : `${o.priceLabel}${o.cadenceLabel}`,
  );
  return `Unlock ${toolName} — ${parts.join(' · ')}`;
}
