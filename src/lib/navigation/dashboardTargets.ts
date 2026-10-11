/**
 * Maps legacy authenticated destinations (stored in notification rows, emails
 * and older links) onto the unified /dashboard workspace routes.
 * Pure string mapping — no data or permission behaviour changes.
 */
export function toDashboardTarget(link: string | null | undefined): string | null {
  if (!link) return null;
  if (/^https?:\/\//i.test(link)) return link;

  const [pathRaw, hash = ''] = link.split('#');
  const [path, query = ''] = pathRaw.split('?');
  const suffix = `${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
  const rest = (prefix: string) => path.slice(prefix.length);

  if (path === '/account' || path === '/account/profile' || path === '/profile' || path === '/settings')
    return `/dashboard/account${suffix}`;
  if (path === '/favorites' || path === '/saved') return `/dashboard/saved${suffix}`;
  if (path === '/notification-preferences') return `/dashboard/notifications/settings${suffix}`;
  if (path === '/notifications') return `/dashboard/notifications${suffix}`;
  if (path === '/messages') return `/dashboard/messages${suffix}`;
  if (path.startsWith('/messages/')) return `/dashboard/messages/${rest('/messages/')}${suffix}`;
  if (path === '/host/listings' || path === '/my-listings') return `/dashboard/listings${suffix}`;
  if (path === '/transactions') return `/dashboard/activity${suffix}`;
  if (path === '/buyer') return `/dashboard${suffix}`;
  if (path === '/payments') return `/dashboard/payments${suffix}`;

  return link;
}
