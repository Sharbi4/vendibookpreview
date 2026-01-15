import { Calendar, Loader2, Inbox } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingRequestCard from './BookingRequestCard';
import StatCard from './StatCard';
import { useHostBookings } from '@/hooks/useHostBookings';

const BookingRequestsSection = () => {
  const { bookings, isLoading, stats, approveBooking, declineBooking, cancelBooking } = useHostBookings();

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const declinedBookings = bookings.filter(b => b.status === 'declined');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard 
          icon={Calendar} 
          label="Pending" 
          value={stats.pending}
          iconBgClass="bg-amber-100"
          iconClass="text-amber-600"
        />
        <StatCard 
          icon={Calendar} 
          label="Approved" 
          value={stats.approved}
          iconBgClass="bg-emerald-100"
          iconClass="text-emerald-600"
        />
        <StatCard 
          icon={Calendar} 
          label="Total Requests" 
          value={stats.total}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            Pending
            {stats.pending > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingBookings.length === 0 ? (
            <EmptyState message="No pending booking requests" />
          ) : (
            <div className="space-y-4">
              {pendingBookings.map(booking => (
                <BookingRequestCard
                  key={booking.id}
                  booking={booking}
                  onApprove={approveBooking}
                  onDecline={declineBooking}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {approvedBookings.length === 0 ? (
            <EmptyState message="No approved bookings yet" />
          ) : (
            <div className="space-y-4">
              {approvedBookings.map(booking => (
                <BookingRequestCard
                  key={booking.id}
                  booking={booking}
                  onApprove={approveBooking}
                  onDecline={declineBooking}
                  onCancel={cancelBooking}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="declined" className="mt-4">
          {declinedBookings.length === 0 ? (
            <EmptyState message="No declined requests" />
          ) : (
            <div className="space-y-4">
              {declinedBookings.map(booking => (
                <BookingRequestCard
                  key={booking.id}
                  booking={booking}
                  onApprove={approveBooking}
                  onDecline={declineBooking}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="bg-muted/50 rounded-xl p-12 text-center">
    <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
    <p className="text-muted-foreground">{message}</p>
  </div>
);

export default BookingRequestsSection;
