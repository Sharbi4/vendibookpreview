/**
 * WorkspaceBookingNew — rental booking creation inside the dashboard.
 *
 * `/dashboard/bookings/new/:listingId` mounts the real BookingCheckout flow
 * (same data, same money math, same PayPal path) inside the workspace shell.
 * `/dashboard/bookings/new` with no listing simply points the renter at the
 * marketplace — we never invent a listing to book.
 */
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Search } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import BookingCheckout from '@/pages/BookingCheckout';

export default function WorkspaceBookingNew() {
  const { listingId } = useParams<{ listingId: string }>();

  if (listingId) {
    return (
      <WorkspaceShell>
        <BookingCheckout embedded />
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <p className="v2-eyebrow">Rentals</p>
          <h1>Start a booking</h1>
          <p>Pick the rental you want, then complete dates, details and payment here.</p>
        </header>

        <div className="v2-panel v2-empty">
          <CalendarDays className="opacity-40" />
          <p>Choose a listing to book. Bookings you start appear in Activity and Payments.</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link to="/search?mode=rent" className="v2-btn">
              <Search className="mr-2 h-4 w-4" />
              Browse rentals
            </Link>
            <Link to="/dashboard/saved" className="v2-btn-quiet">
              Your saved listings
            </Link>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
