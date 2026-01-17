import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock, XCircle, Store, Loader2, ShoppingBag, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EnhancedStatCard from './EnhancedStatCard';
import ShopperBookingCard from './ShopperBookingCard';
import BuyerSalesSection from './BuyerSalesSection';
import { useShopperBookings } from '@/hooks/useShopperBookings';

const ShopperDashboard = () => {
  const { bookings, isLoading, stats, cancelBooking, refetch } = useShopperBookings();

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const pastBookings = bookings.filter(b => ['declined', 'cancelled', 'completed'].includes(b.status));

  return (
    <div className="space-y-8">
      {/* Hero Browse CTA */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/15 via-primary/10 to-emerald-500/10 rounded-2xl p-8 border border-primary/20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Find your next rental</h2>
            <p className="text-muted-foreground max-w-md">
              Browse trucks, trailers, kitchens, and lots near you.
            </p>
          </div>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:scale-105">
            <Link to="/search">
              <Store className="h-5 w-5 mr-2" />
              Browse Listings
            </Link>
          </Button>
        </div>
      </div>

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
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="pending" className="relative rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Pending
            {stats.pending > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full animate-pulse">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="relative rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Approved
            {stats.approved > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">
                {stats.approved}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
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
            <div className="relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-12 text-center border border-border/50">
              <div className="absolute inset-0 bg-grid-pattern opacity-5" />
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground text-lg mb-2">No pending requests</h4>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Requests awaiting host response appear here.
              </p>
              <Button asChild size="lg" className="shadow-lg">
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
            <div className="relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-12 text-center border border-border/50">
              <div className="absolute inset-0 bg-grid-pattern opacity-5" />
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground text-lg mb-2">No confirmed bookings</h4>
              <p className="text-muted-foreground max-w-sm mx-auto">
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
            <div className="relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-12 text-center border border-border/50">
              <div className="absolute inset-0 bg-grid-pattern opacity-5" />
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground text-lg mb-2">No past bookings</h4>
              <p className="text-muted-foreground max-w-sm mx-auto">
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

      {/* Purchases/Sales Section */}
      <BuyerSalesSection />
    </div>
  );
};

export default ShopperDashboard;
