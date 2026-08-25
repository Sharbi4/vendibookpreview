/**
 * Single source of truth for user-facing prices.
 *
 * Every price shown in a modal, upgrade card, dashboard upsell, tool gate,
 * checkout summary or confirmation screen must come from
 * `monetization_products` (the same row PayPal is charged against).
 *
 * The fallbacks below exist ONLY so a first paint before the catalog query
 * resolves never renders an empty price. They mirror the live catalog and are
 * asserted in tests — they are not an alternate pricing table.
 */

import { formatUsd } from './products';

export const ACTIVE_PRODUCT_SLUGS = {
  vendibookPro: 'vendibook_pro',
  permitPathPlus: 'permit_path_plus_monthly',
  proListing: 'pro_listing_30',
  featuredBoost: 'boost-featured-30',
  conciergeListing: 'listing_concierge',
  listingRewrite: 'listing_rewrite',
  pricePilot: 'tool_pricepilot',
} as const;

export type ActiveProductSlug =
  (typeof ACTIVE_PRODUCT_SLUGS)[keyof typeof ACTIVE_PRODUCT_SLUGS];

/** Mirrors monetization_products.price_cents for the ACTIVE catalog. */
export const FALLBACK_PRICE_CENTS: Record<string, number> = {
  vendibook_pro: 7900,
  permit_path_plus_monthly: 799,
  permit_path_plus: 799,
  pro_listing_30: 6900,
  'boost-featured-30': 4900,
  listing_concierge: 7900,
  listing_rewrite: 5900,
  tool_pricepilot: 1900,
};

/** Mirrors monetization_products.billing_type / duration_days. */
export const FALLBACK_CADENCE: Record<
  string,
  { billing_type: 'one_time' | 'recurring'; duration_days: number | null }
> = {
  vendibook_pro: { billing_type: 'recurring', duration_days: null },
  permit_path_plus_monthly: { billing_type: 'recurring', duration_days: null },
  permit_path_plus: { billing_type: 'recurring', duration_days: null },
  pro_listing_30: { billing_type: 'one_time', duration_days: 30 },
  'boost-featured-30': { billing_type: 'one_time', duration_days: 30 },
  listing_concierge: { billing_type: 'one_time', duration_days: null },
  listing_rewrite: { billing_type: 'one_time', duration_days: null },
  tool_pricepilot: { billing_type: 'one_time', duration_days: null },
};

/**
 * Slugs that are no longer sold. They may still appear in purchase history and
 * grandfathered entitlements, but must never be priced in new-purchase UI.
 */
export const RETIRED_PRODUCT_SLUGS = new Set<string>([
  'host_starter',
  'host_starter_annual',
  'host_growth',
  'host_growth_annual',
  'host_operator',
  'host_operator_annual',
  'seller_plus_monthly',
  'seller_plus_annual',
  'pro_weekly_pass',
  'featured-listing-30',
  'seller-pro',
  'white-glove-seller',
  'boost-featured-7',
  'boost-top-of-search',
  'boost-highlight',
  'boost-motivated-seller',
  'boost-email-campaign',
  'boost-social-feature',
]);

export const isRetiredProduct = (slug: string) => RETIRED_PRODUCT_SLUGS.has(slug);

export interface CatalogPriceShape {
  slug: string;
  name?: string | null;
  price_cents: number;
  billing_type: 'one_time' | 'recurring' | 'percentage' | 'custom';
  duration_days: number | null;
}

/** "$49" / "$7.99" — no cadence. */
export const priceLabel = (cents: number): string => formatUsd(cents);

/** "/mo" for recurring, "" otherwise. */
export const cadenceSuffix = (billing_type: string): string =>
  billing_type === 'recurring' ? '/mo' : '';

/** "$79/mo" or "$49". */
export const priceWithCadence = (p: CatalogPriceShape): string =>
  `${priceLabel(p.price_cents)}${cadenceSuffix(p.billing_type)}`;

/** "$79/mo · billed monthly" or "$49 one-time · 30 days". */
export const priceDetailLabel = (p: CatalogPriceShape): string => {
  if (p.billing_type === 'recurring') return `${priceLabel(p.price_cents)}/mo · billed monthly`;
  const duration = p.duration_days ? ` · ${p.duration_days} days` : '';
  return `${priceLabel(p.price_cents)} one-time${duration}`;
};

/** Catalog cents for a slug, falling back to the mirrored active price. */
export const fallbackPriceCents = (slug: string): number =>
  FALLBACK_PRICE_CENTS[slug] ?? 0;
