import { Link, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  Plus,
  Calendar,
  MessageSquare,
  Settings,
  Loader2,
  Truck,
  BarChart3,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandStatCard } from './CommandStatCard';
import { CommandHeader } from './CommandHeader';
import { SectionReveal, Reveal } from './SectionReveal';
import { NextBestAction } from './NextBestAction';
import { ContinueSetup } from '@/components/journey';
import { useResumableJourneys } from '@/hooks/useResumableJourneys';
import { OnboardingChecklist } from './OnboardingChecklist';
import StripeNotificationBubble from './StripeNotificationBubble';
import HostListingCard from './HostListingCard';
import BookingRequestsSection from './BookingRequestsSection';
import SellerSalesSection from './SellerSalesSection';
import DraftsSection from './DraftsSection';
import { EnhancedAnalytics } from './EnhancedAnalytics';
import { RevenueAnalyticsCard } from './RevenueAnalyticsCard';
import { HostOffersSection } from './HostOffersSection';
import { ListingInsightsPanel } from './ListingInsightsPanel';
import { PromotionHub } from './PromotionHub';
import { BoostListingPrompt } from './BoostListingPrompt';
import { KitchenProSuite } from './KitchenProSuite';
import PermitsTab from './PermitsTab';
import { ConversionFunnel } from '@/components/analytics/ConversionFunnel';
import { RevenueChart } from '@/components/analytics/RevenueChart';
import { TrafficSourcesCard } from '@/components/analytics/TrafficSourcesCard';
import { CompetitorPricingCard } from '@/components/analytics/CompetitorPricingCard';
import { DemandHeatmap } from './DemandHeatmap';
import { PredictiveBookingCard } from './PredictiveBookingCard';
import { useDashboardPersona } from '@/hooks/useDashboardPersona';
import { OperationsTable } from './OperationsTable';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useListingAnalytics } from '@/hooks/useListingAnalytics';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { useHostOffers } from '@/hooks/useHostOffers';
import { useAuth } from '@/contexts/AuthContext';
import { StripeConnectModal } from '@/components/listing-wizard/StripeConnectModal';

/* ──────────────────────────────────────────────────────────────
   Section wrapper — quiet, hairline, generous breathing room
   ────────────────────────────────────────────────────────────── */
