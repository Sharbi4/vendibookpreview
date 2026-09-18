import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, CalendarClock, Heart, Landmark, LayoutDashboard, MessageCircle,
  ReceiptText, Search, Settings2, ShoppingBag, Video,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEquinoxFinancingEnabled } from '@/hooks/useListingFinancing';
import { useBookingAgreement } from '@/hooks/useBookingAgreement';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';
import { formatWalkthroughTime } from '@/lib/videoWalkthroughs';

type Row = Record<string, any>;

/** `vendibook/vw-<uuid>` or `vw-<uuid>` — the Daily "recent-call" fallback. */
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const parseRecentCall = (value: string | null): string | null => {
  if (!value) return null;
  const room = value.split('/').pop() ?? '';
  if (!room.startsWith('vw-')) return null;
  const match = room.slice(3).match(UUID);
  return match ? match[0] : null;
};

const money = (cents: number | null | undefined) =>
  typeof cents === 'number' ? `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : null;

const priceLabel = (listing: Row | null | undefined) => {
  if (!listing) return null;
  if (listing.mode === 'sale') return money(listing.price_sale);
  const daily = money(listing.price_daily);
  if (daily) return `${daily} / day`;
  const weekly = money(listing.price_weekly);
  return weekly ? `${weekly} / week` : null;
};

export default function WalkthroughNextSteps() {
  const { walkthroughId: routeId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [walkthrough, setWalkthrough] = useState<Row | null>(null);
  const [payment, setPayment] = useState<Row | null>(null);
  const [sale, setSale] = useState<Row | null>(null);
  const [booking, setBooking] = useState<Row | null>(null);
  const [counterparty, setCounterparty] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'not_found'>('loading');

  const fallbackId = useMemo(() => parseRecentCall(search.get('recent-call')), [search]);
  const walkthroughId = routeId ?? fallbackId ?? null;

  useEffect(() => {
    if (!user || !walkthroughId) return;
    let cancelled = false;
    (async () => {
      // RLS scopes video_walkthroughs to the buyer and seller, so an
      // unauthorised id simply resolves to nothing.
      const { data: w } = await (supabase.from('video_walkthroughs') as any)
        .select('*, listing:listings(id,title,cover_image_url,mode,city,state,price_sale,price_daily,price_weekly,status,host_id)')
        .eq('id', walkthroughId)
        .maybeSingle();
      if (cancelled) return;
      if (!w || (w.buyer_id !== user.id && w.seller_id !== user.id)) { setState('not_found'); return; }
      setWalkthrough(w);
      setState('ready');

      const listingId = w.listing_id;
      const [{ data: pay }, { data: saleRow }, { data: bookingRow }, { data: profile }] = await Promise.all([
        (supabase.from('payment_records') as any)
          .select('id,payment_status,internal_status').eq('listing_id', listingId)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        w.listing?.mode === 'sale'
          ? (supabase.from('sale_transactions') as any)
              .select('id,status,payment_status').eq('listing_id', listingId)
              .order('created_at', { ascending: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),
        w.listing?.mode !== 'sale'
          ? (supabase.from('booking_requests') as any)
              .select('id,status,payment_status').eq('listing_id', listingId)
              .order('created_at', { ascending: false }).limit(1).maybeSingle()
          : Promise.resolve({ data: null }),
        (supabase.from('profiles') as any)
          .select('full_name,business_name')
          .eq('id', w.seller_id === user.id ? w.buyer_id : w.seller_id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setPayment(pay ?? null);
      setSale(saleRow ?? null);
      setBooking(bookingRow ?? null);
      setCounterparty(profile?.business_name || profile?.full_name || null);
    })();
    return () => { cancelled = true; };
  }, [user, walkthroughId]);

  const isSeller = !!user && walkthrough?.seller_id === user.id;
  const listing = walkthrough?.listing as Row | undefined;
  const financingAvailable = useEquinoxFinancingEnabled(listing ?? null);
  const { state: agreement } = useBookingAgreement(
    listing?.mode === 'sale' ? { transactionId: sale?.id ?? null } : { bookingId: booking?.id ?? null },
    listing?.mode === 'sale' ? 'bill_of_sale' : 'rental_agreement',
  );

  useEffect(() => {
    if (state !== 'ready' || !walkthrough) return;
    trackEventToDb('walkthrough_post_call_viewed', 'video_walkthrough',
      { walkthrough_id: walkthrough.id, role: isSeller ? 'seller' : 'buyer', mode: listing?.mode ?? null },
      listing?.id);
  }, [state, walkthrough?.id, isSeller]);

  const track = (name: string) => trackEventToDb(name, 'video_walkthrough',
    { walkthrough_id: walkthrough?.id, role: isSeller ? 'seller' : 'buyer' }, listing?.id);

  if (!authLoading && !user) {
    // Build a stable target from known params only — never reuse the full
    // query string, which would nest an ever-growing redirect value.
    const recent = search.get('recent-call');
    const target = routeId
      ? `/walkthrough/${routeId}/next-steps`
      : `/walkthrough/next-steps${recent ? `?recent-call=${encodeURIComponent(recent)}` : ''}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(target)}`} replace />;
  }
  if (!walkthroughId) {
    return (
      <main className="walkthrough-page"><div className="walkthrough-container walkthrough-next-empty">
        <h1>We couldn&apos;t find that walkthrough</h1>
        <p>Open your dashboard to see your scheduled and completed walkthroughs.</p>
        <Link className="wn-action is-primary" to="/dashboard">Go to dashboard</Link>
      </div></main>
    );
  }
  if (state === 'not_found') {
    return (
      <main className="walkthrough-page"><div className="walkthrough-container walkthrough-next-empty">
        <h1>This walkthrough isn&apos;t available to you</h1>
        <p>Only the buyer and seller on a walkthrough can open it.</p>
        <Link className="wn-action is-primary" to="/dashboard">Go to dashboard</Link>
      </div></main>
    );
  }
  if (state === 'loading' || !walkthrough) {
    return <main className="walkthrough-page"><div className="walkthrough-container walkthrough-loading">Loading your next steps…</div></main>;
  }

  // The generic Daily fallback lands here; move to the canonical URL.
  if (!routeId) {
    navigate(`/walkthrough/${walkthrough.id}/next-steps`, { replace: true });
  }

  const orderHref = payment?.id ? `/orders/${payment.id}` : null;
  const saleActive = !!sale && !['cancelled', 'refunded', 'completed'].includes(String(sale.status));
  const bookingActive = !!booking && !['cancelled', 'declined', 'completed'].includes(String(booking.status));
  const agreementActionNeeded = !!agreement?.actionRequired && !!orderHref;

  const hero = (
    <section className="wn-hero">
      {listing?.cover_image_url && <img src={listing.cover_image_url} alt="" />}
      <div>
        <span className="wn-eyebrow"><Video /> Video walkthrough completed</span>
        <h1>{isSeller ? 'Walkthrough complete' : 'Thanks for meeting with the seller'}</h1>
        <p className="wn-listing">{listing?.title}</p>
        <p className="wn-meta">
          {[listing?.city, listing?.state].filter(Boolean).join(', ')}
          {priceLabel(listing) ? ` · ${priceLabel(listing)}` : ''}
          {counterparty ? ` · ${isSeller ? 'With' : 'Seller:'} ${counterparty}` : ''}
        </p>
        <p className="wn-when">{formatWalkthroughTime(walkthrough.starts_at)}</p>
      </div>
    </section>
  );

  const secondary = (
    <div className="wn-secondary">
      {walkthrough.conversation_id && (
        <Link className="wn-action" to={`/dashboard/messages/${walkthrough.conversation_id}`} onClick={() => track('walkthrough_post_call_message_clicked')}>
          <MessageCircle /> {isSeller ? 'Message buyer' : 'Message seller'}
        </Link>
      )}
      {listing?.id && <Link className="wn-action" to={`/listing/${listing.id}`}><Search /> View listing</Link>}
      <Link className="wn-action" to={`/walkthrough/${walkthrough.id}`}><CalendarClock /> View this walkthrough</Link>
      {isSeller ? (
        <>
          <Link className="wn-action" to="/dashboard/account"><Settings2 /> Manage walkthrough availability</Link>
          <Link className="wn-action" to="/dashboard/activity"><LayoutDashboard /> Back to activity</Link>
        </>
      ) : (
        <>
          {listing?.id && (
            <Link className="wn-action" to={`/walkthrough/schedule/${listing.id}`} onClick={() => track('walkthrough_post_call_reschedule_clicked')}>
              <Video /> Schedule another walkthrough
            </Link>
          )}
          <Link className="wn-action" to="/dashboard/saved"><Heart /> Saved listings</Link>
          <Link className="wn-action" to={`/browse?mode=${listing?.mode === 'sale' ? 'sale' : 'rent'}`}><Search /> Browse similar listings</Link>
        </>
      )}
    </div>
  );

  return (
    <main className="walkthrough-page">
      <header className="walkthrough-topbar">
        <Link to="/dashboard"><span>←</span> Dashboard</Link>
        <Link to="/" className="walkthrough-brand">VENDIBOOK</Link>
      </header>
      <div className="walkthrough-container wn-container">
        {hero}

        <section className="wn-panel">
          <h2>{isSeller ? 'What you can do now' : 'What would you like to do next?'}</h2>

          {!isSeller && listing?.mode === 'sale' && (
            <div className="wn-primary-stack">
              {saleActive && orderHref ? (
                <Link className="wn-action is-primary" to={orderHref} onClick={() => track('walkthrough_post_call_purchase_clicked')}>
                  <ReceiptText /> Continue your purchase <ArrowRight />
                </Link>
              ) : listing?.id ? (
                <Link className="wn-action is-primary" to={`/checkout/${listing.id}`} onClick={() => track('walkthrough_post_call_purchase_clicked')}>
                  <ShoppingBag /> Continue to checkout <ArrowRight />
                </Link>
              ) : null}
              {financingAvailable && listing?.id && (
                <Link className="wn-action is-highlight" to={`/financing?listing_id=${listing.id}`} onClick={() => track('walkthrough_post_call_financing_clicked')}>
                  <Landmark /> Explore financing options
                </Link>
              )}
            </div>
          )}

          {!isSeller && listing?.mode !== 'sale' && (
            <div className="wn-primary-stack">
              {bookingActive && orderHref ? (
                <Link className="wn-action is-primary" to={orderHref} onClick={() => track('walkthrough_post_call_booking_clicked')}>
                  <ReceiptText /> View your booking <ArrowRight />
                </Link>
              ) : bookingActive ? (
                <Link className="wn-action is-primary" to="/dashboard/activity" onClick={() => track('walkthrough_post_call_booking_clicked')}>
                  <ReceiptText /> View your booking request <ArrowRight />
                </Link>
              ) : listing?.id ? (
                <Link className="wn-action is-primary" to={`/book/${listing.id}`} onClick={() => track('walkthrough_post_call_booking_clicked')}>
                  <CalendarClock /> Check availability and request dates <ArrowRight />
                </Link>
              ) : null}
            </div>
          )}

          {agreementActionNeeded && (
            <Link className="wn-action is-highlight" to={orderHref!}>
              <ReceiptText /> Review and sign your agreement
            </Link>
          )}

          {isSeller && (
            <p className="wn-note">
              If the buyer starts a purchase, booking or financing application, it will appear in your
              dashboard activity.
            </p>
          )}

          {secondary}
        </section>
      </div>
    </main>
  );
}
