import { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Search, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useHostBookings } from '@/hooks/useHostBookings';
import BookingRequestCard from '@/components/dashboard/BookingRequestCard';
import { getCounterpartyName } from '@/lib/displayName';

/**
 * Host booking manager, rendered inside the Activity section of the
 * dashboard workspace. Same data and the same approve / decline / cancel /
 * deposit actions as the old standalone bookings page — only the shell
 * around it changed.
 */
export default function WorkspaceHostBookings() {
  const {
    bookings,
    isLoading,
    approveBooking,
    declineBooking,
    cancelBooking,
    processDepositRefund,
  } = useHostBookings();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) =>
        getCounterpartyName(b.shopper, 'Guest').toLowerCase().includes(q) ||
        (b.listing?.title || '').toLowerCase().includes(q),
    );
  }, [bookings, query]);

  const pending = filtered.filter((b) => b.status === 'pending');
  const confirmed = filtered.filter((b) => b.status === 'approved');
  const past = filtered.filter((b) => b.status === 'completed');
  const cancelled = filtered.filter((b) => ['cancelled', 'declined'].includes(b.status));

  if (!isLoading && bookings.length === 0) return null;

  const cards = (list: typeof bookings) =>
    list.map((b) => (
      <BookingRequestCard
        key={b.id}
        booking={b}
        onApprove={approveBooking}
        onDecline={declineBooking}
        onCancel={cancelBooking}
        onDepositAction={processDepositRefund}
      />
    ));

  return (
    <section className="v2-panel">
      <div className="v2-panel-head">
        <div>
          <h2>Booking requests</h2>
          <p>Approve, decline, or follow up on rentals of your listings.</p>
        </div>
        {pending.length > 0 && (
          <span className="v2-status is-warn">
            {pending.length} awaiting you
          </span>
        )}
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search renter or listing..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <Tabs defaultValue={pending.length ? 'pending' : 'confirmed'} className="w-full">
          <TabsList className="mb-5 w-full justify-start overflow-x-auto md:w-auto">
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {pending.length > 0 && (
                <Badge variant="secondary" className="h-5 min-w-[20px] bg-amber-100 px-1.5 text-amber-700">
                  {pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="gap-2">
              Confirmed
              {confirmed.length > 0 && (
                <Badge variant="secondary" className="h-5 min-w-[20px] bg-emerald-100 px-1.5 text-emerald-700">
                  {confirmed.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {isLoading ? <Loading /> : pending.length === 0 ? <Empty type="pending" /> : cards(pending)}
          </TabsContent>
          <TabsContent value="confirmed" className="space-y-4">
            {isLoading ? <Loading /> : confirmed.length === 0 ? <Empty type="confirmed" /> : cards(confirmed)}
          </TabsContent>
          <TabsContent value="past" className="space-y-4">
            {isLoading ? (
              <Loading />
            ) : past.length === 0 ? (
              <Empty type="completed" />
            ) : (
              past.map((b) => <BookingRow key={b.id} booking={b} status="completed" />)
            )}
          </TabsContent>
          <TabsContent value="cancelled" className="space-y-4">
            {isLoading ? (
              <Loading />
            ) : cancelled.length === 0 ? (
              <Empty type="cancelled" />
            ) : (
              cancelled.map((b) => <BookingRow key={b.id} booking={b} status="cancelled" />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

const BookingRow = ({ booking, status }: { booking: any; status: string }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
    <div className="flex min-w-0 items-center gap-4">
      <div
        className={`rounded-full p-2 ${
          status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'
        }`}
      >
        {status === 'cancelled' ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <h4 className="truncate font-semibold">{getCounterpartyName(booking.shopper, 'Guest')}</h4>
        <p className="line-clamp-1 text-sm text-muted-foreground">{booking.listing?.title}</p>
        {booking.is_hourly_booking && booking.start_time && booking.end_time ? (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(booking.start_date).toLocaleDateString()} • {booking.start_time} – {booking.end_time}
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(booking.start_date).toLocaleDateString()} –{' '}
            {new Date(booking.end_date).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
    <div className="hidden text-right sm:block">
      <p className="font-bold">${booking.total_price}</p>
      <p className="text-xs capitalize text-muted-foreground">{status}</p>
    </div>
  </div>
);

const Empty = ({ type }: { type: string }) => (
  <div className="rounded-xl border-2 border-dashed border-border py-10 text-center">
    <p className="text-sm text-muted-foreground">No {type} bookings.</p>
  </div>
);

const Loading = () => (
  <div className="py-10 text-center">
    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    <p className="text-sm text-muted-foreground">Loading bookings...</p>
  </div>
);
