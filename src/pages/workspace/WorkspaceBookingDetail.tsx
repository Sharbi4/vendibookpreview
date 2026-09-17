/**
 * WorkspaceBookingDetail — the booking confirmation / status surface inside
 * the dashboard. Reuses BookingConfirmation so the state machine (processing,
 * confirmed, awaiting host, declined, failed) stays in one place.
 */
import { Link, useParams } from 'react-router-dom';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import BookingConfirmation from '@/pages/BookingConfirmation';

export default function WorkspaceBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <p className="v2-eyebrow">Rental booking</p>
          <h1>Booking status</h1>
          <p>
            Live status for this booking.{' '}
            <Link to="/dashboard/activity?filter=rentals">See all your bookings</Link>.
          </p>
        </header>

        <BookingConfirmation embedded bookingId={bookingId} />
      </div>
    </WorkspaceShell>
  );
}
