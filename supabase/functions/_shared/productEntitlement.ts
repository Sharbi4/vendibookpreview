/**
 * Classify a monetization_products row into an entitlement bucket, and
 * expose the target tier / tool slug that the buyer would gain access to.
 * Consumed by create-monetization-checkout to gate double-purchases.
 */
import type { HostTier } from './resolveHostTier.ts';
import type { ToolSlug } from './toolAccess.ts';

export type ProductKind =
  | 'subscription'   // recurring host tier
  | 'weekly_pass'    // time-boxed tier equivalent (Pro Weekly Pass)
  | 'tool_unlock'    // one-time unlock for a single tool
  | 'addon';         // everything else (featured boost, notary, freight...)

export interface ClassifiedProduct {
  kind: ProductKind;
  grantsTier?: HostTier;
  toolSlug?: ToolSlug;
}

// Mirrors TOOL_UNLOCK_SLUG in _shared/toolAccess.ts (reverse map).
const UNLOCK_SLUG_TO_TOOL: Record<string, ToolSlug> = {
  permit_path_plus: 'permitpath',
  tool_pricepilot: 'pricepilot',
  tool_listing_studio: 'listing-studio',
  tool_marketing_studio: 'marketing-studio',
  tool_concept_lab: 'concept-lab',
  tool_market_radar: 'market-radar',
  tool_buildkit: 'buildkit',
};

function tierFromSlug(slug: string): HostTier | undefined {
  const s = slug.toLowerCase();
  if (s.includes('operator') || s.includes('premium')) return 'premium';
  if (s.includes('growth') || s === 'pro' || s.startsWith('pro_') || s.startsWith('pro-')) return 'pro';
  if (s.includes('starter')) return 'starter';
  return undefined;
}

export function classifyProduct(product: {
  slug: string;
  billing_type: string | null;
  metadata?: Record<string, unknown> | null;
}): ClassifiedProduct {
  const slug = (product.slug ?? '').toLowerCase();
  const meta = (product.metadata ?? {}) as Record<string, unknown>;

  // Tool unlock takes precedence — some tool SKUs are one-time payments.
  const toolSlug = UNLOCK_SLUG_TO_TOOL[slug];
  if (toolSlug) return { kind: 'tool_unlock', toolSlug };

  if (product.billing_type === 'recurring') {
    return { kind: 'subscription', grantsTier: tierFromSlug(slug) ?? 'starter' };
  }

  // Time-boxed pass: one-time SKU whose metadata.grants_tier or slug names a tier.
  const grantsTierRaw = typeof meta.grants_tier === 'string' ? meta.grants_tier : null;
  const grantsTier = grantsTierRaw ? tierFromSlug(grantsTierRaw) : tierFromSlug(slug);
  if (slug.includes('weekly_pass') || slug.includes('week_pass') || grantsTier) {
    if (grantsTier) return { kind: 'weekly_pass', grantsTier };
  }

  return { kind: 'addon' };
}
