/**
 * WorkspaceBookingDetail — the booking confirmation / status surface inside
 * the dashboard. Reuses BookingConfirmation so the state machine (processing,
 * confirmed, awaiting host, declined, failed) stays in one place, with the
 * booking's signed documents on their own tab.
 */
import { Link, useParams } from 'react-router-dom';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import BookingConfirmation from '@/pages/BookingConfirmation';
import { DocumentsCard } from '@/components/documents/DocumentsCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

        <Tabs defaultValue="status">
          <TabsList>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-6">
            <BookingConfirmation embedded bookingId={bookingId} />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            {bookingId ? (
              <DocumentsCard scope={{ booking_id: bookingId }} title="Rental documents" />
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </WorkspaceShell>
  );
}
