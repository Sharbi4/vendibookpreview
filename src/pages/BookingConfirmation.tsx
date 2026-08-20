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
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';

interface BookingRow {
  id: string;
  status: string | null;
  payment_status: string | null;
  start_date: string;
  end_date: string;
  total_price: number | null;
  deposit_amount: number | null;
  is_instant_book: boolean | null;
  fulfillment_selected: string | null;
  listing_id: string;
  listings?: { title: string | null; cover_image_url: string | null; city: string | null; state: string | null } | null;
}

type View = 'loading' | 'processing' | 'confirmed' | 'awaiting_host' | 'declined' | 'failed' | 'not_found';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const BookingConfirmation = () => {
  const [params] = useSearchParams();
  const bookingId = params.get('booking_id');
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
          'id, status, payment_status, start_date, end_date, total_price, deposit_amount, is_instant_book, fulfillment_selected, listing_id, listings(title, cover_image_url, city, state)',
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
      return `${format(parseISO(booking.start_date), 'MMM d')} – ${format(parseISO(booking.end_date), 'MMM d, yyyy')}`;
    } catch {
      return null;
    }
  }, [booking]);

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
    <div className="min-h-screen flex flex-col bg-background sale-light">
      <SEO
        title="Booking confirmation | Vendibook"
        description="Your Vendibook rental booking status and next steps."
        noindex
      />
      <Header />
      <main className="flex-1 px-4 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-2xl space-y-6">
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    <span>{dates}</span>
                  </div>
                ) : null}
                {booking.fulfillment_selected ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground capitalize">
                    <MapPin className="h-4 w-4" />
                    <span>{booking.fulfillment_selected.replace('_', ' ')}</span>
                  </div>
                ) : null}
                {booking.total_price ? (
                  <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-muted-foreground">Charged today</span>
                    <span className="font-semibold text-foreground">{money(Number(booking.total_price))}</span>
                  </div>
                ) : null}
                {booking.deposit_amount ? (
                  <p className="text-xs text-muted-foreground">
                    A {money(Number(booking.deposit_amount))} security deposit is arranged directly with the
                    host and is not part of the amount charged by Vendibook.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button asChild variant="cta" className="flex-1">
                <Link to="/dashboard?tab=bookings">View my bookings</Link>
              </Button>
              {booking?.listing_id ? (
                <Button asChild variant="outline" className="flex-1 rounded-2xl h-14">
                  <Link to={`/messages?listing=${booking.listing_id}`}>
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
      <Footer />
    </div>
  );
};

export default BookingConfirmation;
