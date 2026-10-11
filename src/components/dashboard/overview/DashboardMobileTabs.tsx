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
        { label: 'Premium tools', href: '/dashboard?view=host&tab=promote', tab: 'promote' },
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
    <div className="md:hidden mb-4">
      {/* Wrap into rows so every tab is visible at once — no swiping required. */}
      <div className="flex flex-wrap gap-2">
        {pills.map((p) => {
          const active = p.path
            ? location.pathname === p.path
            : location.pathname === '/dashboard' && (p.tab ?? null) === (currentTab ?? null);
          return (
            <Link
              key={p.label}
              to={p.href}
              className={cn(
                'px-4 py-2 rounded-full text-[13px] font-semibold border transition-all',
                active
                  ? 'bg-cta-primary text-white border-transparent shadow-cta-primary'
                  : 'border-white/[0.12] text-[rgb(var(--dash-text-2))] bg-white/[0.03] hover:text-[rgb(var(--dash-text-1))] hover:border-white/20',
              )}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardMobileTabs;
