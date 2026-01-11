import { Link } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock, XCircle, Store, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from './StatCard';
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
      {/* Browse CTA */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8 border border-primary/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Find Your Next Rental</h2>
            <p className="text-muted-foreground">
              Browse food trucks, trailers, ghost kitchens, and vendor lots.
            </p>
          </div>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link to="/">
              <Store className="h-5 w-5 mr-2" />
              Browse Listings
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={Calendar} 
          label="Total Bookings" 
          value={stats.total}
        />
        <StatCard 
          icon={Clock} 
          label="Pending" 
          value={stats.pending}
          iconBgClass="bg-amber-100"
          iconClass="text-amber-600"
        />
        <StatCard 
          icon={CheckCircle2} 
          label="Approved" 
          value={stats.approved}
          iconBgClass="bg-emerald-100"
          iconClass="text-emerald-600"
        />
        <StatCard 
          icon={XCircle} 
          label="Declined" 
          value={stats.declined}
          iconBgClass="bg-red-100"
          iconClass="text-red-600"
        />
      </div>

      {/* Bookings Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="pending" className="relative">
            Pending
            {stats.pending > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="relative">
            Approved
            {stats.approved > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">
                {stats.approved}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingBookings.length === 0 ? (
            <div className="bg-muted/50 rounded-xl p-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground mb-2">No pending requests</h4>
              <p className="text-muted-foreground mb-6">
                Your booking requests waiting for host approval will appear here.
              </p>
              <Button asChild>
                <Link to="/">Browse Listings</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingBookings.map((booking) => (
                <ShopperBookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={cancelBooking}
                  onPaymentInitiated={refetch}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Approved Tab */}
        <TabsContent value="approved">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : approvedBookings.length === 0 ? (
            <div className="bg-muted/50 rounded-xl p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground mb-2">No approved bookings</h4>
              <p className="text-muted-foreground">
                Your confirmed bookings will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedBookings.map((booking) => (
                <ShopperBookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={cancelBooking}
                  onPaymentInitiated={refetch}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Past Tab */}
        <TabsContent value="past">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pastBookings.length === 0 ? (
            <div className="bg-muted/50 rounded-xl p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-semibold text-foreground mb-2">No past bookings</h4>
              <p className="text-muted-foreground">
                Completed, declined, and cancelled bookings will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <ShopperBookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={cancelBooking}
                  onPaymentInitiated={refetch}
                />
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
