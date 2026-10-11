import { isListingFeatured, type FeaturedFields } from '@/lib/featured';

type SpotlightListing = FeaturedFields & { id: string; published_at?: string | null };

/** Fill sparse homepage promotions without granting or implying paid entitlements.
 * Inputs come from the homepage's public, moderated, non-test listing queries.
 */
export function buildHomepageSpotlight<T extends SpotlightListing>(
  promoted: readonly T[], candidates: readonly T[], limit = 8,
): T[] {
  if (limit <= 0) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  const append = (item: T) => {
    if (!seen.has(item.id) && result.length < limit) {
      seen.add(item.id);
      result.push(item);
    }
  };
  promoted.filter(isListingFeatured).forEach(append);
  // Any active featured item returned by another public feed still precedes ordinary picks.
  candidates.filter(isListingFeatured).forEach(append);
  const timestamp = (item: T) => {
    const value = Date.parse(item.published_at ?? '');
    return Number.isFinite(value) ? value : 0;
  };
  [...candidates].filter(item => !isListingFeatured(item))
    .sort((a, b) => timestamp(b) - timestamp(a)).forEach(append);
  return result;
}
