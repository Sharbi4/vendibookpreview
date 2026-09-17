/**
 * Rental bookings in the money center. Shows the renter's booking payments and
 * the host's received bookings straight from booking_requests — no derived or
 * invented payout figures.
 */
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useHostBookings } from '@/hooks/useHostBookings';

const money = (value: number | null | undefined) =>
  value == null
    ? null
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));

const dateRange = (start: string, end: string) => {
  try {
    const s = new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const e = new Date(end).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${s} – ${e}`;
  } catch {
    return null;
  }
};

type Row = {
  id: string;
  title: string;
  side: string;
  dates: string | null;
  paymentStatus: string;
  status: string;
  amount: string | null;
  href: string;
};

export default function WorkspaceBookingPayments() {
  const { bookings: renterBookings, isLoading: renterLoading } = useShopperBookings();
  const { bookings: hostBookings, isLoading: hostLoading } = useHostBookings();

  const rows: Row[] = [
    ...renterBookings.map((b) => ({
      id: `renter-${b.id}`,
      title: b.listing?.title || 'Rental booking',
      side: 'You paid',
      dates: dateRange(b.start_date, b.end_date),
      paymentStatus: b.payment_status || 'pending',
      status: b.status || 'pending',
      amount: money(b.total_price),
      href: `/dashboard/bookings/${b.id}`,
    })),
    ...hostBookings.map((b) => ({
      id: `host-${b.id}`,
      title: b.listing?.title || 'Rental booking',
      side: b.shopper?.full_name ? `Booked by ${b.shopper.full_name}` : 'Booked by a renter',
      dates: dateRange(b.start_date, b.end_date),
      paymentStatus: b.payment_status || 'pending',
      status: b.status || 'pending',
      amount: money(b.total_price),
      href: `/dashboard/bookings/${b.id}`,
    })),
  ];

  if (renterLoading || hostLoading) {
    return (
      <div className="space-y-3 p-5">
        <div className="v2-skeleton h-5 w-44" />
        <div className="v2-skeleton h-16 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="v2-panel-head">
        <div>
          <h2>Rental bookings</h2>
          <p>Booking payments you made and bookings paid to you.</p>
        </div>
        <Link to="/dashboard/activity?filter=rentals" className="v2-btn-quiet">
          View all
        </Link>
      </div>

      {rows.length ? (
        rows.map((row) => (
          <Link key={row.id} to={row.href} className="v2-activity-row">
            <span className="v2-activity-thumb">
              <CalendarDays />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="truncate">{row.title}</strong>
              <small className="truncate">
                {row.side}
                {row.dates ? ` · ${row.dates}` : ''}
              </small>
              <span className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`v2-status${row.paymentStatus === 'paid' ? ' is-ok' : ' is-warn'}`}
                >
                  Payment: {row.paymentStatus}
                </span>
                <small>Booking: {row.status}</small>
              </span>
            </span>
            {row.amount && <strong>{row.amount}</strong>}
          </Link>
        ))
      ) : (
        <div className="v2-empty">
          <CalendarDays className="opacity-40" />
          <p>No rental bookings yet.</p>
          <Link to="/dashboard/bookings/new" className="v2-btn-quiet">
            Start a booking
          </Link>
        </div>
      )}
    </>
  );
}
