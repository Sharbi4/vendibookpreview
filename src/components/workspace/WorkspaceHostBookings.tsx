import { parseRentalDate } from '@/lib/rentalDates';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { useHostBookings } from '@/hooks/useHostBookings';
import BookingRequestCard from '@/components/dashboard/BookingRequestCard';
import { getCounterpartyName } from '@/lib/displayName';
import { StatusPill, ws } from '@/components/workspace/ui';
import { FilterTabs } from '@/components/workspace/selling/FilterTabs';
import { LoadError, Thumb } from '@/components/workspace/selling/sellingUi';
import { dollars } from '@/components/workspace/selling/format';
import { cn } from '@/lib/utils';

type HostBookings = ReturnType<typeof useHostBookings>;
type Booking = HostBookings['bookings'][number];
type Tab = 'pending' | 'confirmed' | 'past' | 'cancelled';

const dateRange = (b: Booking) => {
  const start = parseRentalDate(b.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (b.is_hourly_booking && b.start_time && b.end_time) return `${start} · ${b.start_time} – ${b.end_time}`;
  const end = parseRentalDate(b.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${start} – ${end}`;
};

/**
 * Host booking manager, rendered inside Activity. Same data and the same
 * approve / decline / cancel / deposit actions as the old standalone bookings
 * page (BookingRequestCard). The page passes its own useHostBookings() result
 * so an approval here updates the timeline below without a second fetch.
 *
 * mode="pending" shows only requests waiting on the host (the All view);
 * mode="full" adds search and Confirmed / Completed / Cancelled tabs.
 */
export default function WorkspaceHostBookings({ host, mode = 'full' }: { host: HostBookings; mode?: 'pending' | 'full' }) {
  const { bookings, isLoading, isError, refetch, approveBooking, declineBooking, cancelBooking, processDepositRefund } = host;
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<Tab | null>(null);

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
  const allPending = bookings.filter((b) => b.status === 'pending').length;

  if (!isLoading && !isError && bookings.length === 0) return null;
  if (mode === 'pending' && (isLoading || isError || allPending === 0)) return null;

  // Default to the tab that needs the host; never stuck on an empty tab after loading.
  const tab: Tab = chosen ?? (allPending ? 'pending' : confirmed.length ? 'confirmed' : 'past');

  const cards = (list: Booking[]) => (
    // BookingRequestCard uses theme tokens; `commerce-readable` gives it the
    // light palette (the global tokens are dark) so every button is readable,
    // and its action row wraps on phones instead of running off the card.
    <div className="sale-light commerce-readable space-y-4 [&_.pt-3.border-t]:flex-wrap">
      {list.map((b) => (
        <BookingRequestCard
          key={b.id}
          booking={b}
          onApprove={approveBooking}
          onDecline={declineBooking}
          onCancel={cancelBooking}
          onDepositAction={processDepositRefund}
        />
      ))}
    </div>
  );

  const rows = (list: Booking[], label: string) => (
    <ul className="divide-y divide-[#F1ECE5] overflow-hidden rounded-xl border border-[#ECE6DD]">
      {list.map((b) => (
        <li key={b.id}>
          <Link to={`/dashboard/bookings/${b.id}`} className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-[#FCFAF7]">
            <Thumb src={b.listing?.cover_image_url} className="h-11 w-11" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold text-[#1C1B1A]">{getCounterpartyName(b.shopper, 'Guest')}</span>
              <span className="block truncate text-[12.5px] text-[#8A847B]">{b.listing?.title} · {dateRange(b)}</span>
            </span>
            <span className="hidden shrink-0 text-right sm:block">
              <span className="block text-[13.5px] font-semibold tabular-nums">{dollars(b.total_price) ?? '—'}</span>
              <span className="block text-[12px] text-[#8A847B]">{label}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  const empty = (what: string) => (
    <p className="rounded-xl bg-[#FAF8F5] px-4 py-6 text-center text-[13px] text-[#8A847B]">
      {query ? `No ${what} bookings match “${query}”.` : `No ${what} bookings.`}
    </p>
  );

  return (
    <section className={cn(ws.surface, 'overflow-hidden')} aria-labelledby="host-bookings-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#ECE6DD] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id="host-bookings-title" className={ws.sectionTitle}>
            {mode === 'pending' ? 'Booking requests waiting on you' : 'Booking requests'}
          </h2>
          <p className={cn(ws.sectionNote, 'mt-0.5')}>Approve, decline or message the renter about rentals of your listings.</p>
        </div>
        {mode === 'pending' ? (
          <Link to="/dashboard/activity?filter=requests" className={cn(ws.actionLink, 'pt-0.5')}>
            All bookings <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        ) : allPending > 0 ? (
          <StatusPill tone="accent">{allPending} waiting on you</StatusPill>
        ) : null}
      </div>

      <div className="px-5 py-5 sm:px-6">
        {isError ? (
          <LoadError what="booking requests" onRetry={() => void refetch()} className="px-0 py-0 sm:px-0" />
        ) : mode === 'pending' ? (
          cards(pending)
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <FilterTabs<Tab>
                label="Booking status"
                value={tab}
                onChange={setChosen}
                className="lg:flex-1"
                tabs={[
                  { key: 'pending', label: 'Pending', count: pending.length, attention: pending.length > 0 },
                  { key: 'confirmed', label: 'Confirmed', count: confirmed.length },
                  { key: 'past', label: 'Completed', count: past.length },
                  { key: 'cancelled', label: 'Cancelled', count: cancelled.length },
                ]}
              />
              <label className="relative block w-full lg:max-w-[260px]">
                <span className="sr-only">Search renter or listing</span>
                <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A847B]" />
                <input
                  type="search"
                  placeholder="Search renter or listing"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-10 w-full rounded-full border border-[#E2DBD0] bg-white pl-10 pr-4 text-[13.5px] text-[#1C1B1A] placeholder:text-[#A8A198] focus:border-[#1C1B1A] focus:outline-none"
                />
              </label>
            </div>

            {isLoading ? (
              <div className="space-y-3" aria-busy="true">
                <span className={cn(ws.skeleton, 'block h-24 w-full rounded-xl')} />
                <span className={cn(ws.skeleton, 'block h-24 w-full rounded-xl')} />
                <span className="sr-only" role="status">Loading bookings</span>
              </div>
            ) : tab === 'pending' ? (
              pending.length ? cards(pending) : empty('pending')
            ) : tab === 'confirmed' ? (
              confirmed.length ? cards(confirmed) : empty('confirmed')
            ) : tab === 'past' ? (
              past.length ? rows(past, 'Completed') : empty('completed')
            ) : cancelled.length ? (
              rows(cancelled, 'Cancelled')
            ) : (
              empty('cancelled')
            )}
          </div>
        )}
      </div>
    </section>
  );
}
