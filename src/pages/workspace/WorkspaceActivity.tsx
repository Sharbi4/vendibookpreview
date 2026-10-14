import { walkthroughDisplayStatus } from '@/lib/videoWalkthroughs';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronRight, Receipt, Video } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTransactions } from '@/hooks/useUserTransactions';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useHostListings } from '@/hooks/useHostListings';
import WorkspaceHostBookings from '@/components/workspace/WorkspaceHostBookings';
import WorkspaceListingActivity from '@/components/workspace/WorkspaceListingActivity';
import { useVideoWalkthroughs } from '@/hooks/useVideoWalkthroughs';
import { EmptyState, PageHeader, StatusPill, formatCents, formatDay, ws, type StatusTone } from '@/components/workspace/ui';
import { FilterTabs, type FilterTab } from '@/components/workspace/selling/FilterTabs';
import { LoadError } from '@/components/workspace/selling/sellingUi';
import { dollars, humanize } from '@/components/workspace/selling/format';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'purchases' | 'sales' | 'rentals' | 'requests' | 'disputes' | 'listings' | 'walkthroughs';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'requests', label: 'Requests' },
  { key: 'rentals', label: 'Rentals' },
  { key: 'sales', label: 'Sales' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'walkthroughs', label: 'Walkthroughs' },
  { key: 'listings', label: 'Listings' },
  { key: 'disputes', label: 'Disputes' },
];

type Item = {
  id: string;
  kind: Exclude<Filter, 'all'>;
  title: string;
  counterparty: string | null;
  state: string;
  tone: StatusTone;
  nextAction: string | null;
  /** Waiting on someone else (host reply, payment confirmation). */
  waiting: boolean;
  date: string;
  amount: string | null;
  reference: string | null;
  image: string | null;
  href: string;
};

const toneFor = (state: string): StatusTone => {
  const s = state.toLowerCase();
  if (/dispute|failed|declined|refused/.test(s)) return 'alert';
  if (/cancel|expired|refunded/.test(s)) return 'muted';
  if (/pending|processing|unpaid|follow-up|requested/.test(s)) return 'warn';
  if (/completed|paid|approved|captured|scheduled|rescheduled/.test(s)) return 'ok';
  return 'neutral';
};

const EMPTY_COPY: Record<Filter, { title: string; body: string; action?: { label: string; to: string } }> = {
  all: { title: 'No activity yet.', body: 'Purchases, sales, rentals, booking requests and video walkthroughs show up here as they happen.', action: { label: 'Browse the marketplace', to: '/search' } },
  requests: { title: 'No booking requests.', body: 'Rental requests you send, and requests renters send for your listings, show up here.', action: { label: 'Browse rentals', to: '/search' } },
  rentals: { title: 'No rentals yet.', body: 'Confirmed rentals, as a renter or a host, are recorded here with dates and amounts.', action: { label: 'Browse rentals', to: '/search' } },
  sales: { title: 'No sales yet.', body: 'Payments you receive for listings you sell are recorded here.', action: { label: 'View your listings', to: '/dashboard/listings' } },
  purchases: { title: 'No purchases yet.', body: 'Payments you make on Vendibook are recorded here with a reference for your books.', action: { label: 'Browse the marketplace', to: '/search' } },
  walkthroughs: { title: 'No video walkthroughs.', body: 'Scheduled live video walkthroughs of a listing appear here with the meeting link.', action: { label: 'Browse the marketplace', to: '/search' } },
  listings: { title: 'No live listings.', body: 'Once a listing is live, its history (published, payments, bookings) shows up here.', action: { label: 'View your listings', to: '/dashboard/listings' } },
  disputes: { title: 'No disputes.', body: 'If a payment is ever disputed, it appears here with the next step.' },
};

function Thumbnail({ item }: { item: Item }) {
  const Icon = item.kind === 'walkthroughs' ? Video : item.kind === 'rentals' || item.kind === 'requests' ? CalendarDays : Receipt;
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#F3EEE7] sm:h-14 sm:w-[72px]">
      {item.image ? <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Icon aria-hidden="true" className="h-4 w-4 text-[#8A847B]" />}
    </span>
  );
}

