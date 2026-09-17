/**
 * BookingConfirmation — the single landing surface after a rental payment.
 *
 * PayPal returns here with `?booking_id=`. The page polls the booking row
 * until the server-side capture flips `payment_status` to `paid`, then shows
 * the correct state:
 *   - processing            → capture not yet recorded (webhook lag)
 *   - confirmed             → instant book, host approval not required
 *   - awaiting host approval→ paid, host still has to accept
 *   - declined / cancelled  → host said no; refund is on its way
 *   - failed                → payment never completed, nothing was charged
 *
 * No escrow claims, no payout-timing promises to the renter.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  AlertCircle,
  FileText,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';
import { AddToCalendarButton } from '@/components/booking/AddToCalendarButton';
import { DocumentUploadSection } from '@/components/documents/DocumentUploadSection';
import { useListingRequiredDocuments } from '@/hooks/useRequiredDocuments';

interface BookingRow {
  id: string;
  status: string | null;
  payment_status: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  is_hourly_booking: boolean | null;
  duration_hours: number | null;
  slot_name: string | null;
  total_price: number | null;
  tax_amount: number | null;
  delivery_fee_snapshot: number | null;
  deposit_amount: number | null;
  deposit_status: string | null;
  is_instant_book: boolean | null;
  fulfillment_selected: string | null;
  delivery_address: string | null;
  address_snapshot: string | null;
  listing_id: string;
  listings?: { title: string | null; cover_image_url: string | null; city: string | null; state: string | null } | null;
}

type View = 'loading' | 'processing' | 'confirmed' | 'awaiting_host' | 'declined' | 'failed' | 'not_found';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

/** Documents the host requires for this booking — hidden entirely when none are required. */
const BookingDocumentsPanel = ({
  listingId,
  bookingId,
}: {
  listingId: string;
  bookingId: string;
}) => {
  const { data: requiredDocs } = useListingRequiredDocuments(listingId);
  if (!requiredDocs || requiredDocs.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileText className="h-4 w-4" />
        Documents the host needs
      </h2>
      <div className="mt-3">
        <DocumentUploadSection listingId={listingId} bookingId={bookingId} />
      </div>
    </div>
  );
};

interface BookingConfirmationProps {
  /** Rendered inside the dashboard workspace: no site header/footer chrome. */
  embedded?: boolean;
  /** Dashboard route supplies the booking id from the path instead of ?booking_id. */
  bookingId?: string;
}

