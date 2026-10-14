import { useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { Button } from '@/components/ui/button';
import {
  ActionList,
  EmptyState,
  PageHeader,
  Panel,
  SectionHeader,
  SimpleTable,
  StatGrid,
  StatTile,
  StatusPill,
  formatCents,
  formatCount,
  formatDay,
  listingStatusPill,
  metric,
  ws,
  type ActionItem,
  type SimpleColumn,
} from '@/components/workspace/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useHostListings } from '@/hooks/useHostListings';
import { useHostOffers } from '@/hooks/useHostOffers';
import { useBuyerOffers } from '@/hooks/useBuyerOffers';
import { useShopperBookings } from '@/hooks/useShopperBookings';
import { useHostBookings } from '@/hooks/useHostBookings';
import { useUserTransactions, OPEN_DISPUTE_STATUSES } from '@/hooks/useUserTransactions';
import { useConversations } from '@/hooks/useConversations';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
import { useFavorites } from '@/hooks/useFavorites';
import { useHandoffTasks } from '@/hooks/useHandoffTasks';
import { useVideoWalkthroughs } from '@/hooks/useVideoWalkthroughs';
import { useCommerceRecords, invoiceMoney } from '@/hooks/useCommerceRecords';
import { useSellerPayables } from '@/hooks/useSellerPayables';
import { useBuyerMatchSignals, SIGNAL_WINDOW_DAYS } from '@/hooks/useBuyerMatchSignals';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';
import { summarizePayables, proceedsSince } from '@/lib/payouts/payableTotals';
import { legacyDashboardRedirect } from '@/lib/workspace/legacyDashboardRedirect';
import { isListingFeatured } from '@/lib/featured';
import { formatWalkthroughTime, walkthroughDisplayStatus } from '@/lib/videoWalkthroughs';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;

/** Listings whose signals we read; matches the cap inside fetchListingSignals. */
const SIGNAL_LISTING_CAP = 24;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const dollars = (n?: number | null) => (typeof n === 'number' && Number.isFinite(n) ? formatCents(Math.round(n * 100)) : null);

const greeting = (now = new Date()) => {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const listingPrice = (l: Listing) => {
  if (l.mode === 'sale') return dollars(l.price_sale) ?? 'Price not set';
  const daily = dollars(l.price_daily);
  return daily ? `${daily}/day` : 'Rate not set';
};

export default function WorkspaceHome() {
  const [routeParams] = useSearchParams();
  const { user, profile } = useAuth();

  const hostListings = useHostListings();
  const hostBookings = useHostBookings();
  const shopperBookings = useShopperBookings();
  const tx = useUserTransactions(user?.id);
  const inbox = useConversations();
  const favorites = useFavorites();
  const hostOffers = useHostOffers();
  const buyerOffers = useBuyerOffers();
  const commerce = useCommerceRecords();
  const payablesQ = useSellerPayables();
  const handoff = useHandoffTasks();
  const { walkthroughs, isLoading: walkthroughsLoading } = useVideoWalkthroughs();
  const paypal = useMyPayPalConnection();
  const plan = useHostEntitlements();
  const proPrice = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.vendibookPro);

  const listings = hostListings.listings;
  const activeListings = useMemo(() => listings.filter((l) => l.status !== 'archived'), [listings]);
  const live = activeListings.filter((l) => l.status === 'published');
  const drafts = activeListings.filter((l) => l.status === 'draft');
  const paused = activeListings.filter((l) => l.status === 'paused');
  const signalIds = useMemo(() => activeListings.slice(0, SIGNAL_LISTING_CAP).map((l) => l.id), [activeListings]);
  const signals = useBuyerMatchSignals(signalIds);

  const payables = useMemo(() => payablesQ.data ?? [], [payablesQ.data]);
  const totals = useMemo(() => summarizePayables(payables), [payables]);
  const month = useMemo(() => proceedsSince(payables), [payables]);

  const sellerTx = tx.transactions.filter((t) => t.role === 'seller');
  const buyerTx = tx.transactions.filter((t) => t.role === 'buyer');
  const isSeller = listings.length > 0 || hostBookings.bookings.length > 0 || payables.length > 0 || sellerTx.length > 0 || hostOffers.offers.length > 0;
  const isBuyer = buyerTx.length > 0 || shopperBookings.bookings.length > 0 || buyerOffers.offers.length > 0 || favorites.favorites.length > 0;
  const sellerKnown = !hostListings.isLoading;

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const unread = inbox.conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

  const attention = useMemo(() => {
    const items: ActionItem[] = [];
    const now = Date.now();

    const disputes = tx.transactions.filter((t) => t.dispute_status && OPEN_DISPUTE_STATUSES.includes(t.dispute_status));
    if (disputes.length)
      items.push({ id: 'disputes', urgent: true, title: `${plural(disputes.length, 'payment')} under dispute`, detail: 'Add your side and any evidence.', to: '/dashboard/activity?filter=disputes', cta: 'Respond' });

    const waiting = hostOffers.pendingOffers;
    if (waiting.length) {
      const top = Math.max(...waiting.map((o) => Number(o.offer_amount) || 0));
      items.push({ id: 'offers', urgent: true, title: `${plural(waiting.length, 'offer')} waiting on you`, detail: `Highest ${dollars(top)} · offers expire 48 hours after they're sent`, to: '/dashboard/offers', cta: 'Review' });
    }

    const countered = buyerOffers.counteredOffers ?? [];
    if (countered.length)
      items.push({ id: 'countered', urgent: true, title: countered.length === 1 ? 'A seller countered your offer' : `${countered.length} sellers countered your offers`, detail: countered[0]?.listing?.title ?? 'Accept or decline before it expires.', to: '/dashboard/offers', cta: 'Respond' });

    const invoices = (commerce.data?.invoices ?? []) as Array<{ id: string; buyer_id: string; status: string; due_at: string; invoice_number: string; total_cents: number }>;
    const unpaid = invoices
      .filter((i) => i.buyer_id === user?.id && i.status === 'issued' && Date.parse(i.due_at) > now)
      .sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at));
    if (unpaid[0])
      items.push({ id: 'invoice', urgent: true, title: 'Review your purchase invoice', detail: `${unpaid[0].invoice_number} · due ${formatDay(unpaid[0].due_at)}`, meta: invoiceMoney(unpaid[0].total_cents), to: `/invoices/${unpaid[0].id}`, cta: 'Review' });

    const requests = ((commerce.data?.requests ?? []) as Array<{ seller_id: string; status: string; expires_at: string }>)
      .filter((r) => r.seller_id === user?.id && ['requested', 'under_review', 'revision_pending'].includes(r.status) && Date.parse(r.expires_at) > now);
    if (requests.length)
      items.push({ id: 'purchase-requests', urgent: true, title: `${plural(requests.length, 'purchase request')} to review`, detail: 'Check the equipment and the agreed terms.', to: '/dashboard/invoices?view=selling', cta: 'Review' });

    const pendingHost = hostBookings.bookings.filter((b) => b.status === 'pending');
    if (pendingHost.length)
      items.push({ id: 'booking-requests', urgent: true, title: `${plural(pendingHost.length, 'booking request')} waiting on you`, detail: 'Approve, decline or message the renter.', to: '/dashboard/activity?filter=requests', cta: 'Review' });

    (handoff.data ?? []).forEach((t) => items.push({ id: `handoff-${t.id}`, urgent: t.tone === 'warn', title: t.label, detail: t.hint, to: t.to, cta: 'Open' }));

    if (totals.available > 0)
      items.push({ id: 'payout', title: 'Payout ready to request', detail: 'Vendibook reviews and sends each payout.', meta: formatCents(totals.available), to: '/dashboard/payments', cta: 'Request' });

    if (!paypal.isLoading && !paypal.lastRefreshError && !paypal.isReady && live.some((l) => l.mode === 'sale'))
      items.push({ id: 'paypal', title: 'Connect PayPal to accept online sale payments', detail: 'Buyers can’t pay online for your sale listings until it’s connected.', to: '/dashboard/payments/setup', cta: 'Connect' });

    walkthroughs
      .filter((w) => ['scheduled', 'rescheduled'].includes(w.status) && Date.parse(w.ends_at) > now)
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
      .forEach((w) => items.push({ id: `walkthrough-${w.id}`, title: `Video walkthrough ${formatWalkthroughTime(w.starts_at)}`, detail: w.listing?.title || 'Scheduled walkthrough', to: `/walkthrough/${w.id}`, cta: 'Open' }));
    walkthroughs
      .filter((w) => walkthroughDisplayStatus(w) === 'needs follow-up')
      .forEach((w) => items.push({ id: `followup-${w.id}`, title: 'Walkthrough needs follow-up', detail: w.listing?.title || 'Review the meeting record or reschedule.', to: `/walkthrough/${w.id}`, cta: 'Follow up' }));

    if (unread)
      items.push({ id: 'messages', title: `${plural(unread, 'unread message')}`, detail: 'Quick replies help close deals.', to: '/dashboard/messages', cta: 'Reply' });

    if (drafts.length)
      items.push({ id: 'drafts', title: `${plural(drafts.length, 'listing draft')} to finish`, detail: drafts[0]?.title?.trim() || 'Pick up where you left off.', to: '/dashboard/listings?status=draft', cta: 'Finish' });

    const pendingMine = shopperBookings.bookings.filter((b) => b.status === 'pending');
    if (pendingMine.length)
      items.push({ id: 'my-requests', title: `${plural(pendingMine.length, 'rental request')} awaiting the host`, detail: 'Message the host if you need an answer sooner.', to: '/dashboard/activity?filter=rentals', cta: 'View' });

    if (!profile?.full_name || !profile?.avatar_url)
      items.push({ id: 'profile', title: 'Add your name and photo', detail: 'People reply faster when they know who they’re dealing with.', to: '/dashboard/account', cta: 'Update' });

    return items;
  }, [tx.transactions, hostOffers.pendingOffers, buyerOffers.counteredOffers, commerce.data, user?.id, hostBookings.bookings, handoff.data, totals.available, paypal.isLoading, paypal.lastRefreshError, paypal.isReady, live, walkthroughs, unread, drafts, shopperBookings.bookings, profile?.full_name, profile?.avatar_url]);

  const attentionLoading = hostListings.isLoading || tx.isLoading || hostOffers.isLoading || hostBookings.isLoading || inbox.isLoading || walkthroughsLoading;
  const failed = [
    tx.isError && 'payments',
    (hostOffers.isError || buyerOffers.isError) && 'offers',
    (hostBookings.isError || shopperBookings.isError) && 'bookings',
    commerce.isError && 'invoices',
    inbox.isError && 'messages',
    hostListings.isError && 'listings',
  ].filter(Boolean) as string[];
  const retryAll = () => {
    void tx.refresh(); void hostOffers.refetch(); void buyerOffers.refetch(); void hostBookings.refetch();
    void shopperBookings.refetch(); void commerce.refetch(); void inbox.refetch(); void hostListings.refetch();
  };

  const recent = useMemo(
    () =>
      [
        ...tx.transactions.map((t) => ({
          id: `t-${t.id}`, to: `/dashboard/transactions/${t.id}`, title: t.listing?.title || 'Vendibook payment',
          kind: t.booking_request_id || /rent/i.test(t.transaction_type ?? '') ? (t.role === 'buyer' ? 'Rental payment' : 'Rental earnings') : t.role === 'buyer' ? 'Purchase' : 'Sale', status: (t.payment_status || 'recorded').replace(/_/g, ' '),
          date: t.captured_at || t.created_at, amount: formatCents(t.gross_amount_cents, { cents: true }),
        })),
        ...shopperBookings.bookings.map((b) => ({
          id: `sb-${b.id}`, to: `/dashboard/bookings/${b.id}`, title: b.listing?.title || 'Rental request',
          kind: 'Rental request', status: b.status, date: b.created_at, amount: null as string | null,
        })),
        ...hostBookings.bookings.map((b) => ({
          id: `hb-${b.id}`, to: `/dashboard/bookings/${b.id}`, title: b.listing?.title || 'Booking request',
          kind: 'Booking', status: b.status, date: b.created_at, amount: null as string | null,
        })),
        ...walkthroughs.map((w) => ({
          id: `w-${w.id}`, to: `/walkthrough/${w.id}`, title: w.listing?.title || 'Video walkthrough',
          kind: 'Walkthrough', status: walkthroughDisplayStatus(w), date: w.created_at, amount: null as string | null,
        })),
      ]
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .slice(0, 5),
    [tx.transactions, shopperBookings.bookings, hostBookings.bookings, walkthroughs],
  );
  type RecentRow = (typeof recent)[number];

  // Listing performance: most-viewed first, live before everything else.
  const perfRows = useMemo(() => {
    const s = signals.data ?? {};
    return [...activeListings]
      .sort((a, b) =>
        Number(b.status === 'published') - Number(a.status === 'published') ||
        (s[b.id]?.views30 ?? -1) - (s[a.id]?.views30 ?? -1))
      .slice(0, 5);
  }, [activeListings, signals.data]);

  const sum = (key: 'views30' | 'saves' | 'conversations') => {
    if (signals.isLoading || !signalIds.length) return signalIds.length ? undefined : 0;
    if (signals.isError || !signals.data) return null;
    let total = 0;
    for (const id of signalIds) {
      const v = signals.data[id]?.[key];
      if (typeof v !== 'number') return null;
      total += v;
    }
    return total;
  };
  const signalCell = (id: string, key: 'views30' | 'saves' | 'offersWaiting') =>
    signals.isLoading ? <span className={ws.skeleton + ' ml-auto block h-4 w-8'} /> : formatCount(signals.data?.[id]?.[key] ?? null);

  const perfColumns: SimpleColumn<Listing>[] = [
    {
      key: 'listing', header: 'Listing',
      cell: (l) => (
        <Link to={l.status === 'published' ? `/listing/${l.id}` : `/dashboard/listings/${l.id}/edit`} className="group flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-[#F3EEE7]">
            {l.cover_image_url ? <img src={l.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageIcon aria-hidden="true" className="h-4 w-4 text-[#8A847B]" />}
          </span>
          <span className="min-w-0">
            <span className="block max-w-[40vw] truncate font-semibold group-hover:underline sm:max-w-[18rem]">{l.title?.trim() || 'Untitled listing'}</span>
            <span className="block truncate text-[12.5px] text-[#8A847B]">{l.mode === 'sale' ? 'For sale' : 'For rent'} · {listingPrice(l)}</span>
          </span>
        </Link>
      ),
    },
    {
      key: 'status', header: 'Status', hideBelow: 'sm',
      cell: (l) => {
        const s = listingStatusPill(l.status);
        return <span className="flex flex-wrap gap-1.5"><StatusPill tone={s.tone}>{s.label}</StatusPill>{isListingFeatured(l as never) && <StatusPill tone="accent" dot={false}>Featured</StatusPill>}</span>;
      },
    },
    { key: 'views', header: `Views · ${SIGNAL_WINDOW_DAYS}d`, align: 'right', cell: (l) => signalCell(l.id, 'views30') },
    { key: 'saves', header: 'Saves', align: 'right', hideBelow: 'sm', cell: (l) => signalCell(l.id, 'saves') },
    { key: 'offers', header: 'Offers waiting', align: 'right', hideBelow: 'md', cell: (l) => signalCell(l.id, 'offersWaiting') },
  ];

  const recentColumns: SimpleColumn<RecentRow>[] = [
    {
      key: 'item', header: 'Item',
      cell: (r) => (
        <Link to={r.to} className="block min-w-0 hover:underline">
          <span className="block max-w-[55vw] truncate font-semibold sm:max-w-[16rem]">{r.title}</span>
          <span className="block truncate text-[12.5px] text-[#8A847B] first-letter:uppercase">{r.kind} · {r.status}</span>
        </Link>
      ),
    },
    { key: 'date', header: 'Date', hideBelow: 'sm', className: 'whitespace-nowrap text-[#5E5953]', cell: (r) => formatDay(r.date) },
    { key: 'amount', header: 'Amount', align: 'right', cell: (r) => r.amount ?? <span className="text-[#B5AEA4]">—</span> },
  ];

  // Older links and emails used /dashboard?view=…&tab=… and offer emails use
  // /dashboard?offer=<id>. Map them onto workspace pages.
  const legacyTarget = legacyDashboardRedirect(routeParams);
  if (legacyTarget) return <Navigate to={legacyTarget} replace />;

  const showSeller = !sellerKnown || isSeller;
  const isPro = !plan.isLoading && plan.tier !== 'free';
  const moneyState = { loading: payablesQ.isLoading, error: payablesQ.isError };
  const buyingOpen = buyerOffers.pendingOffers.length + (buyerOffers.counteredOffers?.length ?? 0);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <WorkspaceShell>
      <div className={ws.page}>
        <div className={ws.stack}>
          <PageHeader
            eyebrow={today}
            title={firstName ? `${greeting()}, ${firstName}.` : `${greeting()}.`}
            description={
              !sellerKnown ? 'Loading your workspace…'
                : isSeller ? 'Where your listings, deals and payouts stand today.'
                : 'Buy, rent or sell food trucks, trailers and kitchens, all from one workspace.'
            }
          />

          {/* 1. What needs a decision */}
          <Panel
            title="Needs your attention"
            description={attentionLoading ? 'Checking your listings, offers and payments…' : attention.length > 1 ? `${plural(attention.length, 'item')}, most urgent first` : undefined}
            action={{ label: 'All activity', to: '/dashboard/activity' }}
            flush
            footer={failed.length ? (
              <p role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#5E5953]">
                <span>Couldn’t check {failed.join(', ')} just now.</span>
                <button type="button" onClick={retryAll} className={ws.link}>Try again</button>
              </p>
            ) : undefined}
          >
            <ActionList
              items={attention}
              loading={attentionLoading}
              max={5}
              moreHref="/dashboard/activity"
              empty={<p className="px-5 py-5 text-[14px] text-[#5E5953] sm:px-6">You’re all caught up. New offers, requests and payouts will show up here.</p>}
            />
          </Panel>

          {/* 2. Money (sellers) */}
          {showSeller && (
            <section aria-labelledby="home-money">
              <SectionHeader id="home-money" title="Money" description="From your recorded payouts. Vendibook reviews and sends each payout." action={{ label: 'Payouts & payments', to: '/dashboard/payments' }} />
              <StatGrid label="Money">
                <StatTile label="Ready to request" format="cents" value={metric(totals.available, moneyState)} sub={totals.available > 0 ? 'Request it in Payouts' : 'Nothing waiting'} />
                <StatTile label="Upcoming" format="cents" value={metric(totals.upcoming, moneyState)} sub={totals.nextExpectedAt ? `Next expected ${formatDay(totals.nextExpectedAt)}` : 'From paid orders and bookings'} />
                <StatTile label="Proceeds this month" format="cents" value={metric(month.cents, moneyState)} sub={`${plural(month.count, 'order')} since ${formatDay(month.since.toISOString())}`} />
                <StatTile label="Paid out to date" format="cents" value={metric(totals.paid, moneyState)} sub={totals.lastPaidAt ? `Last payout ${formatDay(totals.lastPaidAt)}` : 'No payouts yet'} />
              </StatGrid>
            </section>
          )}

          {/* 3. Listing performance (sellers) */}
          {showSeller && (
            <Panel
              title="Listing performance"
              description={`Views in the last ${SIGNAL_WINDOW_DAYS} days${activeListings.length > SIGNAL_LISTING_CAP ? ` · your ${SIGNAL_LISTING_CAP} newest listings` : ''}. Saves are all time.`}
              action={{ label: 'All listings', to: '/dashboard/listings' }}
              flush
            >
              <StatGrid label="Listing totals" variant="flat" className="border-b border-[#ECE6DD]">
                <StatTile size="sm" label="Live listings" value={metric(live.length, { loading: hostListings.isLoading, error: hostListings.isError })} sub={drafts.length || paused.length ? [drafts.length && plural(drafts.length, 'draft'), paused.length && `${paused.length} paused`].filter(Boolean).join(' · ') : undefined} />
                <StatTile size="sm" label={`Views · ${SIGNAL_WINDOW_DAYS} days`} value={hostListings.isLoading ? undefined : sum('views30')} />
                <StatTile size="sm" label="Saves" value={hostListings.isLoading ? undefined : sum('saves')} />
                <StatTile size="sm" label="Buyer conversations" value={hostListings.isLoading ? undefined : sum('conversations')} />
              </StatGrid>
              <SimpleTable
                caption="Your listings by views"
                columns={perfColumns}
                rows={perfRows}
                rowKey={(l) => l.id}
                loading={hostListings.isLoading}
                empty={
                  hostListings.isError
                    ? <EmptyState compact className="px-5 py-5 sm:px-6" title="Your listings couldn’t be loaded." body="Nothing has changed on them." action={{ label: 'Open listings', to: '/dashboard/listings' }} />
                    : <EmptyState compact className="px-5 py-5 sm:px-6" title="No listings yet." body="Listing is free. Add photos, a price and where it’s located." action={{ label: 'Create a listing', to: '/dashboard/listings/new' }} />
                }
              />
            </Panel>
          )}

          {/* 4. Getting started (brand-new account) */}
          {sellerKnown && !isSeller && !isBuyer && (
            <section className={ws.surface + ' grid overflow-hidden md:grid-cols-2'} aria-label="Get started">
              <div className="p-6 sm:p-8">
                <p className={ws.eyebrow}>Sell or rent out</p>
                <h2 className="mt-2.5 text-[20px] font-semibold tracking-[-0.02em]">List a truck, trailer or kitchen</h2>
                <p className={ws.body + ' mt-2 max-w-sm'}>Listing is free. Buyers and renters message you through Vendibook, and offers and bookings show up here.</p>
                <Button asChild variant="cta" className={ws.cta + ' mt-6'}>
                  <Link to="/dashboard/listings/new">Create a listing</Link>
                </Button>
              </div>
              <div className="border-t border-[#ECE6DD] p-6 sm:p-8 md:border-l md:border-t-0">
                <p className={ws.eyebrow}>Buy or rent</p>
                <h2 className="mt-2.5 text-[20px] font-semibold tracking-[-0.02em]">Find equipment near you</h2>
                <p className={ws.body + ' mt-2 max-w-sm'}>Save listings to compare, message sellers and make offers. Your purchases and requests are tracked here.</p>
                <Link to="/search" className={ws.secondary + ' mt-6'}>Browse marketplace</Link>
              </div>
            </section>
          )}

          {/* 5. Buying */}
          {sellerKnown && isBuyer && (
            <section aria-labelledby="home-buying">
              <SectionHeader id="home-buying" title="Buying" action={{ label: 'Saved listings', to: '/dashboard/saved' }} />
              <StatGrid label="Buying">
                <StatTile to="/dashboard/saved" label="Saved listings" value={metric(favorites.favorites.length, { loading: favorites.isLoading, error: favorites.isError })} />
                <StatTile to="/dashboard/offers" label="Open offers" value={metric(buyingOpen, { loading: buyerOffers.isLoading, error: buyerOffers.isError })} sub={buyerOffers.counteredOffers?.length ? `${buyerOffers.counteredOffers.length} countered` : undefined} />
                <StatTile to="/dashboard/activity?filter=rentals" label="Rental requests" value={metric(shopperBookings.bookings.filter((b) => b.status === 'pending').length, { loading: shopperBookings.isLoading, error: shopperBookings.isError })} sub="Awaiting the host" />
                <StatTile to="/dashboard/transactions?filter=Purchases" label="Purchases" value={metric(buyerTx.length, { loading: tx.isLoading, error: tx.isError })} sub="Payments recorded" />
              </StatGrid>
            </section>
          )}

          {/* 6. Recent activity + plan */}
          {(recent.length > 0 || showSeller) && (
            <div className={showSeller ? 'grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8' : ''}>
              <Panel title="Recent activity" action={{ label: 'View all', to: '/dashboard/activity' }} flush>
                <SimpleTable
                  caption="Recent activity"
                  columns={recentColumns}
                  rows={recent}
                  rowKey={(r) => r.id}
                  loading={tx.isLoading && !recent.length}
                  empty={<EmptyState compact className="px-5 py-5 sm:px-6" title="No activity yet." body="Payments, bookings and walkthroughs appear here as they happen." />}
                />
              </Panel>

              {showSeller && (isPro ? (
                <Panel
                  className="lg:self-start"
                  title="Vendibook Pro"
                  action={<StatusPill tone={plan.isPastDue ? 'warn' : 'ok'}>{plan.isPastDue ? 'Past due' : plan.cancelAtPeriodEnd ? 'Ending' : 'Active'}</StatusPill>}
                  footer={<Link to="/dashboard/buyermatch/membership" className={ws.actionLink}>Manage membership</Link>}
                >
                  {(plan.currentPeriodEnd || plan.planLabel !== 'Vendibook Pro') && (
                    <p className="mb-3 text-[14px] font-semibold text-[#1C1B1A]">
                      {[plan.planLabel !== 'Vendibook Pro' && plan.planLabel, plan.currentPeriodEnd && `${plan.cancelAtPeriodEnd ? 'Access ends' : 'Renews'} ${formatDay(plan.currentPeriodEnd)}`].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className={ws.body}>BuyerMatch has our team look for buyers for your sale listings and logs every step.</p>
                  <Link to="/dashboard/buyermatch" className={ws.secondary + ' mt-5'}>Open BuyerMatch</Link>
                </Panel>
              ) : plan.isLoading ? null : (
                <Panel className="lg:self-start" title="Vendibook Pro" action={<span className="text-[13px] font-semibold tabular-nums text-[#5E5953]">{proPrice.labelWithCadence}</span>}>
                  <ul className="space-y-2.5 text-[14px] leading-6 text-[#1C1B1A]">
                    <li>BuyerMatch: our team looks for buyers for your sale listings</li>
                    <li className="border-t border-[#F1ECE5] pt-2.5">A Featured Boost credit every month</li>
                    <li className="border-t border-[#F1ECE5] pt-2.5">Priority support</li>
                  </ul>
                  <Button asChild variant="cta" className={ws.cta + ' mt-6 w-full sm:w-auto'}>
                    <Link to="/pricing">See Vendibook Pro</Link>
                  </Button>
                  <p className={ws.note + ' mt-3'}>No buyer, offer or sale is guaranteed.</p>
                </Panel>
              ))}
            </div>
          )}

          {/* Buyers who don't sell yet: one quiet prompt, not a second dashboard. */}
          {sellerKnown && !isSeller && isBuyer && (
            <section className={ws.surface + ' flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8'} aria-label="Start selling">
              <div className="max-w-xl">
                <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Have a truck, trailer or kitchen to sell or rent out?</h2>
                <p className={ws.body + ' mt-1.5'}>Listing is free. Offers, bookings and payouts will show up on this page.</p>
              </div>
              <Link to="/dashboard/listings/new" className={ws.secondary + ' self-start sm:self-center'}>Create a listing</Link>
            </section>
          )}

          {/* 7. Shortcuts */}
          <nav aria-label="Shortcuts" className="flex flex-wrap gap-x-6 gap-y-3 border-t border-[#ECE6DD] pt-6">
            {[
              ['Create a listing', '/dashboard/listings/new'],
              ...(isSeller ? [['Payout details', '/dashboard/account/payouts']] : []),
              ['Invoices', '/dashboard/invoices'],
              ['Notification settings', '/dashboard/notifications/settings'],
              ['Browse marketplace', '/search'],
            ].map(([label, to]) => (
              <Link key={to} to={to} className={ws.actionLink}>{label}</Link>
            ))}
          </nav>
        </div>
      </div>
    </WorkspaceShell>
  );
}
