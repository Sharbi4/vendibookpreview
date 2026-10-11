import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Store } from 'lucide-react';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useAuth } from '@/contexts/AuthContext';

const usd = (value: number | null | undefined) =>
  value == null
    ? null
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const day = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

type TimelineEntry = {
  id: string;
  label: string;
  detail: string | null;
  date: string;
  amount: string | null;
  href: string | null;
  tone: 'ok' | 'warn' | 'alert' | 'muted';
};

/**
 * Published listings a seller owns, each with a timeline built only from real
 * records: when it was listed and published, and every payment or booking
 * recorded against it.
 */
export default function WorkspaceListingActivity() {
  const { user } = useAuth();
  const { listings, isLoading } = useHostListings();
  const { bookings } = useHostBookings();
  const { transactions } = useUserTransactions(user?.id);
  const [openId, setOpenId] = useState<string | null>(null);

  const published = useMemo(
    () => listings.filter((l) => l.status === 'published'),
    [listings],
  );

  const timelines = useMemo(() => {
    const map: Record<string, TimelineEntry[]> = {};
    for (const listing of published) {
      const entries: TimelineEntry[] = [];

      entries.push({
        id: `${listing.id}-created`,
        label: 'Listing created',
        detail: null,
        date: listing.created_at,
        amount: null,
        href: null,
        tone: 'muted',
      });

      if (listing.published_at) {
        entries.push({
          id: `${listing.id}-published`,
          label: 'Published to the marketplace',
          detail: null,
          date: listing.published_at,
          amount: null,
          href: `/listing/${listing.id}`,
          tone: 'ok',
        });
      }

      for (const t of transactions) {
        if (t.listing_id !== listing.id || t.seller_id !== user?.id) continue;
        const disputed = !!t.dispute_status && t.dispute_status !== 'none';
        entries.push({
          id: `${listing.id}-pay-${t.id}`,
          label: disputed ? `Dispute: ${t.dispute_status}` : `Sale payment · ${t.payment_status || 'recorded'}`,
          detail: t.reference,
          date: t.captured_at || t.created_at,
          amount: t.gross_amount_cents == null ? null : usd(t.gross_amount_cents / 100),
          href: `/orders/${t.id}`,
          tone: disputed ? 'alert' : t.payment_status === 'paid' || t.payment_status === 'completed' ? 'ok' : 'warn',
        });
      }

      for (const b of bookings) {
        if (b.listing_id !== listing.id) continue;
        entries.push({
          id: `${listing.id}-book-${b.id}`,
          label: `Booking · ${b.status}${b.payment_status && b.payment_status !== 'paid' ? ` · payment ${b.payment_status}` : ''}`,
          detail: b.shopper?.full_name || null,
          date: b.created_at,
          amount: usd(b.total_price == null ? null : Number(b.total_price)),
          href: `/dashboard/bookings/${b.id}`,
          tone: b.status === 'cancelled' || b.status === 'declined' ? 'muted' : b.status === 'pending' ? 'warn' : 'ok',
        });
      }

      map[listing.id] = entries.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    }
    return map;
  }, [published, transactions, bookings, user?.id]);

  if (isLoading || !published.length) return null;

  return (
    <section className="v2-panel">
      <div className="v2-panel-head">
        <div>
          <h2>Published listings</h2>
          <p>Open a listing to see everything recorded against it.</p>
        </div>
        <Link to="/dashboard/listings" className="v2-btn-quiet">
          Manage listings
        </Link>
      </div>

      {published.map((listing) => {
        const entries = timelines[listing.id] ?? [];
        const sales = entries.filter((e) => e.id.includes('-pay-')).length;
        const isOpen = openId === listing.id;
        return (
          <div className="v2-listing-activity" key={listing.id}>
            <button
              type="button"
              className="v2-activity-row w-full text-left"
              onClick={() => setOpenId(isOpen ? null : listing.id)}
              aria-expanded={isOpen}
            >
              <span className="v2-activity-thumb">
                {listing.cover_image_url ? (
                  <img src={listing.cover_image_url} alt="" loading="lazy" />
                ) : (
                  <Store />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="truncate">{listing.title}</strong>
                <small className="truncate">
                  {listing.published_at ? `Published ${day(listing.published_at)}` : 'Published'}
                  {typeof listing.view_count === 'number' ? ` · ${listing.view_count} views` : ''}
                </small>
                <span className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className={`v2-status${sales ? ' is-ok' : ''}`}>
                    {sales ? `${sales} payment${sales > 1 ? 's' : ''} recorded` : 'No payments yet'}
                  </span>
                </span>
              </span>
              {isOpen ? <ChevronDown className="h-4 w-4 opacity-60" /> : <ChevronRight className="h-4 w-4 opacity-60" />}
            </button>

            {isOpen && (
              <ol className="v2-listing-timeline">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <span className={`v2-timeline-dot is-${entry.tone}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">
                        {entry.href ? <Link to={entry.href}>{entry.label}</Link> : entry.label}
                      </p>
                      <small>
                        {day(entry.date)}
                        {entry.detail ? ` · ${entry.detail}` : ''}
                      </small>
                    </div>
                    {entry.amount && <strong>{entry.amount}</strong>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}
    </section>
  );
}
