/**
 * Central map from monetization product slug -> post-checkout experience.
 *
 * Every paid flow should route through here so users land on a
 * product-specific "what happens next" screen instead of a generic dashboard.
 *
 * Used by:
 *  - startMonetizationCheckout callers (successPath / cancelPath)
 *  - PurchaseReturnBanner (headline + checklist + primary CTA)
 */

export interface PostCheckoutStep {
  title: string;
  hint?: string;
}

export interface ReturnRoute {
  /** Short, benefit-forward confirmation headline. */
  title: string;
  /** One-sentence explanation of what was purchased. */
  subtitle?: string;
  /** Product-specific "do this next" checklist (3 items max). */
  steps: PostCheckoutStep[];
  /** Primary action label. */
  ctaLabel: string;
  /** Where the primary CTA goes. `{listingId}` is interpolated at render time. */
  ctaHref: string;
  /** Optional secondary link (kept quiet). */
  secondary?: { label: string; href: string };
  /** Success return URL for `startMonetizationCheckout`. */
  successPath: string;
  /** Cancel return URL for `startMonetizationCheckout`. */
  cancelPath: string;
}

const buildDashboard = (
  title: string,
  subtitle: string,
  steps: PostCheckoutStep[],
  ctaLabel: string,
  ctaHref: string,
  extras: Partial<ReturnRoute> = {},
): ReturnRoute => ({
  title,
  subtitle,
  steps,
  ctaLabel,
  ctaHref,
  successPath: '/dashboard?purchase=success',
  cancelPath: '/dashboard?purchase=cancelled',
  ...extras,
});

export const RETURN_ROUTES: Record<string, ReturnRoute> = {
  // ---- Listing upgrades ------------------------------------------------
  'featured-listing-30': buildDashboard(
    'Your listing is featured for 30 days',
    'Featured placement rotates into premium slots across search and the homepage.',
    [
      { title: 'Featured placement starts within minutes' },
      { title: 'Track impressions and inquiries in Insights' },
      { title: "We'll email a performance snapshot when the boost ends" },
    ],
    'View this listing',
    '/listing/{listingId}',
  ),
  'featured-listing-7': buildDashboard(
    'Your listing is featured for 7 days',
    'A focused burst of premium placement to drive fast attention.',
    [
      { title: 'Boost is live now' },
      { title: 'Consider adding a video walkthrough for higher conversion' },
      { title: 'Renew or extend from the listing card any time' },
    ],
    'View this listing',
    '/listing/{listingId}',
  ),
  'top-of-search-7': buildDashboard(
    'Top-of-search placement is live',
    'Your listing now sits above standard results in relevant searches.',
    [
      { title: 'Placement refreshes with each new search session' },
      { title: 'Respond to inquiries within an hour to compound the boost' },
      { title: 'Track click-through in Insights' },
    ],
    'View this listing',
    '/listing/{listingId}',
  ),

  // ---- Seller services -------------------------------------------------
  'seller-pro': buildDashboard(
    'Seller Pro is active',
    'Improve your listing and attract more serious buyers.',
    [
      { title: 'Add three more photos to strengthen your listing' },
      { title: 'Refine your description with the built-in writer' },
      { title: 'Set your response goals so buyers see a fast-reply badge' },
    ],
    'Open my listing',
    '/host/listings',
    { secondary: { label: 'Open dashboard', href: '/dashboard' } },
  ),
  'white-glove-seller': buildDashboard(
    'White-glove support is on the way',
    'A Vendibook specialist will personally help you list and sell.',
    [
      { title: 'Our team will reach out within one business day' },
      { title: "We'll review your listing, photos, and pricing together" },
      { title: "You'll receive a personalized action plan by email" },
    ],
    'Prepare your listing',
    '/host/listings',
  ),

  // ---- Buyer services --------------------------------------------------
  'buyer-readiness-pass': buildDashboard(
    "You're ready to buy with confidence",
    'Verified profile, saved documents, and priority messaging are unlocked.',
    [
      { title: 'Complete your buyer profile so sellers reply faster' },
      { title: 'Save your funding source or pre-approval details' },
      { title: 'Start reaching out to listings that match your criteria' },
    ],
    'Browse listings',
    '/browse',
  ),
  'listing-purchase-review': buildDashboard(
    'Your Listing Purchase Review is submitted',
    'Vendibook will independently review this listing before you commit.',
    [
      { title: 'A specialist reviews the listing, docs, and pricing' },
      { title: "You'll get a report by email within two business days" },
      { title: 'Return here any time to see review status' },
    ],
    'View review status',
    '/dashboard?tab=services',
  ),

  // ---- Host subscriptions ---------------------------------------------
  'host-growth': buildDashboard(
    'Host Growth is active',
    'Recurring monthly subscription — cancel any time.',
    [
      { title: 'Add availability and configure your booking rules' },
      { title: 'Turn on instant-book for faster confirmations' },
      { title: 'Review analytics to see what drives your bookings' },
    ],
    'Set up availability',
    '/host/listings',
  ),
  'host-pro': buildDashboard(
    'Host Pro is active',
    'Full automation, priority placement, and advanced analytics.',
    [
      { title: 'Configure automated agreements and reminders' },
      { title: 'Enable recurring bookings for repeat customers' },
      { title: 'Review revenue analytics to plan pricing' },
    ],
    'Open Host tools',
    '/host/listings',
  ),
  'host-studio': buildDashboard(
    'Host Studio is active',
    'Team seats, custom branding, and API access are unlocked.',
    [
      { title: 'Invite your team from Settings' },
      { title: 'Customize your storefront branding' },
      { title: 'Explore API access from Developer settings' },
    ],
    'Open Host tools',
    '/host/listings',
  ),

  // ---- Permit path -----------------------------------------------------
  'permit-path-plus': buildDashboard(
    'Permit Path Plus is active',
    'Personalized checklist, agency contact prep, and inspection guidance.',
    [
      { title: 'Continue your roadmap where you left off' },
      { title: 'Upload agency-issued documents to keep everything in one place' },
      { title: 'Ask Vendibook AI for plain-language help on any step' },
    ],
    'Continue Permit Path',
    '/permit-path',
  ),
  'permit-path-concierge': buildDashboard(
    'Permit Path Concierge is on the way',
    'A specialist will personally help you navigate your local permits.',
    [
      { title: 'Expect an intake email within one business day' },
      { title: 'Have your business details and location ready' },
      { title: 'Track progress from the Permit Path dashboard' },
    ],
    'Open Permit Path',
    '/permit-path',
  ),

  // ---- Protected sale --------------------------------------------------
  'protected-sale-fee': buildDashboard(
    'Protected Sale is active',
    'Identity verification, secure payment, digital documents, and Vendibook support.',
    [
      { title: 'Complete identity verification if you have not already' },
      { title: 'Review and sign the digital agreement' },
      { title: 'Coordinate handoff — funds release after confirmation' },
    ],
    'Open transaction',
    '/dashboard?tab=transactions',
  ),
};

