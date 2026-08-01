/**
 * Canonical public-listing visibility rules (client mirror of the database
 * policy `Public can view eligible listings` + `listing_purchase_state`).
 *
 * A listing may only appear in public surfaces when it is published, has a
 * publish timestamp, is not soft-deleted, and has a clear moderation status.
 * Owner suspension is enforced by RLS server-side.
 *
 * Use `applyPublicListingFilter(query)` on EVERY public listing query:
 * homepage, search, category pages, maps, recommendations, related listings,
 * public profiles, favorites, saved searches, recently viewed, feeds, sitemap.
 */

export const PUBLIC_LISTING_STATUS = "published" as const;

/** Statuses that must never be shown publicly or transacted on. */
export const UNAVAILABLE_LISTING_STATUSES = [
  "draft",
  "pending_review",
  "rejected",
  "paused",
  "removed",
  "deleted",
  "archived",
  "suspended",
  "expired",
] as const;

export const LISTING_UNAVAILABLE_TITLE = "This listing is no longer available.";
export const LISTING_UNAVAILABLE_BODY =
  "It may have been paused, removed, sold, or archived.";
export const LISTING_UNAVAILABLE_PAYMENT_MESSAGE =
  "This listing is no longer available and no payment was created.";

type AnyQuery = {
  eq: (col: string, val: unknown) => AnyQuery;
  is: (col: string, val: unknown) => AnyQuery;
  not: (col: string, op: string, val: unknown) => AnyQuery;
};

/** Applies the canonical public eligibility predicate to a listings query. */
export function applyPublicListingFilter<T extends AnyQuery>(query: T): T {
  return query
    .eq("status", PUBLIC_LISTING_STATUS)
    .not("published_at", "is", null)
    .is("deleted_at", null)
    .eq("moderation_status", "clear") as T;
}

export type VisibilityShape = {
  status?: string | null;
  published_at?: string | null;
  deleted_at?: string | null;
  moderation_status?: string | null;
};

/** Row-level mirror of the same rule, for already-fetched listings. */
export function isListingPubliclyVisible(
  listing: VisibilityShape | null | undefined,
): boolean {
  if (!listing) return false;
  if (listing.status !== PUBLIC_LISTING_STATUS) return false;
  if (!listing.published_at) return false;
  if (listing.deleted_at) return false;
  if ((listing.moderation_status ?? "clear") !== "clear") return false;
  return true;
}

/** Purchase/booking/boost eligibility mirrors public visibility exactly. */
export function isListingPurchasable(
  listing: VisibilityShape | null | undefined,
): boolean {
  return isListingPubliclyVisible(listing);
}

/** Boost / feature / paid promotion eligibility for the host dashboard. */
export function canBoostListing(
  listing: VisibilityShape | null | undefined,
): boolean {
  return isListingPurchasable(listing);
}

/** True when the host should be shown "Republish" instead of "Boost". */
export function canRepublishListing(
  listing: VisibilityShape | null | undefined,
): boolean {
  if (!listing || listing.deleted_at) return false;
  if ((listing.moderation_status ?? "clear") !== "clear") return false;
  return listing.status === "paused" || listing.status === "draft" ||
    listing.status === "archived";
}
