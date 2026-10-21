import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, Crown, Image as ImageIcon } from 'lucide-react';
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
import { productCheckoutPath } from '@/lib/payments/hostedCheckout';
import { formatWalkthroughTime, walkthroughDisplayStatus } from '@/lib/videoWalkthroughs';
import { supabase } from '@/integrations/supabase/client';
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


/** Compact "To do" list for the side column: small rows, never the page's centrepiece. */
function TodoCard({ items, loading, footer }: { items: ActionItem[]; loading: boolean; footer?: ReactNode }) {
  const sorted = [...items].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
  const shown = sorted.slice(0, 5);
  const list = loading ? (
    <ul className="divide-y divide-[#F1ECE5]" aria-busy="true">
      {[0, 1, 2].map((i) => <li key={i} className="px-4 py-3"><span className={ws.skeleton + ' block h-3.5 w-40'} /></li>)}
    </ul>
  ) : shown.length ? (
    <ul className="divide-y divide-[#F1ECE5]">
      {shown.map((item) => (
        <li key={item.id}>
          <Link to={item.to} className="group flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-[#FCFAF7]">
            <span aria-hidden="true" className={'mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ' + (item.urgent ? 'bg-[#FF5124]' : 'bg-[#D9D2C7]')} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold leading-5 text-[#1C1B1A]">{item.title}</span>
              {item.detail && <span className="block truncate text-[12px] leading-5 text-[#8A847B]">{item.detail}</span>}
            </span>
            <ArrowRight aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-[#B5AEA4] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1C1B1A]" />
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <p className="px-4 py-4 text-[13px] leading-5 text-[#5E5953]">You’re all caught up.</p>
  );
  const count = loading ? null : items.length;
  const head = (
    <span className="flex items-center gap-2">
      <span className="text-[13px] font-semibold text-[#1C1B1A]">To do</span>
      {!!count && <span className="rounded-full bg-[#FF5124]/10 px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-[#B83A12]">{count}</span>}
    </span>
  );
  const more = (
    <div className="flex items-center justify-between gap-3 border-t border-[#F1ECE5] px-4 py-2.5">
      {sorted.length > shown.length ? <span className="text-[12px] text-[#8A847B]">+{sorted.length - shown.length} more</span> : <span />}
      <Link to="/dashboard/activity" className={ws.actionLink + ' !text-[12.5px]'}>All activity<ArrowRight aria-hidden="true" className="h-3 w-3" /></Link>
    </div>
  );
  return (
    <>
      {/* Phones: one tappable row that expands. */}
      <details className={ws.surface + ' group lg:hidden'}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
          {loading ? head : <span className="flex items-center gap-2">{head}<span className="text-[12.5px] text-[#8A847B]">{count ? `${count} thing${count === 1 ? '' : 's'} need you` : 'All caught up'}</span></span>}
          <ChevronDown aria-hidden="true" className="h-4 w-4 text-[#8A847B] transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-[#F1ECE5]">{list}{more}{footer && <div className="px-4 pb-3">{footer}</div>}</div>
      </details>
      {/* Desktop: a small card in the side column. */}
      <section className={ws.surface + ' hidden overflow-hidden lg:block'} aria-label="To do">
        <div className="px-4 pb-1 pt-3.5">{head}</div>
        {list}
        {more}
        {footer && <div className="px-4 pb-3">{footer}</div>}
      </section>
    </>
  );
}

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
  const walkthroughSetup = useQuery({
    queryKey: ['seller-walkthrough-setup', user?.id],
    enabled: Boolean(user && live.length),
    queryFn: async () => {
      const [settings, hours] = await Promise.all([
        supabase.from('seller_video_settings').select('enabled').eq('user_id', user!.id).maybeSingle(),
        supabase.from('seller_video_availability').select('id').eq('seller_id', user!.id).eq('active', true).limit(1),
      ]);
      if (settings.error) throw settings.error;
      if (hours.error) throw hours.error;
      return { ready: settings.data?.enabled === true && Boolean(hours.data?.length) };
    },
  });
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

    if (live.length && walkthroughSetup.data && !walkthroughSetup.data.ready)
      items.push({ id: 'walkthrough-setup', title: 'Turn on video walkthroughs', detail: 'Set available hours so buyers can book directly with you.', to: '/dashboard/account/scheduling', cta: 'Set hours' });

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
  }, [tx.transactions, hostOffers.pendingOffers, buyerOffers.counteredOffers, commerce.data, user?.id, hostBookings.bookings, handoff.data, totals.available, paypal.isLoading, paypal.lastRefreshError, paypal.isReady, live, walkthroughSetup.data, walkthroughs, unread, drafts, shopperBookings.bookings, profile?.full_name, profile?.avatar_url]);

  const attentionLoading = hostListings.isLoading || tx.isLoading || hostOffers.isLoading || hostBookings.isLoading || inbox.isLoading || walkthroughsLoading;
  const failed = [
    tx.isError && 'payments',
    (hostOffers.isError || buyerOffers.isError) && 'offers',
    (hostBookings.isError || shopperBookings.isError) && 'bookings',
    commerce.isError && 'invoices',
    inbox.isError && 'messages',
    hostListings.isError && 'listings',
    walkthroughSetup.isError && 'walkthrough settings',
  ].filter(Boolean) as string[];
  const retryAll = () => {
    void tx.refresh(); void hostOffers.refetch(); void buyerOffers.refetch(); void hostBookings.refetch();
    void shopperBookings.refetch(); void commerce.refetch(); void inbox.refetch(); void hostListings.refetch();
    void walkthroughSetup.refetch();
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

          <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-10">
            {/* Side column: compact to-do + plan */}
            <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
              <TodoCard
                items={attention}
                loading={attentionLoading}
                footer={failed.length ? (
                  <p role="alert" className="text-[12px] leading-5 text-[#5E5953]">
                    Couldn’t check {failed.join(', ')}.{' '}
                    <button type="button" onClick={retryAll} className={ws.link + ' !text-[12px]'}>Try again</button>
                  </p>
                ) : undefined}
              />

              {showSeller && !plan.isLoading && (isPro ? (
                <section className={ws.surface + ' p-4'} aria-label="Vendibook Pro">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold">Vendibook Pro</span>
                    <StatusPill tone={plan.isPastDue ? 'warn' : 'ok'}>{plan.isPastDue ? 'Past due' : plan.cancelAtPeriodEnd ? 'Ending' : 'Active'}</StatusPill>
                  </div>
                  {plan.currentPeriodEnd && <p className="mt-1 text-[12px] text-[#8A847B]">{plan.cancelAtPeriodEnd ? 'Access ends' : 'Renews'} {formatDay(plan.currentPeriodEnd)}</p>}
                  <p className="mt-2.5 text-[12.5px] leading-5 text-[#5E5953]">BuyerMatch is looking for buyers for your sale listings.</p>
                  <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2">
                    <Link to="/dashboard/buyermatch" className={ws.link + ' !text-[12.5px]'}>Open BuyerMatch</Link>
                    <Link to="/dashboard/buyermatch/membership" className={ws.actionLink + ' !text-[12.5px]'}>Manage</Link>
                  </div>
                </section>
              ) : (
                <section className="rounded-2xl bg-[#1C1B1A] p-4 text-white" aria-label="Vendibook Pro">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold">Vendibook Pro</span>
                    <span className="text-[12.5px] font-semibold tabular-nums text-white/70">{proPrice.labelWithCadence}</span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-5 text-white/75">BuyerMatch looks for buyers for your sale listings, plus a Featured Boost credit every month.</p>
                  <Button asChild variant="cta" className={ws.cta + ' mt-3.5 !h-9 w-full text-[13px]'}>
                    <Link to="/pricing">See Vendibook Pro</Link>
                  </Button>
                  <p className="mt-2 text-[11px] leading-4 text-white/50">No buyer, offer or sale is guaranteed.</p>
                </section>
              ))}
            </aside>

            {/* Main column */}
            <div className={ws.stack + ' min-w-0'}>
              {live.length > 0 && walkthroughSetup.data && !walkthroughSetup.data.ready && (
                <section className={ws.surface + ' flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6'} aria-label="Enable walkthrough bookings">
                  <div>
                    <h2 className="text-[16px] font-semibold">Let buyers book a video walkthrough</h2>
                    <p className="mt-1 text-[13px] text-[#5E5953]">Turn on walkthroughs and add your available hours. Buyers can then schedule directly from your live listings.</p>
                  </div>
                  <Link to="/dashboard/account/scheduling" className={ws.actionLink}>Set walkthrough hours <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                </section>
              )}
              {/* Your listings: small cards; the full view lives on Listings */}
              {showSeller && (
                <section aria-labelledby="home-listings">
                  <SectionHeader
                    id="home-listings"
                    title="Your listings"
                    description={hostListings.isLoading ? undefined : `${plural(live.length, 'live listing')}${drafts.length ? ` · ${plural(drafts.length, 'draft')}` : ''}${paused.length ? ` · ${paused.length} paused` : ''} · views in the last ${SIGNAL_WINDOW_DAYS} days`}
                    action={{ label: 'Manage listings', to: '/dashboard/listings' }}
                  />
                  {hostListings.isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {[0, 1, 2].map((i) => <div key={i} className={ws.skeleton + ' h-[230px] rounded-2xl'} />)}
                    </div>
                  ) : perfRows.length ? (
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {perfRows.slice(0, 3).map((l) => {
                        const featured = isListingFeatured(l as never);
                        const st = listingStatusPill(l.status);
                        const sig = signals.data?.[l.id];
                        return (
                          <li key={l.id} className={ws.surface + ' flex flex-col overflow-hidden'}>
                            <Link to="/dashboard/listings" className="group flex items-start sm:block">
                              <span className="relative block aspect-square w-24 shrink-0 overflow-hidden bg-[#F3EEE7] max-sm:m-3 max-sm:rounded-xl sm:aspect-[4/3] sm:w-auto">
                                {l.cover_image_url
                                  ? <img src={l.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                                  : <span className="grid h-full place-items-center"><ImageIcon aria-hidden="true" className="h-5 w-5 text-[#8A847B]" /></span>}
                                <span className="absolute left-2.5 top-2.5 hidden gap-1.5 sm:flex">
                                  <StatusPill tone={st.tone}>{st.label}</StatusPill>
                                  {featured && <span className="inline-flex items-center gap-1 rounded-full bg-[#1C1B1A]/85 px-2 py-0.5 text-[11px] font-semibold text-white"><Crown aria-hidden="true" className="h-3 w-3 text-[#FFB020]" />Featured</span>}
                                </span>
                              </span>
                              <span className="block min-w-0 flex-1 py-3 pr-3 sm:px-4 sm:pb-0">
                                <span className="mb-1 flex gap-1.5 sm:hidden">
                                  <StatusPill tone={st.tone}>{st.label}</StatusPill>
                                  {featured && <StatusPill tone="accent">Featured</StatusPill>}
                                </span>
                                <span className="block truncate text-[14px] font-semibold group-hover:underline">{l.title?.trim() || 'Untitled listing'}</span>
                                <span className="mt-0.5 block text-[13px] text-[#5E5953]">{listingPrice(l)}</span>
                                <span className="mt-1.5 block text-[12px] tabular-nums text-[#8A847B]">
                                  {signals.isLoading ? 'Loading views…' : `${formatCount(sig?.views30 ?? null)} views · ${formatCount(sig?.saves ?? null)} saves`}
                                  {sig?.offersWaiting ? ` · ${sig.offersWaiting} offer${sig.offersWaiting === 1 ? '' : 's'} waiting` : ''}
                                </span>
                              </span>
                            </Link>
                            <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#F1ECE4] px-4 py-2.5 sm:border-t-0 sm:pb-4 sm:pt-3">
                              {featured ? (
                                <span className="text-[12px] text-[#8A847B]">Featured until {formatDay((l as { featured_expires_at?: string | null }).featured_expires_at ?? null)}</span>
                              ) : l.status === 'published' ? (
                                <>
                                  <span className="whitespace-nowrap text-[12px] text-[#8A847B]">Not featured</span>
                                  <Link
                                    to={productCheckoutPath(ACTIVE_PRODUCT_SLUGS.featuredBoost, l.id, { success: '/dashboard/listings', cancel: '/dashboard' })}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E2DBD0] px-3 text-[12.5px] font-semibold text-[#1C1B1A] transition-colors hover:border-[#1C1B1A]"
                                  >
                                    <Crown aria-hidden="true" className="h-3.5 w-3.5 text-[#E8A317]" />Boost
                                  </Link>
                                </>
                              ) : (
                                <Link to={`/dashboard/listings/${l.id}/edit`} className={ws.actionLink + ' !text-[12.5px]'}>{l.status === 'draft' ? 'Finish draft' : 'Edit listing'}<ArrowRight aria-hidden="true" className="h-3 w-3" /></Link>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : hostListings.isError ? (
                    <EmptyState compact title="Your listings couldn’t be loaded." body="Nothing has changed on them." action={{ label: 'Open listings', to: '/dashboard/listings' }} />
                  ) : (
                    <EmptyState compact title="No listings yet." body="Listing is free. Add photos, a price and where it’s located." action={{ label: 'Create a listing', to: '/dashboard/listings/new' }} />
                  )}
                </section>
              )}

              {/* Money (sellers) */}
              {showSeller && (
                <section aria-labelledby="home-money">
                  <SectionHeader id="home-money" title="Money" description="From your recorded payouts. Vendibook reviews and sends each payout." action={{ label: 'Payouts & payments', to: '/dashboard/payments' }} />
                  <StatGrid label="Money" className="lg:grid-cols-2 2xl:grid-cols-4">
                    <StatTile label="Ready to request" format="cents" value={metric(totals.available, moneyState)} sub={totals.available > 0 ? 'Request it in Payouts' : 'Nothing waiting'} />
                    <StatTile label="Upcoming" format="cents" value={metric(totals.upcoming, moneyState)} sub={totals.nextExpectedAt ? `Next expected ${formatDay(totals.nextExpectedAt)}` : 'From paid orders and bookings'} />
                    <StatTile label="Proceeds this month" format="cents" value={metric(month.cents, moneyState)} sub={`${plural(month.count, 'order')} since ${formatDay(month.since.toISOString())}`} />
                    <StatTile label="Paid out to date" format="cents" value={metric(totals.paid, moneyState)} sub={totals.lastPaidAt ? `Last payout ${formatDay(totals.lastPaidAt)}` : 'No payouts yet'} />
                  </StatGrid>
                </section>
              )}

              {/* Getting started (brand-new account) */}
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

              {/* Buying */}
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

              {/* Recent activity */}
              {(recent.length > 0 || showSeller) && (
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
            </div>
          </div>

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
