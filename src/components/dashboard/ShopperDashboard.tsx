import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  ShieldAlert,
  Inbox,
} from 'lucide-react';
import PermitsTab from './PermitsTab';
import ActionRequiredStack, { type ActionItem } from './shared/ActionRequiredStack';
import OverviewGreeting from './overview/OverviewGreeting';
import { KpiCard } from './overview/KpiCard';
import RecentActivityStrip, { ActivityItem } from './overview/RecentActivityStrip';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';

/**
 * NEW OVERVIEW — one viewport-ish surface:
 *   1. compact greeting
 *   2. 4 large KPI cards (ember on primary)
 *   3. needs-your-attention stack
 *   4. single recent-activity strip (latest 3 bookings)
 * DiscoveryGrid / ReferralPanel / BecomeHostCard were removed here — they
 * belong in dedicated tabs, not on the operator's front page.
 */
const ShopperDashboard = () => {
  const { bookings, stats } = useShopperBookings();
  const { profile, isVerified } = useAuth();
  const { count: unreadMessageCount } = useUnreadMessageCount();
  const { favorites } = useFavorites();
  const [searchParams] = useSearchParams();
  const firstName = profile?.full_name?.split(' ')[0];

  // Legacy sub-route for permits (kept as-is).
  if (searchParams.get('tab') === 'permits') {
    return (
      <div className="max-w-[1320px] mx-auto">
        <PermitsTab />
      </div>
    );
  }

  const activeOrders = bookings.filter((b) => b.status === 'approved').length;
  const upcomingRentals = stats.approved;
  const savedCount = favorites?.length ?? 0;

  const actionItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];
    if (!isVerified) items.push({
      id: 'verify-identity', icon: ShieldAlert,
      title: 'Verify your identity',
      description: 'One tap unlocks publishing and higher-trust checkout.',
      href: '/verify-identity', cta: 'Verify', tone: 'warning',
    });
    if (stats.pending > 0) items.push({
      id: 'pending', icon: Clock,
      title: `${stats.pending} booking request${stats.pending > 1 ? 's' : ''} awaiting host`,
      description: "We'll notify you the moment they reply.",
      href: '/dashboard?view=shopper', cta: 'View',
    });
    if (unreadMessageCount > 0) items.push({
      id: 'unread', icon: Inbox,
      title: `${unreadMessageCount} unread message${unreadMessageCount > 1 ? 's' : ''}`,
      href: '/messages', cta: 'Open',
    });
    return items;
  }, [isVerified, stats.pending, unreadMessageCount]);

  const activity: ActivityItem[] = useMemo(() => {
    return bookings.slice(0, 3).map((b) => {
      const tone: ActivityItem['status'] = b.status === 'approved'
        ? { label: 'Approved', tone: 'success' }
        : b.status === 'pending'
        ? { label: 'Awaiting host', tone: 'warning' }
        : b.status === 'declined'
        ? { label: 'Declined', tone: 'muted' }
        : { label: b.status, tone: 'muted' };
      return {
        id: b.id,
        href: `/dashboard?view=shopper&tab=orders`,
        title: b.listing?.title || 'Booking',
        imageUrl: b.listing?.cover_image_url,
        meta: new Date(b.created_at).toLocaleDateString(),
        status: tone,
      };
    });
  }, [bookings]);

  return (
    <div className="max-w-[1320px] mx-auto space-y-6 sm:space-y-8">
      <OverviewGreeting firstName={firstName} persona="Buying" isVerified={isVerified} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          ember
          label="Active orders"
          value={activeOrders}
          hint={activeOrders > 0 ? 'In progress' : 'Nothing active'}
          href="/dashboard?view=shopper&tab=orders"
        />
        <KpiCard
          label="Upcoming rentals"
          value={upcomingRentals}
          hint={upcomingRentals > 0 ? 'Ready to go' : 'None yet'}
          href="/dashboard?view=shopper"
        />
        <KpiCard
          label="Saved listings"
          value={savedCount}
          hint={savedCount > 0 ? 'Your shortlist' : 'Save with the heart'}
          href="/dashboard?view=shopper&tab=favorites"
        />
        <KpiCard
          label="Unread messages"
          value={unreadMessageCount}
          hint={unreadMessageCount > 0 ? 'New replies' : 'Inbox zero'}
          href="/messages"
        />
      </div>

      {actionItems.length > 0 && <ActionRequiredStack items={actionItems} />}

      <RecentActivityStrip
        title="Recent bookings"
        items={activity}
        viewAllHref="/dashboard?view=shopper&tab=orders"
        emptyText="No bookings yet. Find your next rental."
        emptyHref="/search"
        emptyCta="Browse listings"
      />
    </div>
  );
};

export default ShopperDashboard;
