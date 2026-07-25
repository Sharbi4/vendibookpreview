import { useMemo, useState } from 'react';
import {
  Clock,
  Banknote,
  ShieldAlert,
  DollarSign,
  MessageSquare,
} from 'lucide-react';
import ActionRequiredStack, { type ActionItem } from './shared/ActionRequiredStack';
import StripeNotificationBubble from './StripeNotificationBubble';
import { BoostListingPrompt } from './BoostListingPrompt';
import { StripeConnectModal } from '@/components/listing-wizard/StripeConnectModal';
import OverviewGreeting from './overview/OverviewGreeting';
import { KpiCard } from './overview/KpiCard';
import RecentActivityStrip, { ActivityItem } from './overview/RecentActivityStrip';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { useHostOffers } from '@/hooks/useHostOffers';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useAuth } from '@/contexts/AuthContext';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';

/**
 * NEW OVERVIEW — one viewport-ish surface:
 *   1. compact greeting
 *   2. 4 large KPI cards (ember on primary)
 *   3. needs-your-attention stack
 *   4. single recent-activity strip (last 3 bookings)
 *
 * All deeper tabs live behind Dashboard.tsx lazy routes.
 */
const HostDashboard = () => {
  const { user, profile, isVerified } = useAuth();
  const { tier } = useHostEntitlements();
  const isFreeTier = tier === 'free';
  const { listings, stats } = useHostListings();
  const { bookings, stats: bookingStats } = useHostBookings();
  const {
    isConnected,
    isLoading: stripeLoading,
    connectStripe,
    isConnecting,
    openStripeDashboard,
    isOpeningDashboard,
  } = useStripeConnect();
  const { analytics: revenueAnalytics } = useRevenueAnalytics();
  const { pendingOffers } = useHostOffers();
  const { count: unreadMessageCount } = useUnreadMessageCount();
  const [showStripeModal, setShowStripeModal] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0];
  const monthlyRevenue = revenueAnalytics?.revenueThisMonth || 0;
  const nextPayoutHint = monthlyRevenue > 0
    ? 'Rentals settle in 24h · sales in 25d'
    : 'Nothing pending';

  const actionItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];
    if (bookingStats.pending > 0) items.push({
      id: 'pending-bookings', icon: Clock,
      title: `${bookingStats.pending} booking request${bookingStats.pending > 1 ? 's' : ''}`,
      description: 'Review and reply so guests can plan.',
      href: '/host/bookings', cta: 'Review', tone: 'warning',
    });
    if (!stripeLoading && !isConnected) items.push({
      id: 'stripe', icon: Banknote,
      title: 'Finish Stripe onboarding',
      description: 'Required to accept card payments and receive payouts.',
      href: '/dashboard?view=host&tab=payouts', cta: 'Set up', tone: 'warning',
    });
    if (!isVerified) items.push({
      id: 'verify', icon: ShieldAlert,
      title: 'Verify your identity',
      description: 'Required before publishing. Drafts stay safe.',
      href: '/verify-identity', cta: 'Verify', tone: 'warning',
    });
    if (pendingOffers.length > 0) items.push({
      id: 'offers', icon: DollarSign,
      title: `${pendingOffers.length} open offer${pendingOffers.length > 1 ? 's' : ''}`,
      href: '/dashboard?view=host&tab=sales', cta: 'Open',
    });
    if (unreadMessageCount > 0) items.push({
      id: 'unread', icon: MessageSquare,
      title: `${unreadMessageCount} unread message${unreadMessageCount > 1 ? 's' : ''}`,
      href: '/messages', cta: 'Open',
    });
    return items;
  }, [bookingStats.pending, stripeLoading, isConnected, isVerified, pendingOffers.length, unreadMessageCount]);

  const activity: ActivityItem[] = useMemo(() => {
    return bookings.slice(0, 3).map((b) => {
      const tone: ActivityItem['status'] = b.status === 'approved'
        ? { label: 'Approved', tone: 'success' }
        : b.status === 'pending'
        ? { label: 'Pending', tone: 'warning' }
        : b.status === 'declined'
        ? { label: 'Declined', tone: 'muted' }
        : { label: b.status, tone: 'muted' };
      return {
        id: b.id,
        href: `/host/bookings?id=${b.id}`,
        title: b.listing?.title || 'Booking',
        imageUrl: b.listing?.cover_image_url,
        meta: `${b.shopper?.full_name || 'Guest'} · ${new Date(b.created_at).toLocaleDateString()}`,
        status: tone,
      };
    });
  }, [bookings]);

  return (
    <div className="max-w-[1320px] mx-auto space-y-6 sm:space-y-8">
      {!stripeLoading && (
        <StripeNotificationBubble
          isConnected={isConnected}
          isLoading={stripeLoading}
          onConnect={connectStripe}
          onManage={openStripeDashboard}
          isConnecting={isConnecting}
          isOpeningDashboard={isOpeningDashboard}
        />
      )}

      <OverviewGreeting firstName={firstName} persona="Hosting" isVerified={isVerified} />

      {/* KPI row — ember reserved for Earnings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          ember
          label="Earnings · MTD"
          value={monthlyRevenue}
          format={(n) => `$${n.toLocaleString()}`}
          hint={nextPayoutHint}
          href="/dashboard?view=host&tab=payouts"
        />
        <KpiCard
          label="Active listings"
          value={stats.published}
          hint={stats.drafts > 0 ? `${stats.drafts} draft${stats.drafts > 1 ? 's' : ''}` : 'All live'}
          href="/host/listings"
        />
        <KpiCard
          label="Pending requests"
          value={bookingStats.pending}
          hint={bookingStats.pending > 0 ? 'Awaiting reply' : 'All clear'}
          href="/host/bookings"
        />
        <KpiCard
          label="Open offers"
          value={pendingOffers.length}
          hint={pendingOffers.length > 0 ? 'Awaiting reply' : 'Nothing pending'}
          href="/dashboard?view=host&tab=sales"
        />
      </div>

      {actionItems.length > 0 && <ActionRequiredStack items={actionItems} />}

      <RecentActivityStrip
        title="Recent bookings"
        items={activity}
        viewAllHref="/host/bookings"
        emptyText="No bookings yet. Publish or share a listing to attract renters."
        emptyHref="/host/listings"
        emptyCta="Manage listings"
      />

      <StripeConnectModal
        open={showStripeModal}
        onOpenChange={setShowStripeModal}
        onConnect={connectStripe}
        isConnecting={isConnecting}
      />

      {listings.length > 0 && (
        <BoostListingPrompt listings={listings as any} userId={user?.id} />
      )}
    </div>
  );
};

export default HostDashboard;
