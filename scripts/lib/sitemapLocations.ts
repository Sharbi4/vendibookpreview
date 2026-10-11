import { CITY_DATA, CATEGORY_TO_SLUG, getCityStateSlug } from '../../src/data/cityData';
import { US_STATES } from '../../src/lib/vendi-listing/extract';

type LocationListing = { city: string | null; state: string | null; category: string | null; mode: string | null; updated_at: string | null };

/** Only existing routes backed by inventory in that mode belong in the sitemap. */
export function locationSitemapEntries(listings: LocationListing[]) {
  const entries = new Map<string, string | null>();
  for (const listing of listings) {
    const state = listing.state?.trim().toLowerCase() ?? '';
    const stateCode = US_STATES[state] ?? state.toUpperCase();
    const city = Object.values(CITY_DATA).find(c => c.name.toLowerCase() === listing.city?.trim().toLowerCase()
      && c.stateCode === stateCode);
    const category = listing.category && CATEGORY_TO_SLUG[listing.category];
    if (!city || !category || !['sale', 'rent'].includes(listing.mode ?? '')) continue;
    const lastmod = listing.updated_at?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
    for (const path of [`/${city.slug}`, `/${listing.mode === 'sale' ? 'buy' : 'rent'}/${category}/${getCityStateSlug(city)}`]) {
      const previous = entries.get(path);
      if (!entries.has(path) || lastmod && (!previous || lastmod > previous)) entries.set(path, lastmod);
    }
  }
  return [...entries].sort(([a], [b]) => a.localeCompare(b)).map(([path, lastmod]) => ({ path, lastmod }));
}
