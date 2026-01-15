import { Link } from 'react-router-dom';
import { Plus, Truck, FileText, Eye, Loader2, Calendar, BarChart3, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EnhancedStatCard from './EnhancedStatCard';
import StripeStatusCard from './StripeStatusCard';
import HostListingCard from './HostListingCard';
import BookingRequestsSection from './BookingRequestsSection';
import SellerSalesSection from './SellerSalesSection';
import { AIInsightsCard } from './AIInsightsCard';
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
    <div className="space-y-8">
      {/* Hero CTA with enhanced gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/15 via-primary/10 to-purple-500/10 rounded-2xl p-8 border border-primary/20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">List Your Asset</h2>
            <p className="text-muted-foreground max-w-md">
              Start earning by listing your food truck, trailer, or kitchen space. Join thousands of successful hosts.
            </p>
          </div>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:scale-105">
            <Link to="/create-listing">
              <Plus className="h-5 w-5 mr-2" />
              Create Listing
            </Link>
          </Button>
        </div>
      </div>

      {/* Stripe Status */}
      <StripeStatusCard 
        isConnected={isConnected}
        hasAccountStarted={hasAccountStarted}
        isLoading={stripeLoading}
        isOpeningDashboard={isOpeningDashboard}
        onConnect={handleConnectStripe}
        onOpenDashboard={openStripeDashboard}
      />

      {/* AI Insights Section - Now powered by real AI */}
      <AIInsightsCard />

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <EnhancedStatCard 
          icon={Truck} 
          label="Total Listings" 
          value={stats.total}
          subtext={`${stats.published} active`}
          variant="primary"
        />
        <EnhancedStatCard 
          icon={Eye} 
          label="Total Views" 
          value={analytics?.totalViews || 0}
          trend={analytics?.viewsTrend}
          variant="success"
        />
        <EnhancedStatCard 
          icon={Calendar} 
          label="Pending Requests" 
          value={bookingStats.pending}
          subtext="Awaiting response"
          variant="warning"
        />
        <EnhancedStatCard 
          icon={FileText} 
          label="Drafts" 
          value={stats.drafts}
          subtext="Ready to publish"
          variant="info"
        />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="listings" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            My Listings
          </TabsTrigger>
          <TabsTrigger value="bookings" className="relative rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Booking Requests
            {bookingStats.pending > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full animate-pulse">
                {bookingStats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="revenue" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <DollarSign className="h-4 w-4 mr-1.5" />
            Revenue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="animate-fade-in">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">My Listings</h3>
              {listings.length > 0 && (
                <Button variant="outline" size="sm" asChild className="hover:scale-105 transition-transform">
                  <Link to="/create-listing">
                    <Plus className="h-4 w-4 mr-1" />
                    New Listing
                  </Link>
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : listings.length === 0 ? (
              <div className="relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-12 text-center border border-border/50">
                <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                <Truck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-semibold text-foreground text-lg mb-2">No listings yet</h4>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Create your first listing to start earning on Vendibook.
                </p>
                <Button asChild size="lg" className="shadow-lg">
                  <Link to="/create-listing">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Listing
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map((listing, index) => (
                  <div 
                    key={listing.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <HostListingCard
                      listing={listing}
                      onPause={pauseListing}
                      onPublish={handlePublish}
                      onDelete={deleteListing}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="animate-fade-in">
          <BookingRequestsSection />
        </TabsContent>

        <TabsContent value="analytics" className="animate-fade-in">
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : analytics ? (
            <EnhancedAnalytics 
              analytics={analytics} 
              stats={stats}
              bookingStats={bookingStats}
            />
          ) : (
            <div className="relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-12 text-center border border-border/50">
              <div className="absolute inset-0 bg-grid-pattern opacity-5" />
              <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground text-lg mb-2">No analytics yet</h4>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Analytics will appear once your listings start getting views.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="animate-fade-in">
          {revenueLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : revenueAnalytics ? (
            <RevenueAnalyticsCard 
              analytics={revenueAnalytics} 
              onOpenStripeDashboard={openStripeDashboard}
              isOpeningDashboard={isOpeningDashboard}
            />
          ) : (
            <div className="relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-12 text-center border border-border/50">
              <div className="absolute inset-0 bg-grid-pattern opacity-5" />
              <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground text-lg mb-2">No revenue yet</h4>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Revenue analytics will appear once you start making sales.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

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
