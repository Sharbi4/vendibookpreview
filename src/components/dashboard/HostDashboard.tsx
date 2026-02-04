import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Truck, Eye, Loader2, Calendar, BarChart3, DollarSign, HandCoins, ExternalLink, Grid3X3, List, LayoutGrid, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompactStatCard } from './CompactStatCard';
import { CompactInsights } from './CompactInsights';
import StripeNotificationBubble from './StripeNotificationBubble';
import HostListingCard from './HostListingCard';
import BookingRequestsSection from './BookingRequestsSection';
import SellerSalesSection from './SellerSalesSection';
import DraftsSection from './DraftsSection';
import { EnhancedAnalytics } from './EnhancedAnalytics';
import { RevenueAnalyticsCard } from './RevenueAnalyticsCard';
import { HostOffersSection } from './HostOffersSection';
import HostOnboardingWizard from './HostOnboardingWizard';
import ActionRequiredBanner from './ActionRequiredBanner';
import { OperationsTable } from './OperationsTable';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useListingAnalytics } from '@/hooks/useListingAnalytics';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { useHostOffers } from '@/hooks/useHostOffers';
import { useAuth } from '@/contexts/AuthContext';
import { StripeConnectModal } from '@/components/listing-wizard/StripeConnectModal';
import { useMemo, useState } from 'react';