const GENERIC: ReturnRoute = {
  title: 'Purchase complete',
  subtitle: "A receipt is on the way to your email.",
  steps: [
    { title: 'Your new benefits are being activated now' },
    { title: 'Manage everything from your dashboard' },
  ],
  ctaLabel: 'Go to dashboard',
  ctaHref: '/dashboard',
  successPath: '/dashboard?purchase=success',
  cancelPath: '/dashboard?purchase=cancelled',
};

/**
 * Look up the return experience for a product slug.
 * Interpolates `{listingId}` in `ctaHref` when provided.
 */
export function getReturnRoute(
  productSlug: string | null | undefined,
  ctx: { listingId?: string } = {},
): ReturnRoute {
  const base = (productSlug && RETURN_ROUTES[productSlug]) || GENERIC;
  const ctaHref = ctx.listingId
    ? base.ctaHref.replace('{listingId}', ctx.listingId)
    : base.ctaHref.replace('/listing/{listingId}', '/host/listings');
  return { ...base, ctaHref };
}

/**
 * Build success/cancel paths to hand to `startMonetizationCheckout`.
 * Appends the product slug (and optional listing id) so the return banner
 * can render the correct product-specific checklist.
 */
export function buildCheckoutReturnPaths(
  productSlug: string,
  opts: { listingId?: string } = {},
): { successPath: string; cancelPath: string } {
  const route = RETURN_ROUTES[productSlug] ?? GENERIC;
  const listingQs = opts.listingId ? `&listing=${encodeURIComponent(opts.listingId)}` : '';
  return {
    successPath: `${route.successPath}&product=${encodeURIComponent(productSlug)}${listingQs}`,
    cancelPath: `${route.cancelPath}&product=${encodeURIComponent(productSlug)}${listingQs}`,
  };
}

/**
 * Preserve the selected plan across an unauthenticated signup/login detour.
 * Returns the `/auth?returnTo=...` destination that brings the visitor back to
 * the Plans page with the exact plan + interval they clicked, auto-resuming
 * checkout.
 */
export function buildPlanAuthReturnTo(opts: {
  planSlug: string;
  interval: 'monthly' | 'annual';
  pathname?: string;
  search?: string;
}): string {
  const current = new URLSearchParams(opts.search ?? '');
  const params = new URLSearchParams({
    plan: opts.planSlug,
    interval: opts.interval,
    auto: '1',
  });
  const returnToParam = current.get('returnTo');
  const listingContext = current.get('listingContext');
  if (returnToParam) params.set('returnTo', returnToParam);
  if (listingContext) params.set('listingContext', listingContext);
  const path = opts.pathname ?? '/pricing';
  const isPlansPage = ['/pricing', '/plans', '/host/plans'].some((p) => path.startsWith(p));
  const target = `${isPlansPage ? path : '/pricing'}?${params.toString()}`;
  return `/auth?returnTo=${encodeURIComponent(target)}`;
}