const Section = ({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section>
    {(title || action) && (
      <div className="flex items-end justify-between mb-4">
        {title && (
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </h2>
        )}
        {action}
      </div>
    )}
    {children}
  </section>
);

const HostDashboard = () => {
  const { user, profile, isVerified } = useAuth();
  const [searchParams] = useSearchParams();
  const {
    listings,
    isLoading,
    stats,
    pauseListing,
    publishListing,
    unpauseListing,
    archiveListing,
    duplicateListing,
    deleteListing,
    updateListingPrice,
  } = useHostListings();
  const { stats: bookingStats } = useHostBookings();
  const {
    isConnected,
    isLoading: stripeLoading,
    connectStripe,
    isConnecting,
    openStripeDashboard,
    isOpeningDashboard,
  } = useStripeConnect();
  const { analytics, isLoading: analyticsLoading } = useListingAnalytics();
  const { analytics: revenueAnalytics, isLoading: revenueLoading } = useRevenueAnalytics();
  const { pendingOffers } = useHostOffers();
  const { hasGhostKitchen } = useDashboardPersona();
  const [showStripeModal, setShowStripeModal] = useState(false);
  const { items: resumableItems } = useResumableJourneys();

  const activeTab = searchParams.get('tab') || 'overview';

  const userType = useMemo(() => {
    const hasRentals = listings.some((l) => l.mode === 'rent');
    const hasSales = listings.some((l) => l.mode === 'sale');
    if (hasRentals && hasSales) return 'hybrid';
    if (hasSales) return 'seller';
    return 'host';
  }, [listings]);

  const draftListings = useMemo(
    () => listings.filter((l) => l.status === 'draft'),
    [listings],
  );

  const firstName = profile?.full_name?.split(' ')[0];

  /* Context line — single sentence, quiet authority */
  const contextLine =
    bookingStats.pending > 0
      ? `${bookingStats.pending} request${bookingStats.pending > 1 ? 's' : ''} awaiting your reply.`
      : pendingOffers.length > 0
      ? `${pendingOffers.length} offer${pendingOffers.length > 1 ? 's' : ''} on the table.`
      : draftListings.length > 0
      ? `${draftListings.length} draft${draftListings.length > 1 ? 's' : ''} ready to publish.`
      : userType === 'seller'
      ? 'Your sales pipeline is quiet. A good day to follow up.'
      : 'Everything is in order. Nothing needs you right now.';

  const handleConnectStripe = async () => {
    await connectStripe();
  };

  const handlePublish = async (id: string) => {
    if (!isConnected) {
      setShowStripeModal(true);
      return;
    }
    publishListing(id);
  };

  return (
    <div className="max-w-[1320px] mx-auto">
      {/* Payout status pill — always visible so hosts see Connected vs Not connected */}
      {!stripeLoading && (
        <div className="mb-6">
          <StripeNotificationBubble
            isConnected={isConnected}
            isLoading={stripeLoading}
            onConnect={handleConnectStripe}
            onManage={openStripeDashboard}
            isConnecting={isConnecting}
            isOpeningDashboard={isOpeningDashboard}
          />
        </div>
      )}


      <SectionReveal className="space-y-10 sm:space-y-12">
        {/* ── Header strip ───────────────────────────────────── */}
        <Reveal>
          <CommandHeader
            name={firstName}
            context={contextLine}
            actions={[
              {
                icon: Plus,
                label: 'New listing',
                href: '/list?start=true',
              },
              {
                icon: Calendar,
                label: 'Bookings',
                href: '/host/bookings',
                badge: bookingStats.pending,
              },
              {
                icon: MessageSquare,
                label: 'Messages',
                href: '/messages',
              },
              {
                icon: Settings,
                label: 'Account',
                href: '/account',
              },
            ]}
          />
        </Reveal>

        {/* ── Key metrics row ───────────────────────────────── */}
        <Reveal>
          <div
            className={`grid grid-cols-2 gap-3 sm:gap-4 ${
              userType === 'hybrid' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
            }`}
          >
            <CommandStatCard
              label="Listings"
              value={stats.published}
              hint={stats.drafts > 0 ? `${stats.drafts} drafts` : 'Active'}
              href="/host/listings"
            />
            <CommandStatCard
              label="Views · 30d"
              value={analytics?.totalViews || 0}
            />
            {userType !== 'seller' && (
              <CommandStatCard
                label="Pending requests"
                value={bookingStats.pending}
                hint={bookingStats.pending > 0 ? 'Awaiting reply' : 'All clear'}
                accent={bookingStats.pending > 0}
                href="/host/bookings"
              />
            )}
            {(userType !== 'host' || pendingOffers.length > 0) && (
              <CommandStatCard
                label="Open offers"
                value={pendingOffers.length}
                hint={pendingOffers.length > 0 ? 'Awaiting reply' : 'Nothing pending'}
                accent={pendingOffers.length > 0}
              />
            )}
            <CommandStatCard
              label="Revenue · MTD"
              value={revenueAnalytics?.revenueThisMonth || 0}
              format={(n) => `$${n.toLocaleString()}`}
            />
          </div>
        </Reveal>

        {/* ── Next Best Action ──────────────────────────────── */}
        {activeTab === 'overview' && (
          <Reveal>
            <NextBestAction
              publishedListings={stats.published}
              draftListings={draftListings.length}
              isStripeConnected={isConnected}
              isIdentityVerified={isVerified}
              pendingRequests={bookingStats.pending}
              pendingOffers={pendingOffers.length}
              firstName={firstName}
            />
          </Reveal>
        )}

        {/* ── Continue setup ─────────────────────────────────── */}
        {activeTab === 'overview' && resumableItems.length > 0 && (
          <Reveal>
            <ContinueSetup items={resumableItems} />
          </Reveal>
        )}

        {/* ── Activation checklist ─────────────────────────── */}
        {activeTab === 'overview' && !stripeLoading && (
          <Reveal>
            <OnboardingChecklist
              isStripeConnected={isConnected}
              isIdentityVerified={isVerified}
              hasPublishedListing={stats.published > 0}
              hasFirstBooking={
                (bookingStats.total ?? 0) > 0 ||
                (revenueAnalytics?.revenueThisMonth ?? 0) > 0
              }
              onConnectStripe={handleConnectStripe}
            />
          </Reveal>
        )}

        {/* ── Drafts ─────────────────────────────────────────── */}
        {!isLoading && draftListings.length > 0 && activeTab === 'overview' && (
          <Reveal>
            <Section title="Drafts">
              <DraftsSection drafts={draftListings} onDelete={deleteListing} />
            </Section>
          </Reveal>
        )}

        {/* ── Overview tab ──────────────────────────────────── */}
        {activeTab === 'overview' && (
          <Reveal>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-2 space-y-10">
                {userType !== 'seller' && bookingStats.pending > 0 && (
                  <Section title="Requests">
                    <BookingRequestsSection />
                  </Section>
                )}
                <Section title="Offers">
                  <HostOffersSection />
                </Section>
              </div>
              <div className="space-y-10">
                <Section title="Forecast">
                  <PredictiveBookingCard />
                </Section>
              </div>
            </div>
          </Reveal>
        )}

        {/* ── Inventory tab ─────────────────────────────────── */}
        {activeTab === 'inventory' && (
          <Reveal>
            <Section
              title="Listings"
              action={
                <Button asChild variant="dark-shine" size="sm" className="h-8 text-xs rounded-lg">
                  <Link to="/list">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    New listing
                  </Link>
                </Button>
              }
            >
              {!isLoading && draftListings.length > 0 && (
                <div className="mb-6">
                  <DraftsSection drafts={draftListings} onDelete={deleteListing} />
                </div>
              )}

              {listings.filter((l) => l.status !== 'draft').length > 6 ? (
                <OperationsTable
                  listings={listings.filter((l) => l.status !== 'draft')}
                  onPublish={handlePublish}
                  onPause={pauseListing}
                  onUnpause={unpauseListing}
                  onDelete={deleteListing}
                  onDuplicate={duplicateListing}
                  onArchive={archiveListing}
                />
              ) : isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : listings.filter((l) => l.status !== 'draft').length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-16 text-center">
                  <div className="w-10 h-10 rounded-lg bg-muted mx-auto mb-4 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    No published listings yet
                  </p>
                  <p className="text-xs text-muted-foreground mb-5">
                    Create one to start earning.
                  </p>
                  <Button asChild size="sm" variant="dark-shine" className="rounded-lg">
                    <Link to="/list">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      New listing
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings
                    .filter((l) => l.status !== 'draft')
                    .map((listing) => (
                      <HostListingCard
                        key={listing.id}
                        listing={listing}
                        onPause={pauseListing}
                        onPublish={handlePublish}
                        onUnpause={unpauseListing}
                        onDelete={deleteListing}
                        onDuplicate={duplicateListing}
                        onArchive={archiveListing}
                        onPriceUpdate={updateListingPrice}
                      />
                    ))}
                </div>
              )}
            </Section>
          </Reveal>
        )}

        {/* ── Bookings tab ──────────────────────────────────── */}
        {activeTab === 'bookings' && (
          <Reveal>
            <div className="space-y-10">
              {userType !== 'seller' && bookingStats.pending > 0 && (
                <Section title="Requests">
                  <BookingRequestsSection />
                </Section>
              )}
              {userType !== 'host' && (
                <Section title="Sales">
                  <SellerSalesSection />
                </Section>
              )}
            </div>
          </Reveal>
        )}

        {/* ── Financials tab ────────────────────────────────── */}
        {activeTab === 'financials' && (
          <Reveal>
            <div className="space-y-10">
              <Section title="Revenue">
                {revenueLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : revenueAnalytics ? (
                  <RevenueAnalyticsCard
                    analytics={revenueAnalytics}
                    onOpenStripeDashboard={openStripeDashboard}
                    isOpeningDashboard={isOpeningDashboard}
                  />
                ) : (
                  <div className="rounded-xl border border-border bg-card py-16 text-center">
                    <DollarSign className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      No revenue yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Revenue appears once your first sale or rental completes.
                    </p>
                  </div>
                )}
              </Section>
              <Section title="Performance">
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : analytics ? (
                  <EnhancedAnalytics
                    analytics={analytics}
                    stats={stats}
                    bookingStats={bookingStats}
                  />
                ) : (
                  <div className="rounded-xl border border-border bg-card py-16 text-center">
                    <BarChart3 className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      No views yet
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Publish a listing to start getting discovered.
                    </p>
                  </div>
                )}
              </Section>
            </div>
          </Reveal>
        )}

        {/* ── Insights tab ──────────────────────────────────── */}
        {activeTab === 'insights' && (
          <Reveal>
            <div className="space-y-10">
              <Section title="Listing health">
                <ListingInsightsPanel />
              </Section>
              <Section title="Demand">
                <DemandHeatmap />
              </Section>
              <div className="grid lg:grid-cols-2 gap-6">
                <ConversionFunnel days={30} />
                <RevenueChart />
                <TrafficSourcesCard days={30} />
                <CompetitorPricingCard />
              </div>
            </div>
          </Reveal>
        )}

        {activeTab === 'promote' && (
          <Reveal>
            <PromotionHub />
          </Reveal>
        )}

        {activeTab === 'kitchen' && hasGhostKitchen && (
          <Reveal>
            <KitchenProSuite />
          </Reveal>
        )}

        {activeTab === 'permits' && (
          <Reveal>
            <PermitsTab />
          </Reveal>
        )}
      </SectionReveal>

      <StripeConnectModal
        open={showStripeModal}
        onOpenChange={setShowStripeModal}
        onConnect={handleConnectStripe}
        isConnecting={isConnecting}
      />

      {!isLoading && (
        <BoostListingPrompt listings={listings as any} userId={user?.id} />
      )}
    </div>
  );
};

export default HostDashboard;
