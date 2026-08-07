import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TabPill {
  label: string;
  href: string;
  tab: string | null;
  /** Pills that navigate to a real route instead of a ?tab= value. */
  path?: string;
}

interface Props {
  mode: 'host' | 'shopper';
}

/**
 * Horizontally scrollable pill bar shown on mobile at the top of the
 * dashboard content so every tab is discoverable without opening a menu.
 */
const DashboardMobileTabs = ({ mode }: Props) => {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get('tab');

  const pills: TabPill[] = mode === 'host'
    ? [
        { label: 'Overview', href: '/dashboard?view=host', tab: null },
        { label: 'Listings', href: '/host/listings', tab: null, path: '/host/listings' },
        { label: 'My Account', href: '/account', tab: null, path: '/account' },
        { label: 'Sales', href: '/dashboard?view=host&tab=sales', tab: 'sales' },
        { label: 'Insights', href: '/dashboard?view=host&tab=insights', tab: 'insights' },
        { label: 'Promote', href: '/dashboard?view=host&tab=promote', tab: 'promote' },
        { label: 'Membership', href: '/dashboard?view=host&tab=membership', tab: 'membership' },
        { label: 'Payouts', href: '/dashboard?view=host&tab=payouts', tab: 'payouts' },
        { label: 'Notifications', href: '/dashboard?view=host&tab=notifications', tab: 'notifications' },
        { label: 'Permits', href: '/dashboard?view=host&tab=permits', tab: 'permits' },
      ]
    : [
        { label: 'Overview', href: '/dashboard?view=shopper', tab: null },
        { label: 'My Account', href: '/account', tab: null, path: '/account' },
        { label: 'Orders', href: '/dashboard?view=shopper&tab=orders', tab: 'orders' },
        { label: 'Bookings', href: '/dashboard?view=shopper&tab=bookings', tab: 'bookings' },
        { label: 'Favorites', href: '/dashboard?view=shopper&tab=favorites', tab: 'favorites' },
        { label: 'Refer', href: '/dashboard?view=shopper&tab=referral', tab: 'referral' },
        { label: 'Tools', href: '/dashboard?view=shopper&tab=tools', tab: 'tools' },
        { label: 'Notifications', href: '/dashboard?view=shopper&tab=notifications', tab: 'notifications' },
        { label: 'Permits', href: '/dashboard?view=shopper&tab=permits', tab: 'permits' },
      ];

  return (
    <div className="md:hidden -mx-4 px-4 mb-4 relative">
      <div className="no-scrollbar overflow-x-auto flex gap-2 py-1">
        {pills.map((p) => {
          const active = p.path
            ? location.pathname === p.path
            : location.pathname === '/dashboard' && (p.tab ?? null) === (currentTab ?? null);
          return (
            <Link
              key={p.label}
              to={p.href}
              className={cn(
                'shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all',
                active
                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_16px_-4px_rgba(255,81,36,0.6)]'
                  : 'border-white/10 text-[rgb(var(--dash-text-2))] bg-white/[0.03] hover:text-[rgb(var(--dash-text-1))]',
              )}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
      {/* edge-fade hint that the row scrolls */}
      <div className="pointer-events-none absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
      <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />
    </div>
  );
};

export default DashboardMobileTabs;
