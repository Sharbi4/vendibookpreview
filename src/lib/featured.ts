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
