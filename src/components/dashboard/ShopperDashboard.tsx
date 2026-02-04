import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock, XCircle, Store, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EnhancedStatCard from './EnhancedStatCard';
import ShopperBookingCard from './ShopperBookingCard';
import BuyerSalesSection from './BuyerSalesSection';
import { BuyerOffersSection } from './BuyerOffersSection';
import { DiscoveryHeroCard, DiscoveryGrid } from './DiscoveryGrid';
import { useShopperBookings } from '@/hooks/useShopperBookings';

const ShopperDashboard = () => {
  const { bookings, isLoading, stats, cancelBooking, refetch } = useShopperBookings();

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const pastBookings = bookings.filter(b => ['declined', 'cancelled', 'completed'].includes(b.status));

  // Zero State: Discovery-First Pattern
  // Show discovery grid when user has no activity at all
  if (!isLoading && bookings.length === 0) {
    return (
      <div className="space-y-8">
        <DiscoveryHeroCard />
        <DiscoveryGrid />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Browse CTA */}
      <Card className="border-0 shadow-xl">
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                <Store className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Find your next rental</h2>
                <p className="text-muted-foreground">
                  Browse trucks, trailers, kitchens, and lots near you.
                </p>
              </div>
            </div>
            <Button asChild size="lg" variant="dark-shine">
              <Link to="/search">
                Browse Listings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <EnhancedStatCard 
          icon={Calendar} 
          label="Bookings" 
          value={stats.total}
          variant="primary"
        />
        <EnhancedStatCard 
          icon={Clock} 
          label="Pending" 
          value={stats.pending}
          subtext={stats.pending > 0 ? "Awaiting response" : undefined}
          variant="warning"
        />
        <EnhancedStatCard 
          icon={CheckCircle2} 
          label="Approved" 
          value={stats.approved}
          subtext={stats.approved > 0 ? "Ready to go" : undefined}
          variant="success"
        />
        <EnhancedStatCard 
          icon={XCircle} 
          label="Declined" 
          value={stats.declined}
          variant="danger"
        />
      </div>

      {/* Bookings Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 p-1.5 h-auto bg-card border border-border rounded-2xl shadow-sm">
          <TabsTrigger 
            value="pending" 
            className="relative flex items-center justify-center gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200"
          >
            Pending
            {stats.pending > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="approved" 
            className="relative flex items-center justify-center gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200"
          >
            Approved
            {stats.approved > 0 && (
              <span className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">
                {stats.approved}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="past" 
            className="flex items-center justify-center gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200"
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
            <Card className="border-0 shadow-xl">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-foreground text-lg mb-2">No pending requests</h4>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Requests awaiting host response appear here.
                </p>
                <Button asChild size="lg">
                  <Link to="/search">Browse Listings</Link>
                </Button>
              </CardContent>
            </Card>
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
            <Card className="border-0 shadow-xl">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-foreground text-lg mb-2">No confirmed bookings</h4>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Confirmed bookings appear here.
                </p>
              </CardContent>
            </Card>
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
            <Card className="border-0 shadow-xl">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-foreground text-lg mb-2">No past bookings</h4>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Completed and cancelled bookings appear here.
                </p>
              </CardContent>
            </Card>
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