const HostDashboard = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { listings, isLoading, stats, pauseListing, publishListing, deleteListing, updateListingPrice } = useHostListings();
  const { stats: bookingStats } = useHostBookings();
  const { isConnected, hasAccountStarted, isLoading: stripeLoading, connectStripe, isConnecting, openStripeDashboard, isOpeningDashboard } = useStripeConnect();
  const { analytics, isLoading: analyticsLoading } = useListingAnalytics();
  const { analytics: revenueAnalytics, isLoading: revenueLoading } = useRevenueAnalytics();
  const { pendingOffers } = useHostOffers();
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // URL-controlled tab
  const activeTab = searchParams.get('tab') || 'overview';

  // Determine user type based on listing modes
  const userType = useMemo(() => {
    const hasRentals = listings.some(l => l.mode === 'rent');
    const hasSales = listings.some(l => l.mode === 'sale');
    if (hasRentals && hasSales) return 'hybrid';
    if (hasSales) return 'seller';
    return 'host';
  }, [listings]);

  // Corporate/Power User detection
  const isPowerUser = listings.length > 2;

  // Filter drafts for the DraftsSection
  const draftListings = useMemo(() => 
    listings.filter(l => l.status === 'draft'),
    [listings]
  );

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

  // Zero State: Onboarding Wizard Pattern
  if (!isLoading && listings.length === 0) {
    return <HostOnboardingWizard />;
  }

  // Check if there are actions requiring attention
  const hasActionRequired = bookingStats.pending > 0 || pendingOffers.length > 0 || draftListings.length > 0;

  return (
    <div className="space-y-6">
      {/* Dashboard Header - Dark Shine Design */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center">
              <LayoutGrid className="h-6 w-6 text-background" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Overview</h2>
              <p className="text-sm text-muted-foreground">
                {userType === 'seller' ? 'Manage your sales pipeline.' : 'Manage fleet availability and revenue.'}
              </p>
            </div>
          </div>
          
          {/* Action Buttons - Even Row Layout with Dark Shine */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Link 
              to="/host/bookings"
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-foreground text-background text-sm font-medium border border-foreground hover:bg-foreground/80 transition-all duration-200"
            >
              <Calendar className="h-4 w-4" />
              Bookings
            </Link>
            <Link 
              to="/host/reporting"
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-foreground text-background text-sm font-medium border border-foreground hover:bg-foreground/80 transition-all duration-200"
            >
              <BarChart3 className="h-4 w-4" />
              Reporting
            </Link>
            <Link 
              to={`/profile/${user?.id}`}
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-foreground text-background text-sm font-medium border border-foreground hover:bg-foreground/80 transition-all duration-200"
            >
              <ExternalLink className="h-4 w-4" />
              Storefront
            </Link>
            <Link 
              to="/list"
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-foreground text-background text-sm font-medium border border-foreground hover:bg-foreground/80 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              {userType === 'seller' ? 'Sell Item' : 'Add Asset'}
            </Link>
            <Link 
              to="/help"
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-foreground text-background text-sm font-medium border border-foreground hover:bg-foreground/80 transition-all duration-200"
            >
              <HelpCircle className="h-4 w-4" />
              Support
            </Link>
          </div>
        </div>
        
        {/* Stripe Status - Inline */}
        <div className="mt-4 pt-4 border-t border-border">
          <StripeNotificationBubble 
            isConnected={isConnected}
            isLoading={stripeLoading}
            onConnect={handleConnectStripe}
            isConnecting={isConnecting}
          />
        </div>
      </div>

      {/* Action Required Banner - Priority over other content */}
      {hasActionRequired && (
        <ActionRequiredBanner 
          pendingRequests={bookingStats.pending}
          pendingOffers={pendingOffers.length}
          draftListings={draftListings.length}
        />
      )}

      {/* Key Metrics Row - Airbnb Minimal Style */}
      <div className={`grid grid-cols-2 gap-4 ${userType === 'hybrid' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <CompactStatCard 
          icon={Truck} 
          label="Listings" 
          value={stats.published}
          subtext={stats.drafts > 0 ? `${stats.drafts} drafts` : "Active"}
          href="/host/listings"
        />
        <CompactStatCard 
          icon={Eye} 
          label="Views" 
          value={analytics?.totalViews || 0}
          subtext="Last 30 days"
        />
        {userType !== 'seller' && (
          <CompactStatCard 
            icon={Calendar} 
            label="Requests" 
            value={bookingStats.pending}
            subtext="Awaiting response"
            highlight={bookingStats.pending > 0}
          />
        )}
        {(userType !== 'host' || pendingOffers.length > 0) && (
          <CompactStatCard 
            icon={HandCoins} 
            label="Offers" 
            value={pendingOffers.length}
            subtext="Pending review"
            highlight={pendingOffers.length > 0}
          />
        )}
        <CompactStatCard 
          icon={DollarSign} 
          label="Revenue" 
          value={revenueAnalytics?.revenueThisMonth ? `$${revenueAnalytics.revenueThisMonth.toLocaleString()}` : '$0'}
          subtext="This month"
        />
      </div>

      {/* Resume Drafts Section - Only show on Overview */}
      {!isLoading && draftListings.length > 0 && activeTab === 'overview' && (
        <DraftsSection drafts={draftListings} onDelete={deleteListing} />
      )}

      {/* View Toggle for Power Users - Only on Inventory */}
      {isPowerUser && activeTab === 'inventory' && (
        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'table' ? 'default' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tab Content: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Priority: Bookings & Offers - Only show if there are pending requests */}
              {userType !== 'seller' && bookingStats.pending > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <BookingRequestsSection />
                </div>
              )}
              <HostOffersSection />
            </div>
            <div className="space-y-6">
              {/* Quick Analytics */}
              <CompactInsights />
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Inventory (Listings & Drafts) */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Drafts Section - Show in Inventory */}
          {!isLoading && draftListings.length > 0 && (
            <DraftsSection drafts={draftListings} onDelete={deleteListing} />
          )}
          
          {viewMode === 'table' && isPowerUser ? (
            <OperationsTable 
              listings={listings}
              onPublish={handlePublish}
              onPause={pauseListing}
            />
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">My Listings</h3>
                <Button variant="dark-shine" size="sm" asChild className="h-8 text-xs rounded-xl">
                  <Link to="/list">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    New Listing
                  </Link>
                </Button>
              </div>
              <div className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : listings.filter(l => l.status !== 'draft').length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No published listings yet</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Create a listing to start earning.
                    </p>
                    <Button asChild size="sm" variant="dark-shine" className="rounded-xl">
                      <Link to="/list">
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        New Listing
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listings.filter(l => l.status !== 'draft').map((listing) => (
                      <HostListingCard
                        key={listing.id}
                        listing={listing}
                        onPause={pauseListing}
                        onPublish={handlePublish}
                        onDelete={deleteListing}
                        onPriceUpdate={updateListingPrice}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Reservations (Bookings & Transactions) */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          {userType !== 'seller' && bookingStats.pending > 0 && (
            <div className="p-4 rounded-2xl bg-card border border-border/60">
              <BookingRequestsSection />
            </div>
          )}
          {/* Include transactions here */}
          {userType !== 'host' && <SellerSalesSection />}
        </div>
      )}

      {/* Tab Content: Financials */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Revenue Analytics */}
          <div className="p-4 rounded-xl bg-card border border-border">
            {revenueLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : revenueAnalytics ? (
              <RevenueAnalyticsCard 
                analytics={revenueAnalytics} 
                onOpenStripeDashboard={openStripeDashboard}
                isOpeningDashboard={isOpeningDashboard}
              />
            ) : (
              <div className="py-8 text-center">
                <DollarSign className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No revenue yet</p>
                <p className="text-xs text-muted-foreground">
                  Revenue analytics appear once you make sales.
                </p>
              </div>
            )}
          </div>

          {/* Analytics */}
          <div className="p-4 rounded-xl bg-card border border-border">
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : analytics ? (
              <EnhancedAnalytics 
                analytics={analytics} 
                stats={stats}
                bookingStats={bookingStats}
              />
            ) : (
              <div className="py-8 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No views yet</p>
                <p className="text-xs text-muted-foreground">
                  Publish a listing to start getting discovered.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Stripe Connect Modal */}
      <StripeConnectModal
        open={showStripeModal}
        onOpenChange={setShowStripeModal}
        onConnect={handleConnectStripe}
        isConnecting={isConnecting}
      />
    </div>
  );
};

export default HostDashboard;
