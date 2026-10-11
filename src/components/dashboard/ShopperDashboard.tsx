import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  Inbox,
} from 'lucide-react';

import PermitsTab from './PermitsTab';
import ActionRequiredStack, { type ActionItem } from './shared/ActionRequiredStack';
import OverviewGreeting from './overview/OverviewGreeting';
import { KpiCard } from './overview/KpiCard';
import RecentActivityStrip, { ActivityItem } from './overview/RecentActivityStrip';
import MembershipCard from './MembershipCard';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useFavorites } from '@/hooks/useFavorites';
import { useSellerVerification } from '@/hooks/useSellerVerification';
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
  const sellerVerification = useSellerVerification();
  // Authoritative badge state — the offer disappears once verified.
  const verified =
    isVerified ||
    sellerVerification.state?.badge_active === true ||
    sellerVerification.offer.enabled === false;
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
  }, [verified, stats.pending, unreadMessageCount]);

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
    <div className="max-w-[1320px] mx-auto section-stack">
      <OverviewGreeting firstName={firstName} persona="Buying" isVerified={isVerified} />

      <section aria-labelledby="shop-glance">
        <header className="section-header">
          <h2 id="shop-glance" className="section-title">At a glance</h2>
          <p className="section-subtitle">Your active orders, rentals, and messages.</p>
        </header>
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
      </section>

      {actionItems.length > 0 && (
        <>
          <hr className="section-divider" />
          <section aria-labelledby="shop-attention">
            <header className="section-header">
              <h2 id="shop-attention" className="section-title">Needs your attention</h2>
              <p className="section-subtitle">A few things to keep your bookings on track.</p>
            </header>
            <ActionRequiredStack items={actionItems} />
          </section>
        </>
      )}

      <hr className="section-divider" />

      <section aria-labelledby="shop-activity">
        <header className="section-header">
          <h2 id="shop-activity" className="section-title">Recent bookings</h2>
          <p className="section-subtitle">Your last three requests and their status.</p>
        </header>
        <RecentActivityStrip
          items={activity}
          viewAllHref="/dashboard?view=shopper&tab=orders"
          emptyText="No bookings yet. Find your next rental."
          emptyHref="/search"
          emptyCta="Browse listings"
        />
      </section>

      <hr className="section-divider" />

      <MembershipCard />
    </div>
  );
};

export default ShopperDashboard;
