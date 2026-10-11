/**
 * Maps pre-workspace dashboard deep links (/dashboard?view=…&tab=…, and offer
 * emails' /dashboard?offer=<id>) onto the current workspace routes.
 *
 * The old fallback sent these to /dashboard/classic, which itself redirects to
 * /dashboard with the query intact — an endless loop. Every legacy link now
 * resolves to a real page, and anything unknown lands on the plain home.
 */
const TAB_TARGETS: Record<string, string> = {
  sales: '/dashboard/transactions?filter=Sales',
  offers: '/dashboard/offers',
  payouts: '/dashboard/payments',
  payments: '/dashboard/payments',
  orders: '/dashboard/transactions',
  purchases: '/dashboard/transactions',
  transactions: '/dashboard/transactions',
  listings: '/dashboard/listings',
  promote: '/dashboard/listings',
  bookings: '/dashboard/activity',
  requests: '/dashboard/activity',
  favorites: '/dashboard/saved',
  saved: '/dashboard/saved',
  notifications: '/dashboard/notifications',
  messages: '/dashboard/messages',
  account: '/dashboard/account',
  settings: '/dashboard/account',
  membership: '/pricing',
  referral: '/referral',
  tools: '/tools',
  permits: '/tools/permitpath',
};

/** Returns the target path, or null when the URL is not a legacy deep link. */
export function legacyDashboardRedirect(params: URLSearchParams): string | null {
  const offer = params.get('offer');
  if (offer) {
    const next = new URLSearchParams({ offer });
    const action = params.get('action');
    if (action) next.set('action', action);
    return `/dashboard/offers?${next.toString()}`;
  }

  const tab = params.get('tab');
  const view = params.get('view');
  if (!tab && !view) return null;

  const target = tab ? TAB_TARGETS[tab.toLowerCase()] : undefined;
  if (!target) return '/dashboard';
  if (target === '/tools/permitpath' && params.get('roadmap')) {
    return `${target}?roadmap=${encodeURIComponent(params.get('roadmap') as string)}`;
  }
  return target;
}