function Row({ item }: { item: Item }) {
  return (
    <li>
      <Link to={item.href} className="group flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-[#FCFAF7] sm:gap-4 sm:px-6">
        <Thumbnail item={item} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-[#1C1B1A]">{item.title}</span>
          <span className="mt-0.5 block truncate text-[12.5px] text-[#8A847B]">
            {[item.counterparty, formatDay(item.date), item.reference].filter(Boolean).join(' · ')}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <StatusPill tone={item.tone}>{item.state}</StatusPill>
            {item.nextAction && (
              <span className={cn('text-[12.5px] font-semibold', item.waiting ? 'text-[#5E5953]' : 'text-[#B93A12]')}>{item.nextAction}</span>
            )}
          </span>
        </span>
        {item.amount && <span className="shrink-0 text-right text-[14px] font-semibold tabular-nums text-[#1C1B1A]">{item.amount}</span>}
        <ChevronRight aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-[#B5AEA4] transition-colors group-hover:text-[#1C1B1A] sm:block" />
      </Link>
    </li>
  );
}

export default function WorkspaceActivity() {
  const { user } = useAuth();
  const tx = useUserTransactions(user?.id);
  const shopper = useShopperBookings();
  const host = useHostBookings();
  const hostListings = useHostListings();
  const { walkthroughs, isLoading: walkthroughsLoading } = useVideoWalkthroughs();
  const transactions = tx.transactions;
  const buyerBookings = shopper.bookings;
  const sellerBookings = host.bookings;
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('filter') as Filter;
  const filter: Filter = FILTERS.some((f) => f.key === requested) ? requested : 'all';
  const setFilter = (value: Filter) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value === 'all') next.delete('filter');
      else next.set('filter', value);
      return next;
    });

  const items = useMemo<Item[]>(() => {
    const payments: Item[] = transactions.map((t) => {
      const disputed = !!t.dispute_status && t.dispute_status !== 'none';
      const state = disputed ? `Dispute ${humanize(t.dispute_status).toLowerCase()}` : humanize(t.payment_status || 'recorded');
      return {
        id: `payment-${t.id}`,
        kind: disputed ? 'disputes' : t.role === 'buyer' ? 'purchases' : 'sales',
        title: t.listing?.title || 'Vendibook payment',
        counterparty: t.role === 'buyer' ? 'You paid' : 'Payment received',
        state,
        tone: disputed ? 'alert' : toneFor(state),
        nextAction: disputed ? 'Respond with evidence' : null,
        waiting: false,
        date: t.captured_at || t.created_at,
        amount: t.gross_amount_cents == null ? null : formatCents(t.gross_amount_cents, { cents: t.gross_amount_cents % 100 !== 0 }),
        reference: t.reference,
        image: t.listing?.cover_image_url ?? null,
        href: `/orders/${t.id}`,
      };
    });

    const buyer: Item[] = buyerBookings.map((b) => {
      const state = b.payment_status && b.payment_status !== 'paid' ? `${humanize(b.status)} · payment ${humanize(b.payment_status).toLowerCase()}` : humanize(b.status);
      const nextAction =
        b.status === 'pending'
          ? 'Waiting on the host'
          : b.status === 'approved'
            ? b.payment_status === 'paid' ? 'Confirmed. Check your dates' : b.payment_status === 'pending' ? 'Payment processing' : 'Approved. Pay now'
            : null;
      return {
        id: `buyer-${b.id}`,
        kind: b.status === 'pending' ? 'requests' : 'rentals',
        title: b.listing?.title || 'Rental request',
        counterparty: 'You requested',
        state,
        tone: toneFor(state),
        nextAction,
        waiting: nextAction === 'Waiting on the host' || nextAction === 'Payment processing',
        date: b.created_at,
        amount: dollars(b.total_price),
        reference: null,
        image: b.listing?.cover_image_url ?? null,
        href: `/dashboard/bookings/${b.id}${b.status === 'approved' && !['paid', 'pending'].includes(b.payment_status ?? '') ? '?step=payment' : ''}`,
      };
    });

    // Pending host requests are handled in the booking manager above, so they
    // are not repeated as timeline rows.
    const seller: Item[] = sellerBookings
      .filter((b) => b.status !== 'pending')
      .map((b) => {
        const state = b.payment_status && b.payment_status !== 'paid' ? `${humanize(b.status)} · payment ${humanize(b.payment_status).toLowerCase()}` : humanize(b.status);
        return {
          id: `seller-${b.id}`,
          kind: 'rentals' as const,
          title: b.listing?.title || 'Booking',
          counterparty: b.shopper?.full_name || 'Renter',
          state,
          tone: toneFor(state),
          nextAction: null,
          waiting: false,
          date: b.created_at,
          amount: dollars(b.total_price),
          reference: null,
          image: b.listing?.cover_image_url ?? null,
          href: `/dashboard/bookings/${b.id}`,
        };
      });

    const videos: Item[] = walkthroughs.map((w) => {
      const state = walkthroughDisplayStatus(w);
      const done = state === 'completed';
      return {
        id: `walkthrough-${w.id}`,
        kind: 'walkthroughs',
        title: done ? `Video walkthrough completed: ${w.listing?.title || 'Listing'}` : w.listing?.title || 'Video walkthrough',
        counterparty: w.seller_id === user?.id ? 'Meeting with buyer' : 'Meeting with seller',
        state: humanize(state),
        tone: toneFor(state),
        nextAction: state === 'needs follow-up' ? 'Review or reschedule' : done ? 'View next steps' : ['scheduled', 'rescheduled'].includes(w.status) ? 'View meeting details' : null,
        waiting: false,
        date: w.starts_at,
        amount: null,
        reference: null,
        image: w.listing?.cover_image_url || null,
        href: done ? `/walkthrough/${w.id}/next-steps` : `/walkthrough/${w.id}`,
      };
    });

    return [...payments, ...buyer, ...seller, ...videos].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [transactions, buyerBookings, sellerBookings, walkthroughs, user?.id]);

  const hasHostBookings = sellerBookings.length > 0;
  const pendingHost = sellerBookings.filter((b) => b.status === 'pending').length;
  const hasPublishedListings = hostListings.listings.some((l) => l.status === 'published');

  const countFor = (key: Filter) => (key === 'all' ? items.length : items.filter((i) => i.kind === key).length);
  const tabs: FilterTab<Filter>[] = FILTERS.filter(
    (f) =>
      f.key === 'all' ||
      f.key === filter ||
      (f.key === 'requests' && hasHostBookings) ||
      (f.key === 'listings' && hasPublishedListings) ||
      items.some((item) => item.kind === f.key),
  ).map((f) => ({
    key: f.key,
    label: f.label,
    count: f.key === 'listings' ? null : f.key === 'requests' ? countFor('requests') + pendingHost : countFor(f.key),
    attention: (f.key === 'requests' && pendingHost > 0) || (f.key === 'disputes' && countFor('disputes') > 0),
  }));

  const shown = filter === 'all' ? items : items.filter((item) => item.kind === filter);

  // Real items in state/time buckets so the page reads as one timeline.
  const groups = useMemo(() => {
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const needsAction = shown.filter((i) => !i.waiting && (i.nextAction || i.kind === 'disputes'));
    const waiting = shown.filter((i) => i.waiting);
    const rest = shown.filter((i) => !needsAction.includes(i) && !waiting.includes(i));
    return [
      { label: 'Needs your action', items: needsAction },
      { label: 'Waiting on others', items: waiting },
      { label: 'Last 30 days', items: rest.filter((i) => +new Date(i.date) >= monthAgo) },
      { label: 'Earlier', items: rest.filter((i) => +new Date(i.date) < monthAgo) },
    ].filter((g) => g.items.length);
  }, [shown]);

  const loading = (!!user && tx.isLoading) || shopper.isLoading || host.isLoading || walkthroughsLoading;
  const failed = tx.isError || shopper.isError || host.isError;
  const retry = () => {
    if (tx.isError) void tx.refresh();
    if (shopper.isError) void shopper.refetch();
    if (host.isError) void host.refetch();
  };

  const showHostPanel = filter === 'requests' ? hasHostBookings || host.isError : filter === 'all' && pendingHost > 0;
  const showListingHistory = (filter === 'all' || filter === 'sales' || filter === 'listings') && hasPublishedListings;
  const showTimeline = filter !== 'listings';
  const timelineEmpty = !loading && !failed && groups.length === 0;
  // Other panels on this view already show something: skip the big empty state.
  const otherContent = (showHostPanel && hasHostBookings) || (showListingHistory && filter !== 'sales');

  return (
    <WorkspaceShell>
      <div className={ws.page}>
        <div className={ws.stack}>
          <PageHeader
            eyebrow="Deals"
            title="Activity"
            description="Every booking request, rental, sale, purchase and walkthrough in one timeline, with the next step for each."
          />

          <div className="flex flex-col gap-6">
            {tabs.length > 1 && <FilterTabs<Filter> label="Filter activity" tabs={tabs} value={filter} onChange={setFilter} />}

            {showHostPanel && <WorkspaceHostBookings host={host} mode={filter === 'requests' ? 'full' : 'pending'} />}

            {showTimeline && (
              failed ? (
                <div className={cn(ws.surface, 'overflow-hidden')}>
                  <LoadError what="activity" onRetry={retry} />
                </div>
              ) : loading && items.length === 0 ? (
                <div className={cn(ws.surface, 'overflow-hidden')}>
                  <ul aria-busy="true" className="divide-y divide-[#F1ECE5]">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                        <span className={cn(ws.skeleton, 'h-12 w-12 shrink-0 rounded-lg sm:h-14 sm:w-[72px]')} />
                        <span className="flex-1 space-y-2">
                          <span className={cn(ws.skeleton, 'block h-4 w-56 max-w-full')} />
                          <span className={cn(ws.skeleton, 'block h-3 w-32')} />
                        </span>
                      </li>
                    ))}
                    <li className="sr-only" role="status">Loading</li>
                  </ul>
                </div>
              ) : timelineEmpty ? (
                otherContent ? null : (
                  <div className={cn(ws.surface, 'overflow-hidden')}>
                    <EmptyState
                      title={EMPTY_COPY[filter].title}
                      body={EMPTY_COPY[filter].body}
                      action={EMPTY_COPY[filter].action}
                      secondary={filter !== 'all' ? { label: 'Show all activity', to: '/dashboard/activity' } : undefined}
                    />
                  </div>
                )
              ) : (
                <section aria-label="Timeline" className={cn(ws.surface, 'overflow-hidden')}>
                  {groups.map((group, gi) => (
                    <div key={group.label} className={cn(gi > 0 && 'border-t border-[#ECE6DD]')}>
                      <h2 className="flex items-center justify-between gap-3 bg-[#FCFAF7] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A847B] sm:px-6">
                        <span>{group.label}</span>
                        <span className="tabular-nums">{group.items.length}</span>
                      </h2>
                      <ul className="divide-y divide-[#F1ECE5] border-t border-[#F1ECE5]">
                        {group.items.map((item) => <Row key={item.id} item={item} />)}
                      </ul>
                    </div>
                  ))}
                </section>
              )
            )}

            {showListingHistory && (
              <WorkspaceListingActivity
                listings={hostListings.listings}
                bookings={sellerBookings}
                transactions={transactions}
                userId={user?.id}
              />
            )}

            {filter === 'listings' && !hasPublishedListings && !hostListings.isLoading && (
              <div className={cn(ws.surface, 'overflow-hidden')}>
                <EmptyState title={EMPTY_COPY.listings.title} body={EMPTY_COPY.listings.body} action={EMPTY_COPY.listings.action} />
              </div>
            )}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
