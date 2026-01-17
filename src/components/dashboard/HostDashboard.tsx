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

      {/* B) Key Metrics Row - Unified style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CompactStatCard 
          icon={Truck} 
          label="Active Listings" 
          value={stats.published}
        />
        <CompactStatCard 
          icon={Eye} 
          label="Views (30d)" 
          value={analytics?.totalViews || 0}
        />
        <CompactStatCard 
          icon={Calendar} 
          label="Pending Requests" 
          value={bookingStats.pending}
          highlight={bookingStats.pending > 0}
        />
        <CompactStatCard 
          icon={DollarSign} 
          label="Revenue (30d)" 
          value={revenueAnalytics?.revenueThisMonth ? `$${revenueAnalytics.revenueThisMonth.toLocaleString()}` : '$0'}
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
                  Create your first listing to start earning.
                </p>
                <Button asChild size="sm">
                  <Link to="/create-listing">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create Listing
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
                <p className="text-sm font-medium text-foreground mb-1">No analytics yet</p>
                <p className="text-xs text-muted-foreground">
                  Analytics appear once your listings get views.
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

      {/* E) Host Tools - Minimal link */}
      <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wrench className="h-4 w-4" />
          <span>Need help with pricing or permits?</span>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-primary h-7 text-xs">
          <Link to="/tools">Host Tools →</Link>
        </Button>
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
