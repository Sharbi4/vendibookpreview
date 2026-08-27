/**
 * Source of truth for "is this listing currently featured?"
 *
 * A listing is featured when BOTH conditions hold:
 *   - featured_enabled === true
 *   - featured_expires_at is a valid future timestamp
 *
 * Use this helper everywhere a Featured badge, sort-priority,
 * or promotion UI is rendered. Do NOT inline the check.
 */
export interface FeaturedFields {
  featured_enabled?: boolean | null;
  featured_expires_at?: string | null;
}

export function isListingFeatured(listing: FeaturedFields | null | undefined): boolean {
  if (!listing) return false;
  if (!listing.featured_enabled) return false;
  if (!listing.featured_expires_at) return false;
  const expires = new Date(listing.featured_expires_at).getTime();
  if (Number.isNaN(expires)) return false;
  return expires > Date.now();
}

/** Days remaining on the boost; 0 if expired/not featured. */
export function featuredDaysRemaining(listing: FeaturedFields | null | undefined): number {
  if (!isListingFeatured(listing)) return 0;
  const ms = new Date(listing!.featured_expires_at!).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Deterministic daily rotation key for the featured cohort.
 *
 * Every featured buyer is guaranteed real visibility: the sort key changes each
 * day (UTC), so on any given day a different subset of featured listings sits
 * at the very top of the "featured-first" block. Over a 30-day boost every
 * boosted listing rotates through the top slot.
 *
 * Not cryptographic — just a stable hash of (listing_id + YYYY-MM-DD).
 */
export function dailyFeaturedRotationKey(listingId: string, at: Date = new Date()): number {
  const day = at.toISOString().slice(0, 10); // YYYY-MM-DD
  const seed = `${listingId}|${day}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Stable sort helper: featured-first, then rotated fairly by day among the
 * featured cohort, preserving original order for non-featured items.
 */
export function sortFeaturedFirstFair<T extends FeaturedFields & { id: string }>(
  items: T[],
): T[] {
  const featured = items
    .filter((i) => isListingFeatured(i))
    .map((i) => ({ i, k: dailyFeaturedRotationKey(i.id) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.i);
  const rest = items.filter((i) => !isListingFeatured(i));
  return [...featured, ...rest];
}

/** Window during which a freshly-boosted listing is pinned to the front. */
export const FRESH_BOOST_WINDOW_MS = 72 * 60 * 60 * 1000;

export interface FeaturedWithBoostedAt extends FeaturedFields {
  featured_at?: string | null;
}

/**
 * Featured-first ordering that guarantees a *just-boosted* listing is visible
 * immediately: boosts placed within the last 72h are pinned to the front
 * (newest first), and the remaining featured cohort keeps the fair daily
 * rotation. Non-featured items retain their original order at the end.
 */
export function sortFeaturedFreshFirstThenFair<
  T extends FeaturedWithBoostedAt & { id: string },
>(items: T[]): T[] {
  const now = Date.now();
  const featured = items.filter((i) => isListingFeatured(i));
  const isFresh = (i: T) => {
    if (!i.featured_at) return false;
    const t = new Date(i.featured_at).getTime();
    return !Number.isNaN(t) && now - t < FRESH_BOOST_WINDOW_MS;
  };
  const fresh = featured
    .filter(isFresh)
    .sort(
      (a, b) =>
        new Date(b.featured_at!).getTime() - new Date(a.featured_at!).getTime(),
    );
  const rotated = sortFeaturedFirstFair(featured.filter((i) => !isFresh(i)));
  const rest = items.filter((i) => !isListingFeatured(i));
  return [...fresh, ...rotated, ...rest];
}

/** Window during which a brand-new published listing is pinned to the front. */
export const NEW_LISTING_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface PublishedAtField {
  published_at?: string | null;
}

/**
 * Homepage row ordering: brand-new listings first.
 *
 * Any listing published within the last 48h is pinned to the very front
 * (newest first) so a seller who just published sees their listing at the
 * beginning of the row. Everything after that keeps the existing
 * featured-first + fair daily rotation ordering.
 */
export function sortNewFirstThenFeatured<
  T extends FeaturedFields & PublishedAtField & { id: string },
>(items: T[]): T[] {
  const now = Date.now();
  const publishedTime = (i: T) => {
    if (!i.published_at) return NaN;
    return new Date(i.published_at).getTime();
  };
  const isNew = (i: T) => {
    const t = publishedTime(i);
    return !Number.isNaN(t) && now - t < NEW_LISTING_WINDOW_MS;
  };
  const fresh = items
    .filter(isNew)
    .sort((a, b) => publishedTime(b) - publishedTime(a));
  const rest = sortFeaturedFirstFair(items.filter((i) => !isNew(i)));
  return [...fresh, ...rest];
}


