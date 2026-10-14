import { toDashboardTarget } from '@/lib/navigation/dashboardTargets';

const DAY = 864e5;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Compact inbox timestamp: "2:14 PM" today, "Yesterday", a weekday within the
 * last week, otherwise "Oct 3" (with the year when it isn't this year).
 */
export function inboxStamp(iso: string | null | undefined, now = new Date()): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.round((startOfDay(now) - startOfDay(d)) / DAY);
  if (days <= 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** Full date and time for a title/tooltip: "Oct 14, 2026, 2:14 PM". */
export function fullStamp(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export type DayGroup = 'Today' | 'Earlier';

/** "Today" for anything since local midnight, otherwise "Earlier". */
export function dayGroup(iso: string, now = new Date()): DayGroup {
  return new Date(iso).getTime() >= startOfDay(now) ? 'Today' : 'Earlier';
}

/** Split items into Today / Earlier, keeping input order and dropping empty groups. */
export function groupByDay<T extends { created_at: string }>(items: T[], now = new Date()) {
  const today: T[] = [];
  const earlier: T[] = [];
  items.forEach((item) => (dayGroup(item.created_at, now) === 'Today' ? today : earlier).push(item));
  return ([['Today', today], ['Earlier', earlier]] as const).filter(([, rows]) => rows.length > 0);
}

export type NotificationTarget =
  | { kind: 'route'; to: string }
  | { kind: 'external'; href: string }
  | { kind: 'none' };

/**
 * Where clicking a notification goes. Legacy paths are mapped onto /dashboard
 * routes; same-origin absolute URLs become in-app routes; other absolute URLs
 * open in a new tab; a missing or unusable link means "mark read, stay here".
 */
export function notificationTarget(link: string | null | undefined, origin = typeof window !== 'undefined' ? window.location.origin : ''): NotificationTarget {
  const mapped = toDashboardTarget(link?.trim() || null);
  if (!mapped) return { kind: 'none' };
  if (/^https?:\/\//i.test(mapped)) {
    try {
      const url = new URL(mapped);
      if (origin && url.origin === origin) {
        const local = toDashboardTarget(`${url.pathname}${url.search}${url.hash}`);
        return local ? { kind: 'route', to: local } : { kind: 'none' };
      }
      return { kind: 'external', href: url.toString() };
    } catch {
      return { kind: 'none' };
    }
  }
  if (!mapped.startsWith('/') || mapped.startsWith('//')) return { kind: 'none' };
  return { kind: 'route', to: mapped };
}
