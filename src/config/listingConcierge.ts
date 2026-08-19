/**
 * Single source of truth for VendiBook Listing Concierge presentation values.
 *
 * These values are displayed on the listing gateway and the concierge
 * introduction page. They are intentionally centralized here so a later phase
 * can back them with admin settings without hunting hardcoded strings.
 *
 * NOTE: This module is display configuration only. It never charges anything
 * and is not the pricing authority for checkout (that stays server-side in the
 * monetization product catalog).
 */

export interface ConciergeConfig {
  /** Product slug in the monetization catalog. */
  slug: string;
  /** Public product name. */
  name: string;
  /** Price in cents, per listing. */
  priceCents: number;
  /** Short price label, e.g. "$79 per listing". */
  priceLabel: string;
  /** Business-day turnaround shown to sellers. */
  turnaroundBusinessDays: number;
  /** Number of included revisions. */
  includedRevisions: number;
  /** Route for the concierge introduction / intake placeholder. */
  introPath: string;
  /** Concierge Service Terms link (placeholder until the document is published). */
  termsPath: string;
  /** Visible no-guarantee disclosure. */
  noGuaranteeCopy: string;
}

/** Mirrors monetization_products.listing_concierge (the amount PayPal charges). */
const PRICE_CENTS = 7_900;

export const LISTING_CONCIERGE: ConciergeConfig = {
  slug: 'listing_concierge',
  name: 'VendiBook Listing Concierge',
  priceCents: PRICE_CENTS,
  priceLabel: '$79 per listing',
  turnaroundBusinessDays: 2,
  includedRevisions: 1,
  introPath: '/list/concierge',
  termsPath: '/legal/concierge-service-terms',
  noGuaranteeCopy:
    'VendiBook does not guarantee a sale, a rental, a specific price, buyer interest, or any particular timeline. The Listing Concierge is a listing preparation service only.',
};

export const formatUsdCents = (cents: number): string =>
  `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

export const CONCIERGE_BENEFITS: string[] = [
  'Professional title and description',
  'Organized specifications',
  'Pricing guidance',
  'Photo ordering and cover optimization',
  'Equipment Readiness Summary',
  'Condition and disclosure gap review',
  `${LISTING_CONCIERGE.includedRevisions} revision included`,
  'Seller approval before publication',
];

export const SELF_SERVE_BENEFITS: string[] = [
  'Smart category-specific questions',
  'AI-assisted title and description',
  'Live preview',
  'Save and return anytime',
];
