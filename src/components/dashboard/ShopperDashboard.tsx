import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock, XCircle, Store, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ShopperBookingCard from './ShopperBookingCard';
import BuyerSalesSection from './BuyerSalesSection';
import { BuyerOffersSection } from './BuyerOffersSection';
import { DiscoveryHeroCard, DiscoveryGrid } from './DiscoveryGrid';
import BecomeHostCard from './BecomeHostCard';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useAuth } from '@/contexts/AuthContext';
const ShopperDashboard = () => {
  const { bookings, isLoading, stats, cancelBooking, refetch } = useShopperBookings();
  const { hasRole } = useAuth();
  const isHost = hasRole('host');

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const pastBookings = bookings.filter(b => ['declined', 'cancelled', 'completed'].includes(b.status));

  // Zero State: Discovery-First Pattern
  // Show discovery grid when user has no activity at all
  if (!isLoading && bookings.length === 0) {
    return (
      <div className="space-y-8">
        <div id="discovery-hero">
          <DiscoveryHeroCard />
        </div>
        <DiscoveryGrid />
        {!isHost && (
          <div id="become-host-card">
            <BecomeHostCard />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Browse CTA - Airbnb minimal style */}
      <div className="rounded-xl border border-border p-6 bg-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Find your next rental</h2>
              <p className="text-sm text-muted-foreground">
                Browse trucks, trailers, kitchens, and lots near you.
              </p>
            </div>
          </div>
          <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
            <Link to="/search">
              Browse Listings
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats - Airbnb minimal style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border p-4 bg-card">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Bookings</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-card">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">{stats.pending}</p>
          {stats.pending > 0 && (
            <p className="text-xs text-amber-600 mt-1">Awaiting response</p>
          )}
        </div>
        <div className="rounded-xl border border-border p-4 bg-card">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Approved</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">{stats.approved}</p>
          {stats.approved > 0 && (
            <p className="text-xs text-emerald-600 mt-1">Ready to go</p>
          )}
        </div>
        <div className="rounded-xl border border-border p-4 bg-card">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Declined</span>
          </div>
          <p className="text-2xl font-semibold text-foreground">{stats.declined}</p>
        </div>
      </div>

      {/* Bookings Tabs - Airbnb Underline Style */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full justify-start gap-6 h-auto p-0 bg-transparent border-b border-border rounded-none mb-6">
          <TabsTrigger 
            value="pending" 
            className="relative flex items-center gap-2 pb-3 px-0 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-foreground text-muted-foreground data-[state=active]:text-foreground transition-colors"
          >
            Pending
            {stats.pending > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full min-w-[20px] text-center">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="approved" 
            className="relative flex items-center gap-2 pb-3 px-0 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-foreground text-muted-foreground data-[state=active]:text-foreground transition-colors"
          >
            Approved
            {stats.approved > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-emerald-500 text-white rounded-full min-w-[20px] text-center">
                {stats.approved}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="past" 
            className="pb-3 px-0 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-foreground text-muted-foreground data-[state=active]:text-foreground transition-colors"
          >
            Past
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingBookings.length === 0 ? (
            <div className="rounded-xl border border-border p-12 text-center bg-card">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Clock className="h-7 w-7 text-muted-foreground" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">No pending requests</h4>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Requests awaiting host response appear here.
              </p>
              <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
                <Link to="/search">Browse Listings</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingBookings.map((booking, index) => (
                <div 
                  key={booking.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ShopperBookingCard
                    booking={booking}
                    onCancel={cancelBooking}
                    onPaymentInitiated={refetch}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved" className="animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : approvedBookings.length === 0 ? (
            <div className="rounded-xl border border-border p-12 text-center bg-card">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-7 w-7 text-muted-foreground" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">No confirmed bookings</h4>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Confirmed bookings appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedBookings.map((booking, index) => (
                <div 
                  key={booking.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ShopperBookingCard
                    booking={booking}
                    onCancel={cancelBooking}
                    onPaymentInitiated={refetch}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Past Tab */}
        <TabsContent value="past" className="animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pastBookings.length === 0 ? (
            <div className="rounded-xl border border-border p-12 text-center bg-card">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-7 w-7 text-muted-foreground" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">No past bookings</h4>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Completed and cancelled bookings appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pastBookings.map((booking, index) => (
                <div 
                  key={booking.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ShopperBookingCard
                    booking={booking}
                    onCancel={cancelBooking}
                    onPaymentInitiated={refetch}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* My Offers Section */}
      <BuyerOffersSection />

      {/* Purchases/Sales Section */}
      <BuyerSalesSection />
    </div>
  );
};

export default ShopperDashboard;
