import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, CalendarCheck, MessageSquare, X, RotateCcw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddToCalendarButton } from '@/components/booking/AddToCalendarButton';
import { ConfirmActionDialog } from '@/components/trust/ConfirmActionDialog';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import EmptyState from '../shared/EmptyState';
import PhotoListingCard from '../shared/PhotoListingCard';
import StatusChipPopover from '../shared/StatusChipPopover';
import { toast } from 'sonner';

type FilterId = 'upcoming' | 'past' | 'cancelled';

const STATUS_EXPLAIN: Record<string, { label: string; tone: 'success' | 'warning' | 'muted' | 'info'; body: string; next?: string }> = {
  pending: {
    label: 'Awaiting host',
    tone: 'warning',
    body: 'The host has your request and is deciding whether to approve.',
    next: "We'll notify you the moment they respond. You can still message the host or cancel.",
  },
  approved: {
    label: 'Approved',
    tone: 'success',
    body: 'Your booking is confirmed. Add it to your calendar so you don\'t miss it.',
    next: 'Show up on the day. Contact the host if plans change.',
  },
  declined: { label: 'Declined', tone: 'muted', body: 'The host was unable to accept this request.', next: 'Try a similar listing or a different date.' },
  cancelled: { label: 'Cancelled', tone: 'muted', body: 'This booking was cancelled.', next: 'Any refund follows the listing\'s cancellation policy.' },
  completed: { label: 'Completed', tone: 'success', body: 'Your rental has ended.', next: 'Leave a review to help future renters.' },
};

const BuyerBookingsTab = () => {
  const { bookings, isLoading, cancelBooking } = useShopperBookings();
  const [filter, setFilter] = useState<FilterId>('upcoming');
  const [confirmCancel, setConfirmCancel] = useState<{ id: string; title: string } | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'upcoming') return bookings.filter((b) => ['pending', 'approved'].includes(b.status));
    if (filter === 'cancelled') return bookings.filter((b) => ['declined', 'cancelled'].includes(b.status));
    return bookings.filter((b) => b.status === 'completed');
  }, [bookings, filter]);

  const handleCancel = async () => {
    if (!confirmCancel) return;
    await cancelBooking(confirmCancel.id, 'Cancelled from dashboard');
  };

  return (
    <div className="max-w-[1080px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Bookings & Rentals</h1>
        <p className="text-sm text-muted-foreground mt-1">Every rental you've booked, upcoming and past.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['upcoming', 'past', 'cancelled'] as FilterId[]).map((id) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={
              'text-xs font-medium px-3 py-1.5 rounded-full border transition ' +
              (filter === id
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/40')
            }
          >
            {id === 'upcoming' ? 'Upcoming' : id === 'past' ? 'Past' : 'Cancelled / Declined'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={filter === 'upcoming' ? 'No upcoming rentals' : filter === 'past' ? 'No past rentals yet' : 'Nothing cancelled'}
          description="Rentals you book will appear here with tracking, host contact, and calendar links."
          ctaLabel="Browse rentals"
          ctaHref="/search"
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((b) => {
            const s = STATUS_EXPLAIN[b.status] ?? { label: b.status, tone: 'muted' as const, body: 'Status unknown.' };
            const dateLabel = b.start_date ? new Date(b.start_date).toLocaleDateString() : '—';
            const location = b.listing?.pickup_location_text || b.listing?.address || '';

            return (
              <li key={b.id} className="rounded-md border border-border bg-card overflow-hidden">
                <PhotoListingCard
                  href={`/listing/${b.listing?.id ?? ''}`}
                  title={b.listing?.title ?? 'Rental'}
                  imageUrl={b.listing?.cover_image_url}
                  subtitle={b.listing?.category ?? undefined}
                  meta={`${dateLabel}${b.start_time ? ` · ${b.start_time}` : ''}`}
                  right={
                    <StatusChipPopover
                      label={s.label}
                      tone={s.tone}
                      title={s.label}
                      body={s.body}
                      nextStep={s.next}
                    />
                  }
                />
                <div className="flex flex-wrap items-center gap-2 px-4 pb-4 -mt-1">
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link to={`/messages?booking=${b.id}`}>
                      <MessageSquare className="h-3.5 w-3.5" /> Message host
                    </Link>
                  </Button>

                  {b.status === 'approved' && b.start_date && (
                    <AddToCalendarButton
                      title={b.listing?.title ?? 'Vendibook rental'}
                      startDate={b.start_date}
                      endDate={b.end_date ?? b.start_date}
                      startTime={b.start_time ?? undefined}
                      endTime={b.end_time ?? undefined}
                      location={location}
                    />
                  )}

                  {['pending', 'approved'].includes(b.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => setConfirmCancel({ id: b.id, title: b.listing?.title ?? 'this rental' })}
                    >
                      <X className="h-3.5 w-3.5" /> Cancel request
                    </Button>
                  )}

                  {b.status === 'completed' && (
                    <>
                      <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <Link to={`/listing/${b.listing?.id ?? ''}`}>
                          <RotateCcw className="h-3.5 w-3.5" /> Book again
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => toast('Reviews open once the host confirms completion.')}
                      >
                        <Star className="h-3.5 w-3.5" /> Leave a review
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmActionDialog
        open={!!confirmCancel}
        onOpenChange={(o) => !o && setConfirmCancel(null)}
        title="Cancel this booking?"
        description={
          <>
            You'll lose your reserved slot for <span className="text-foreground font-medium">{confirmCancel?.title}</span>.
            {' '}Any refund follows the listing's cancellation policy — we'll show the exact amount on the next screen.
          </>
        }
        confirmLabel="Yes, cancel booking"
        cancelLabel="Keep booking"
        onConfirm={handleCancel}
      />
    </div>
  );
};

export default BuyerBookingsTab;
