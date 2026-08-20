import { useMemo, useState } from 'react';
import {
  Clock,
  Banknote,
  ShieldAlert,
  DollarSign,
  MessageSquare,
} from 'lucide-react';
import ActionRequiredStack, { type ActionItem } from './shared/ActionRequiredStack';
import { BoostListingPrompt } from './BoostListingPrompt';
import OverviewGreeting from './overview/OverviewGreeting';
import VerifiedSellerCTA from '@/components/verification/VerifiedSellerCTA';
import { KpiCard } from './overview/KpiCard';
import RecentActivityStrip, { ActivityItem } from './overview/RecentActivityStrip';
import MembershipCard from './MembershipCard';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useManualPayout } from '@/hooks/useManualPayout';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { useHostOffers } from '@/hooks/useHostOffers';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';
import { useAuth } from '@/contexts/AuthContext';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { getCounterpartyName } from '@/lib/displayName';
import PaymentsTransitionModal from '@/components/payments/PaymentsTransitionModal';
import PaymentsTransitionReminder from '@/components/payments/PaymentsTransitionReminder';

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
  const { hasPayoutInstructions, isLoading: payoutLoading } = useManualPayout();
  const { analytics: revenueAnalytics } = useRevenueAnalytics();
  const { pendingOffers } = useHostOffers();
  const { count: unreadMessageCount } = useUnreadMessageCount();

  const firstName = profile?.full_name?.split(' ')[0];
  const monthlyRevenue = revenueAnalytics?.revenueThisMonth || 0;
  const nextPayoutHint = monthlyRevenue > 0
    ? 'Payout status updates as orders complete'
    : 'Nothing pending';

  const actionItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];
    if (bookingStats.pending > 0) items.push({
      id: 'pending-bookings', icon: Clock,
      title: `${bookingStats.pending} booking request${bookingStats.pending > 1 ? 's' : ''}`,
      description: 'Review and reply so guests can plan.',
      href: '/host/bookings', cta: 'Review', tone: 'warning',
    });
    if (!payoutLoading && !hasPayoutInstructions) items.push({
      id: 'payout-details', icon: Banknote,
      title: 'Add your payout details',
      description: 'Optional — tell us where to send earnings when you make a sale. Publishing and bookings work without it.',
      href: '/dashboard?view=host&tab=payouts', cta: 'Add', tone: 'default',
    });
    // Identity verification is optional on Vendibook — never surfaced as a
    // publishing requirement.
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
  }, [bookingStats.pending, payoutLoading, hasPayoutInstructions, isVerified, pendingOffers.length, unreadMessageCount]);

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
        meta: `${getCounterpartyName(b.shopper, 'Guest')} · ${new Date(b.created_at).toLocaleDateString()}`,
        status: tone,
      };
    });
  }, [bookings]);

  return (
    <div className="max-w-[1320px] mx-auto section-stack">
      <PaymentsTransitionModal />
      <OverviewGreeting firstName={firstName} persona="Hosting" isVerified={isVerified} />

      <PaymentsTransitionReminder />

      <VerifiedSellerCTA variant="card" />

      {/* KPI row — ember reserved for Earnings */}
      <section aria-labelledby="dash-glance">
        <header className="section-header">
          <h2 id="dash-glance" className="section-title">At a glance</h2>
          <p className="section-subtitle">Your key metrics from the last 30 days.</p>
        </header>
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
      </section>

      {actionItems.length > 0 && (
        <>
          <hr className="section-divider" />
          <section aria-labelledby="dash-attention">
            <header className="section-header">
              <h2 id="dash-attention" className="section-title">Needs your attention</h2>
              <p className="section-subtitle">Optional steps that help you stay on top of your listings.</p>
            </header>
            <ActionRequiredStack items={actionItems} />
          </section>
        </>
      )}

      <hr className="section-divider" />

      <section aria-labelledby="dash-activity">
        <header className="section-header">
          <h2 id="dash-activity" className="section-title">Recent bookings</h2>
          <p className="section-subtitle">The latest three requests across your listings.</p>
        </header>
        <RecentActivityStrip
          items={activity}
          viewAllHref="/host/bookings"
          emptyText="No bookings yet. Publish or share a listing to attract renters."
          emptyHref="/host/listings"
          emptyCta="Manage listings"
        />
      </section>

      {listings.length > 0 && (
        <>
          <hr className="section-divider" />
          <BoostListingPrompt listings={listings as any} userId={user?.id} />
        </>
      )}

      <hr className="section-divider" />

      <MembershipCard />
    </div>
  );
};

export default HostDashboard;
