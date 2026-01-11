import { Link } from 'react-router-dom';
import { Plus, Truck, FileText, Eye, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from './StatCard';
import StripeStatusCard from './StripeStatusCard';
import HostListingCard from './HostListingCard';
import BookingRequestsSection from './BookingRequestsSection';
import SellerSalesSection from './SellerSalesSection';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { StripeConnectModal } from '@/components/listing-wizard/StripeConnectModal';
import { useState } from 'react';

const HostDashboard = () => {
  const { listings, isLoading, stats, pauseListing, publishListing, deleteListing } = useHostListings();
  const { stats: bookingStats } = useHostBookings();
  const { isConnected, hasAccountStarted, isLoading: stripeLoading, connectStripe, isConnecting } = useStripeConnect();
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
      {/* Create Listing CTA */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8 border border-primary/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">List Your Asset</h2>
            <p className="text-muted-foreground">
              Start earning by listing your food truck, trailer, or kitchen space.
            </p>
          </div>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
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
        onConnect={handleConnectStripe}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={Truck} 
          label="Total Listings" 
          value={stats.total}
        />
        <StatCard 
          icon={Eye} 
          label="Published" 
          value={stats.published}
          iconBgClass="bg-emerald-100"
          iconClass="text-emerald-600"
        />
        <StatCard 
          icon={Calendar} 
          label="Pending Requests" 
          value={bookingStats.pending}
          iconBgClass="bg-amber-100"
          iconClass="text-amber-600"
        />
        <StatCard 
          icon={FileText} 
          label="Drafts" 
          value={stats.drafts}
          iconBgClass="bg-muted"
          iconClass="text-muted-foreground"
        />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="listings">My Listings</TabsTrigger>
          <TabsTrigger value="bookings" className="relative">
            Booking Requests
            {bookingStats.pending > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                {bookingStats.pending}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">My Listings</h3>
              {listings.length > 0 && (
                <Button variant="outline" size="sm" asChild>
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
              <div className="bg-muted/50 rounded-xl p-12 text-center">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-semibold text-foreground mb-2">No listings yet</h4>
                <p className="text-muted-foreground mb-6">
                  Create your first listing to start earning on Vendibook.
                </p>
                <Button asChild>
                  <Link to="/create-listing">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Listing
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
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

        <TabsContent value="bookings">
          <BookingRequestsSection />
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
