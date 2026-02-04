import { Link } from 'react-router-dom';
import { Plus, Truck, Eye, Loader2, Calendar, BarChart3, DollarSign, Wrench, Tag, HandCoins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NextStepCard } from './NextStepCard';
import { CompactStatCard } from './CompactStatCard';
import { CompactInsights } from './CompactInsights';
import StripeStatusCard from './StripeStatusCard';
import HostListingCard from './HostListingCard';
import BookingRequestsSection from './BookingRequestsSection';
import SellerSalesSection from './SellerSalesSection';
import DraftsSection from './DraftsSection';
import { EnhancedAnalytics } from './EnhancedAnalytics';
import { RevenueAnalyticsCard } from './RevenueAnalyticsCard';
import { GetBookedFasterCard } from './GetBookedFasterCard';
import { HostOffersSection } from './HostOffersSection';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useListingAnalytics } from '@/hooks/useListingAnalytics';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { useHostOffers } from '@/hooks/useHostOffers';
import { StripeConnectModal } from '@/components/listing-wizard/StripeConnectModal';
import { useMemo, useState, useEffect } from 'react';

const HostDashboard = () => {
  const { listings, isLoading, stats, pauseListing, publishListing, deleteListing, updateListingPrice } = useHostListings();
  const { stats: bookingStats } = useHostBookings();
  const { isConnected, hasAccountStarted, isLoading: stripeLoading, connectStripe, isConnecting, openStripeDashboard, isOpeningDashboard } = useStripeConnect();
  const { analytics, isLoading: analyticsLoading } = useListingAnalytics();
  const { analytics: revenueAnalytics, isLoading: revenueLoading } = useRevenueAnalytics();
  const { pendingOffers } = useHostOffers();
  const [showStripeModal, setShowStripeModal] = useState(false);

  // Determine user type based on listing modes
  const userType = useMemo(() => {
    const hasRentals = listings.some(l => l.mode === 'rent');
    const hasSales = listings.some(l => l.mode === 'sale');
    if (hasRentals && hasSales) return 'hybrid';
    if (hasSales) return 'seller';
    return 'host'; // Default for empty or rental-only
  }, [listings]);

  // Controlled tabs with auto-redirect for sellers
  const [activeTab, setActiveTab] = useState('listings');

  useEffect(() => {
    // If pure seller lands on "bookings" tab, redirect to "offers"
    if (!isLoading && userType === 'seller' && activeTab === 'bookings') {
      setActiveTab('offers');
    }
  }, [isLoading, userType, activeTab]);

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

  return (
    <div className="space-y-6">
      {/* Dynamic Header - Context-aware branding */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {userType === 'seller' ? <Tag className="h-5 w-5 text-primary" /> : <Truck className="h-5 w-5 text-primary" />}
          <h1 className="text-xl font-semibold text-foreground">
            {userType === 'seller' ? 'Seller Console' : 
             userType === 'hybrid' ? 'Vendor Dashboard' : 'Host Dashboard'}
          </h1>
        </div>
        <Button variant="dark-shine" size="sm" asChild className="rounded-xl">
          <Link to="/list">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {userType === 'seller' ? 'Sell Item' : 'New Listing'}
          </Link>
        </Button>
      </div>

      {/* A) Next Step Action Card - Single priority action */}
      <NextStepCard 
        onConnectStripe={handleConnectStripe}
        isConnectingStripe={isConnecting}
      />

      {/* Stripe Status - Compact badge when connected */}
      {isConnected && (
        <StripeStatusCard 
          isConnected={isConnected}
          hasAccountStarted={hasAccountStarted}
          isLoading={stripeLoading}
          isOpeningDashboard={isOpeningDashboard}
          onConnect={handleConnectStripe}
          onOpenDashboard={openStripeDashboard}
        />
      )}

      {/* B) Key Metrics Row - Adaptive based on userType */}
      <div className={`grid grid-cols-2 gap-3 ${userType === 'hybrid' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        <CompactStatCard 
          icon={Truck} 
          label="Listings" 
          value={stats.published}
          subtext={`${stats.published} active`}
        />
        <CompactStatCard 
          icon={Eye} 
          label="Views" 
          value={analytics?.totalViews || 0}
          subtext="Last 30 days"
        />
        {/* Show Requests metric only for non-sellers */}
        {userType !== 'seller' && (
          <CompactStatCard 
            icon={Calendar} 
            label="Requests" 
            value={bookingStats.pending}
            subtext="Awaiting response"
            highlight={bookingStats.pending > 0}
          />
        )}
        {/* Show Offers metric only for non-hosts (or hosts with pending offers) */}
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

      {/* Resume Drafts Section */}
      {!isLoading && draftListings.length > 0 && (
        <DraftsSection drafts={draftListings} onDelete={deleteListing} />
      )}

      {/* C) Listings Module - Primary work area with smart tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full mb-4 bg-muted/50 p-1 rounded-lg h-10 ${
          userType === 'hybrid' ? 'grid-cols-5' : 'grid-cols-4'
        }`}>
          <TabsTrigger value="listings" className="rounded-md text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Listings
          </TabsTrigger>
          {/* Show Offers tab for sellers/hybrid OR hosts with pending offers */}
          {(userType !== 'host' || pendingOffers.length > 0) && (
            <TabsTrigger value="offers" className="relative rounded-md text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Offers
              {pendingOffers.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                  {pendingOffers.length}
                </span>
              )}
            </TabsTrigger>
          )}
          {/* Show Requests tab only for hosts/hybrid */}
          {userType !== 'seller' && (
            <TabsTrigger value="bookings" className="relative rounded-md text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Requests
              {bookingStats.pending > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full">
                  {bookingStats.pending}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="analytics" className="rounded-md text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="revenue" className="rounded-md text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Revenue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-0">
          <div className="rounded-2xl border-0 shadow-xl bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border">
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
              ) : listings.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No listings yet</p>
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
                  {listings.map((listing) => (
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
        </TabsContent>

        <TabsContent value="offers" className="mt-0">
          <div className="p-4 rounded-xl bg-card border border-border">
            <HostOffersSection />
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="mt-0">
          <div className="p-4 rounded-xl bg-card border border-border">
            <BookingRequestsSection />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
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
        </TabsContent>

        <TabsContent value="revenue" className="mt-0">
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
        </TabsContent>
      </Tabs>

      {/* D) Insights - Collapsed by default */}
      <CompactInsights />

      {/* E) Get Booked Faster Tips - Only for hosts/hybrid */}
      {userType !== 'seller' && <GetBookedFasterCard />}

      {/* F) Host Tools - Minimal link */}
      <div className="rounded-xl p-4 bg-card border border-border shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-lg flex items-center justify-center">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-sm text-foreground font-medium">Price smarter, write faster, stay compliant.</span>
          </div>
          <Button 
            size="sm" 
            variant="dark-shine"
            asChild
            className="rounded-xl"
          >
            <Link to="/tools">Open Host Tools</Link>
          </Button>
        </div>
      </div>

      {/* Sales Section - Only for sellers/hybrid */}
      {userType !== 'host' && <SellerSalesSection />}

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
