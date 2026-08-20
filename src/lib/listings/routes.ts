/**
 * Canonical listing route map.
 *
 * The self-service flow is:
 *   /list            opening choice page (self-serve vs concierge)
 *   /list/start      QuickStart wizard entry — creates the draft
 *   /create-listing/:listingId   PublishWizard (draft continuation)
 *   /edit-listing/:listingId     PublishWizard (published listing edit)
 *   /listing-published/:listingId  post-publish surface
 *
 * `/list/start` accepts `mode` (sale|rent) and `category` query params so
 * seller landing pages can drop a host straight into the right path without
 * asking a question the visitor already answered.
 *
 * Legacy entries are redirects, never parallel wizards.
 */
export const LISTING_ROUTES = {
  /** Opening choice page — the front door for new listings. */
  gateway: '/list',
  /** Same page as the gateway; kept for older call sites. */
  hub: '/list',
  /** QuickStart wizard entry. */
  quickStart: '/list/start',
  /** Concierge introduction / intake placeholder. */
  conciergeIntro: '/list/concierge',
  /** Draft continuation (PublishWizard). */
  resume: (listingId: string) => `/create-listing/${listingId}`,
  /** Published listing edit (PublishWizard). */
  edit: (listingId: string) => `/edit-listing/${listingId}`,
  /** Post-publish surface. */
  published: (listingId: string) => `/listing-published/${listingId}`,
} as const;

/** QuickStart entry pre-seeded with what the visitor already told us. */
export const quickStartWith = (
  params: { mode?: 'sale' | 'rent'; category?: string } = {},
): string => {
  const search = new URLSearchParams();
  if (params.mode) search.set('mode', params.mode);
  if (params.category) search.set('category', params.category);
  const qs = search.toString();
  return qs ? `${LISTING_ROUTES.quickStart}?${qs}` : LISTING_ROUTES.quickStart;
};

/** Legacy paths that must redirect into the canonical flow. */
export const LEGACY_LISTING_REDIRECTS: Record<string, string> = {
  '/create-listing': LISTING_ROUTES.gateway,
  '/new-listing': LISTING_ROUTES.gateway,
  '/listing-wizard': LISTING_ROUTES.gateway,
};

/** Builds an /auth redirect that returns the user to `target` after sign-in. */
export const authReturnTo = (target: string): string =>
  `/auth?redirect=${encodeURIComponent(target)}`;
