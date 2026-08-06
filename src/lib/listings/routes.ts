/**
 * Canonical listing route map.
 *
 * The self-service flow is:
 *   /list            marketing + QuickStart entry
 *   /list/start      opening choice page (self-serve vs concierge)
 *   /list?start=true QuickStart questions, creates the draft
 *   /create-listing/:listingId   PublishWizard (draft continuation)
 *   /edit-listing/:listingId     PublishWizard (published listing edit)
 *   /listing-published/:listingId  post-publish surface
 *
 * Legacy entries are redirects, never parallel wizards.
 */
export const LISTING_ROUTES = {
  /** Opening choice page — the front door for new listings. */
  gateway: '/list/start',
  /** Marketing + QuickStart page. */
  hub: '/list',
  /** QuickStart with the questions already open. */
  quickStart: '/list?start=true',
  /** Concierge introduction / intake placeholder. */
  conciergeIntro: '/list/concierge',
  /** Draft continuation (PublishWizard). */
  resume: (listingId: string) => `/create-listing/${listingId}`,
  /** Published listing edit (PublishWizard). */
  edit: (listingId: string) => `/edit-listing/${listingId}`,
  /** Post-publish surface. */
  published: (listingId: string) => `/listing-published/${listingId}`,
} as const;

/** Legacy paths that must redirect into the canonical flow. */
export const LEGACY_LISTING_REDIRECTS: Record<string, string> = {
  '/create-listing': LISTING_ROUTES.gateway,
  '/new-listing': LISTING_ROUTES.gateway,
  '/listing-wizard': LISTING_ROUTES.gateway,
};

/** Builds an /auth redirect that returns the user to `target` after sign-in. */
export const authReturnTo = (target: string): string =>
  `/auth?redirect=${encodeURIComponent(target)}`;