const BookingConfirmation = ({
  embedded = false,
  bookingId: bookingIdProp,
}: BookingConfirmationProps = {}) => {
  const [params] = useSearchParams();
  const bookingId = bookingIdProp ?? params.get('booking_id');
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [view, setView] = useState<View>('loading');
  const attempts = useRef(0);

  useEffect(() => {
    if (!bookingId) {
      setView('not_found');
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      const { data, error } = await supabase
        .from('booking_requests')
        .select(
          'id, status, payment_status, start_date, end_date, start_time, end_time, is_hourly_booking, duration_hours, slot_name, total_price, tax_amount, delivery_fee_snapshot, deposit_amount, deposit_status, is_instant_book, fulfillment_selected, delivery_address, address_snapshot, listing_id, listings(title, cover_image_url, city, state)',
        )
        .eq('id', bookingId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setView('not_found');
        return;
      }

      const row = data as unknown as BookingRow;
      setBooking(row);

      const paid = row.payment_status === 'paid';
      const status = row.status ?? 'pending';

      if (status === 'declined' || status === 'cancelled') {
        setView('declined');
        return;
      }
      if (paid && status === 'approved') {
        setView('confirmed');
        return;
      }
      if (paid) {
        setView('awaiting_host');
        return;
      }

      attempts.current += 1;
      // ~30s of polling before we tell the renter the payment didn't land.
      if (attempts.current >= 15) {
        setView('failed');
        return;
      }
      setView('processing');
      timer = setTimeout(poll, 2000);
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bookingId]);

  const dates = useMemo(() => {
    if (!booking) return null;
    try {
      if (booking.start_date === booking.end_date) {
        return format(parseISO(booking.start_date), 'EEE, MMM d, yyyy');
      }
      return `${format(parseISO(booking.start_date), 'MMM d')} – ${format(parseISO(booking.end_date), 'MMM d, yyyy')}`;
    } catch {
      return null;
    }
  }, [booking]);

  const times = useMemo(() => {
    if (!booking?.is_hourly_booking) return null;
    const start = booking.start_time?.slice(0, 5);
    const end = booking.end_time?.slice(0, 5);
    if (!start || !end) return null;
    const hours = booking.duration_hours ? ` (${booking.duration_hours} hrs)` : '';
    return `${start} – ${end}${hours}`;
  }, [booking]);

  const locationLine = useMemo(() => {
    if (!booking) return null;
    if (booking.fulfillment_selected === 'delivery') {
      return booking.delivery_address ?? null;
    }
    if (booking.address_snapshot) return booking.address_snapshot;
    const city = booking.listings?.city;
    const state = booking.listings?.state;
    return city && state ? `${city}, ${state}` : (city ?? null);
  }, [booking]);

  const deliveryFee = Number(booking?.delivery_fee_snapshot ?? 0);
  const taxAmount = Number(booking?.tax_amount ?? 0);

  const depositNote = useMemo(() => {
    const status = booking?.deposit_status;
    if (status === 'paid' || status === 'held' || status === 'authorized') {
      return 'This deposit is held against damage and returned after the rental unless the host reports an issue.';
    }
    if (status === 'refunded') {
      return 'This deposit has been returned to your original payment method.';
    }
    return 'This deposit is arranged directly with the host and is not part of the amount charged by Vendibook.';
  }, [booking]);

  const nextSteps = useMemo(() => {
    if (!booking) return [] as string[];
    const pickup = booking.fulfillment_selected === 'delivery' ? 'delivery' : 'pickup';
    if (view === 'confirmed') {
      return [
        'Send the host any documents they require above — they can be uploaded any time before your start date.',
        `Message the host to agree on ${pickup} timing and the exact meeting point.`,
        'Add the dates to your calendar so you do not miss the start of the rental.',
        'Your booking and receipt stay available in your dashboard under Activity.',
      ];
    }
    if (view === 'awaiting_host') {
      return [
        'The host reviews your request — most hosts reply within a day.',
        'Upload any required documents now so approval is not held up.',
        'You will be emailed as soon as the host accepts or declines.',
        'If the host declines or does not respond, your payment is refunded to your original payment method.',
      ];
    }
    if (view === 'processing') {
      return [
        'We are recording your payment with PayPal — stay on this page for a few seconds.',
        'Once recorded, your dates are held and the host is notified.',
      ];
    }
    if (view === 'declined') {
      return [
        'Your refund has been started to your original payment method.',
        'Refunds usually post within a few business days, depending on your bank.',
        'You can browse other rentals for the same dates from search.',
      ];
    }
    return [] as string[];
  }, [booking, view]);

  const headline: Record<View, string> = {
    loading: 'Loading your booking…',
    processing: 'Confirming your payment…',
    confirmed: 'Your rental is confirmed',
    awaiting_host: 'Payment received — waiting on the host',
    declined: 'This booking was not accepted',
    failed: 'We could not confirm your payment',
    not_found: 'Booking not found',
  };

  const body: Record<View, string> = {
    loading: '',
    processing:
      'PayPal has your payment. We are recording it now — this usually takes a few seconds. You can safely stay on this page.',
    confirmed:
      'Your dates are locked in. The host has your booking details and you can message them any time from your dashboard.',
    awaiting_host:
      'Your dates are held and your payment is recorded. The host still needs to accept. If they decline or do not respond, Vendibook refunds your payment to your original payment method.',
    declined:
      'The host was not able to take this booking. Your payment is being refunded to your original payment method — refunds typically post within a few business days depending on your bank.',
    failed:
      'We did not receive a completed payment for this booking, so nothing has been charged. You can try again from the listing, or contact support@vendibook.com if you think this is a mistake.',
    not_found:
      'We could not find that booking. Check the link in your confirmation email, or open your dashboard to see all of your bookings.',
  };

  const Icon =
    view === 'confirmed'
      ? CheckCircle2
      : view === 'awaiting_host'
        ? Clock
        : view === 'declined' || view === 'failed' || view === 'not_found'
          ? AlertCircle
          : Loader2;

  return (
    <div
      className={
        embedded
          ? 'sale-light flex flex-col'
          : 'min-h-screen flex flex-col bg-background sale-light'
      }
    >
      {embedded ? null : (
        <SEO
          title="Booking confirmation | Vendibook"
          description="Your Vendibook rental booking status and next steps."
          noindex
        />
      )}
      {embedded ? null : <Header />}
      <main className={embedded ? 'flex-1' : 'flex-1 px-4 py-10 sm:py-16'}>
        <div
          className={embedded ? 'w-full space-y-6' : 'mx-auto w-full max-w-2xl space-y-6'}
        >
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon
                  className={`h-6 w-6 text-primary ${view === 'processing' || view === 'loading' ? 'animate-spin' : ''}`}
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {headline[view]}
                </h1>
                {body[view] ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body[view]}</p>
                ) : null}
              </div>
            </div>

            {booking ? (
              <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
                <p className="font-medium text-foreground line-clamp-2">
                  {booking.listings?.title ?? 'Rental booking'}
                </p>
                {dates ? (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 mt-0.5" />
                    <div>
                      <div className="text-foreground">{dates}</div>
                      {times ? <div className="text-xs">{times}</div> : null}
                      {booking.slot_name ? <div className="text-xs">Space: {booking.slot_name}</div> : null}
                    </div>
                  </div>
                ) : null}
                {booking.fulfillment_selected ? (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    {booking.fulfillment_selected === 'delivery' ? (
                      <Truck className="h-4 w-4 mt-0.5" />
                    ) : (
                      <MapPin className="h-4 w-4 mt-0.5" />
                    )}
                    <div>
                      <div className="capitalize text-foreground">
                        {booking.fulfillment_selected.replace('_', ' ')}
                      </div>
                      {locationLine ? <div className="text-xs">{locationLine}</div> : null}
                    </div>
                  </div>
                ) : null}

                <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                  {deliveryFee > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="text-foreground">{money(deliveryFee)}</span>
                    </div>
                  ) : null}
                  {taxAmount > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="text-foreground">{money(taxAmount)}</span>
                    </div>
                  ) : null}
                  {booking.total_price ? (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {booking.payment_status === 'paid' ? 'Charged today' : 'Booking total'}
                      </span>
                      <span className="font-semibold text-foreground">
                        {money(Number(booking.total_price))}
                      </span>
                    </div>
                  ) : null}
                </div>

                {booking.deposit_amount ? (
                  <div className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-foreground">
                        <ShieldCheck className="h-4 w-4" />
                        Security deposit
                      </span>
                      <span className="font-semibold text-foreground">
                        {money(Number(booking.deposit_amount))}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {depositNote}
                    </p>
                  </div>
                ) : null}

                {dates && view === 'confirmed' ? (
                  <AddToCalendarButton
                    title={booking.listings?.title ?? 'Vendibook rental'}
                    startDate={booking.start_date}
                    endDate={booking.end_date}
                    startTime={booking.start_time ?? undefined}
                    endTime={booking.end_time ?? undefined}
                    location={locationLine ?? undefined}
                    description="Your Vendibook rental booking."
                  />
                ) : null}
              </div>
            ) : null}

            {booking && view !== 'failed' && view !== 'not_found' ? (
              <BookingDocumentsPanel listingId={booking.listing_id} bookingId={booking.id} />
            ) : null}

            {nextSteps.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-border p-4">
                <h2 className="text-sm font-semibold text-foreground">What happens next</h2>
                <ol className="mt-3 space-y-3">
                  {nextSteps.map((step, i) => (
                    <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button asChild variant="cta" className="flex-1">
                <Link to="/dashboard/activity?filter=rentals">View my bookings</Link>
              </Button>
              {booking?.listing_id ? (
                <Button asChild variant="outline" className="flex-1 rounded-2xl h-14">
                  <Link to={`/dashboard/messages?listing=${booking.listing_id}`}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message the host
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="flex-1 rounded-2xl h-14">
                  <Link to="/search">Browse rentals</Link>
                </Button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Questions about this booking? Email{' '}
            <a className="underline underline-offset-2" href="mailto:support@vendibook.com">
              support@vendibook.com
            </a>
            .
          </p>
        </div>
      </main>
      {embedded ? null : <Footer />}
    </div>
  );
};

export default BookingConfirmation;
