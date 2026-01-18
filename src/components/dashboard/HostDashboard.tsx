import { Link } from 'react-router-dom';
import { Plus, Truck, Eye, Loader2, Calendar, BarChart3, DollarSign, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NextStepCard } from './NextStepCard';
import { CompactStatCard } from './CompactStatCard';
import { CompactInsights } from './CompactInsights';
import StripeStatusCard from './StripeStatusCard';
import HostListingCard from './HostListingCard';
import BookingRequestsSection from './BookingRequestsSection';
import SellerSalesSection from './SellerSalesSection';
import { EnhancedAnalytics } from './EnhancedAnalytics';
import { RevenueAnalyticsCard } from './RevenueAnalyticsCard';
import { GetBookedFasterCard } from './GetBookedFasterCard';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useListingAnalytics } from '@/hooks/useListingAnalytics';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { StripeConnectModal } from '@/components/listing-wizard/StripeConnectModal';
import { useState } from 'react';

const HostDashboard = () => {
  const { listings, isLoading, stats, pauseListing, publishListing, deleteListing } = useHostListings();
  const { stats: bookingStats } = useHostBookings();
  const { isConnected, hasAccountStarted, isLoading: stripeLoading, connectStripe, isConnecting, openStripeDashboard, isOpeningDashboard } = useStripeConnect();
  const { analytics, isLoading: analyticsLoading } = useListingAnalytics();
  const { analytics: revenueAnalytics, isLoading: revenueLoading } = useRevenueAnalytics();
  const [showStripeModal, setShowStripeModal] = useState(false);

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

      {/* B) Key Metrics Row - Tight labels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        <CompactStatCard 
          icon={Calendar} 
          label="Requests" 
          value={bookingStats.pending}
          subtext="Awaiting response"
          highlight={bookingStats.pending > 0}
        />
        <CompactStatCard 
          icon={DollarSign} 
          label="Revenue" 
          value={revenueAnalytics?.revenueThisMonth ? `$${revenueAnalytics.revenueThisMonth.toLocaleString()}` : '$0'}
          subtext="This month"
        />
      </div>

      {/* C) Listings Module - Primary work area */}
      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4 bg-muted/50 p-1 rounded-lg h-10">
          <TabsTrigger value="listings" className="rounded-md text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Listings
          </TabsTrigger>
          <TabsTrigger value="bookings" className="relative rounded-md text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Requests
            {bookingStats.pending > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full">
                {bookingStats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-md text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="revenue" className="rounded-md text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Revenue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-0">
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">My Listings</h3>
              <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                <Link to="/create-listing">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New Listing
                </Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : listings.length === 0 ? (
              <div className="py-8 text-center">
                <Truck className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No listings yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Create a listing to start earning.
                </p>
                <Button asChild size="sm">
                  <Link to="/create-listing">
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
                  />
                ))}
              </div>
            )}
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

      {/* E) Get Booked Faster Tips */}
      <GetBookedFasterCard />

      {/* F) Host Tools - Minimal link */}
      <div className="relative overflow-hidden rounded-xl p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/10 to-yellow-400/10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 animate-pulse" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-500 shadow-md flex items-center justify-center">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm text-foreground font-medium">Price smarter, write faster, stay compliant.</span>
          </div>
          <Button 
            size="sm" 
            asChild 
            className="bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white border-0 shadow-md text-xs"
          >
            <Link to="/tools">Open Host Tools</Link>
          </Button>
        </div>
      </div>

      {/* Sales Section */}
      <SellerSalesSection />

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
