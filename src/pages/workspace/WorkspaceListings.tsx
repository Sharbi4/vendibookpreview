import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Crown, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import {
  EmptyState,
  PageHeader,
  StatGrid,
  StatTile,
  StatusPill,
  formatCount,
  listingStatusPill,
  ws,
} from '@/components/workspace/ui';
import { FilterTabs, type FilterTab } from '@/components/workspace/selling/FilterTabs';
import ListingRowMenu from '@/components/workspace/selling/ListingRowMenu';
import { LoadError, Thumb } from '@/components/workspace/selling/sellingUi';
import { btn } from '@/components/workspace/selling/buttons';
import { dollars } from '@/components/workspace/selling/format';
import { canBoostListing } from '@/lib/listings/publicVisibility';
import { useHostListings } from '@/hooks/useHostListings';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
import { useBuyerMatchSignals, SIGNAL_WINDOW_DAYS } from '@/hooks/useBuyerMatchSignals';
import { PromoteListingModal } from '@/components/dashboard/PromoteListingModal';
import { isListingFeatured, featuredDaysRemaining } from '@/lib/featured';
import { useVideoWalkthroughs } from '@/hooks/useVideoWalkthroughs';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;
type StatusFilter = 'featured' | 'all' | 'published' | 'draft' | 'paused' | 'archived';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Live' },
  { key: 'draft', label: 'Drafts' },
  { key: 'paused', label: 'Paused' },
  { key: 'archived', label: 'Archived' },
  { key: 'featured', label: 'Featured' },
];

/** Listings whose signals we read; matches the cap inside fetchListingSignals. */
const SIGNAL_LISTING_CAP = 24;

const priceLine = (l: Listing) => {
  if (l.mode === 'sale') return dollars(l.price_sale) ?? 'Price not set';
  const daily = dollars(l.price_daily);
  return daily ? `${daily}/day` : 'Rate not set';
};

/** Columns of the listings table at md and up. */
const GRID = 'md:grid md:grid-cols-[minmax(0,1fr)_56px_52px_56px_196px] md:items-center md:gap-x-4 lg:gap-x-5';

export default function WorkspaceListings() {
  const { listings, isLoading, isError, refetch, pauseListing, unpauseListing, archiveListing, deleteListing } = useHostListings();
  const paypal = useMyPayPalConnection();
  const paypalReady = paypal.isReady;
  const { walkthroughs } = useVideoWalkthroughs();
  const [searchParams, setSearchParams] = useSearchParams();
  const [boostTarget, setBoostTarget] = useState<{ id: string; title: string } | null>(null);
  const boostHandled = useRef(false);

  const statusParam = searchParams.get('status') as StatusFilter | null;
  const filter: StatusFilter = FILTERS.some((f) => f.key === statusParam) ? (statusParam as StatusFilter) : 'all';
  const setFilter = (value: StatusFilter) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value === 'all') next.delete('status');
      else next.set('status', value);
      return next;
    }, { replace: true });

  // Email campaign deep link: /dashboard/listings?boost=<listing_id>
  useEffect(() => {
    const boostId = searchParams.get('boost');
    if (!boostId) { boostHandled.current = false; return; }
    if (boostHandled.current || isLoading) return;
    boostHandled.current = true;

    const listing = listings.find((l) => l.id === boostId);
    const consume = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('boost');
      setSearchParams(next, { replace: true });
    };

    if (!listing) {
      toast.error("We couldn't find that listing in your account.");
      consume();
      return;
    }
    if (isListingFeatured(listing as never)) {
      toast.success(`"${listing.title}" is already Featured — no action needed.`);
      consume();
      return;
    }
    if (!canBoostListing(listing as never)) {
      toast.info('That listing needs to be live before it can be Featured.');
      consume();
      return;
    }

    if (typeof window !== 'undefined' && (window as { gtag?: (...a: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...a: unknown[]) => void }).gtag(
        'event',
        'boost_modal_opened_from_email',
        {
          event_category: 'featured_boost',
          event_label: boostId,
          campaign: searchParams.get('utm_campaign') ?? undefined,
        },
      );
    }

    setBoostTarget({ id: listing.id, title: listing.title });
    consume();
  }, [searchParams, setSearchParams, listings, isLoading]);

  const counts = useMemo(
    () => ({
      all: listings.length,
      featured: listings.filter((l) => isListingFeatured(l as never)).length,
      published: listings.filter((l) => l.status === 'published').length,
      draft: listings.filter((l) => l.status === 'draft').length,
      paused: listings.filter((l) => l.status === 'paused').length,
      archived: listings.filter((l) => l.status === 'archived').length,
    }),
    [listings],
  );

  const signalIds = useMemo(
    () => listings.filter((l) => l.status !== 'archived').slice(0, SIGNAL_LISTING_CAP).map((l) => l.id),
    [listings],
  );
  const signals = useBuyerMatchSignals(signalIds);
  const sum = (key: 'views30' | 'saves' | 'offersWaiting') => {
    if (!signalIds.length) return 0;
    if (signals.isLoading) return undefined;
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
    signals.isLoading && signalIds.includes(id)
      ? <span aria-hidden="true" className={cn(ws.skeleton, 'ml-auto block h-4 w-8')} />
      : formatCount(signals.data?.[id]?.[key] ?? null);

  const eligible = listings.filter((l) => canBoostListing(l as never) && !isListingFeatured(l as never));
  const upcomingWalkthroughs = (id: string) =>
    walkthroughs.filter((w) => w.listing_id === id && ['scheduled', 'rescheduled'].includes(w.status) && +new Date(w.ends_at) > Date.now()).length;
  const liveSale = listings.some((l) => l.status === 'published' && l.mode === 'sale');
  const showPaymentsNotice = !paypal.isLoading && !paypal.lastRefreshError && !paypalReady && liveSale;

  const shown =
    filter === 'featured'
      ? listings.filter((l) => isListingFeatured(l as never))
      : filter === 'all'
        ? listings
        : listings.filter((l) => l.status === filter);

  const tabs: FilterTab<StatusFilter>[] = FILTERS
    .filter((f) => f.key === 'all' || f.key === 'published' || f.key === filter || counts[f.key] > 0 || (f.key === 'featured' && eligible.length > 0))
    .map((f) => ({ key: f.key, label: f.label, count: counts[f.key] }));

  const share = async (id: string, title: string) => {
    const url = `${window.location.origin}/listing/${id}`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Listing link copied.');
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const startBoost = () => {
    if (eligible.length === 1) setBoostTarget({ id: eligible[0].id, title: eligible[0].title });
    else setFilter('published');
  };

  const hasListings = listings.length > 0;
  const firstLoad = isLoading && !hasListings;
  const failed = isError && !hasListings;

  const description = firstLoad
    ? 'Loading your listings…'
    : failed
      ? 'Manage what you sell and rent out on Vendibook.'
      : hasListings
        ? `${counts.published} live · ${counts.draft} draft${counts.draft === 1 ? '' : 's'} · ${counts.paused} paused. Views, saves and offers are from the last ${SIGNAL_WINDOW_DAYS} days.`
        : 'Everything you sell or rent out on Vendibook, with how buyers are responding.';

  const emptyForFilter = () => {
    if (filter === 'featured')
      return (
        <EmptyState
          title="No Featured listings right now."
          body="Featured listings get a gold badge and dedicated Featured placement. Boost any live listing to review options and pricing."
          secondary={{ label: 'Show live listings', to: '/dashboard/listings?status=published' }}
        />
      );
    const label = FILTERS.find((f) => f.key === filter)?.label.toLowerCase() ?? 'matching';
    return (
      <EmptyState
        title={`No ${label} listings.`}
        body="Listings move here when their status changes."
        secondary={{ label: 'Show all listings', to: '/dashboard/listings' }}
      />
    );
  };

  return (
    <WorkspaceShell>
      <div className={ws.page}>
        <div className={ws.stack}>
          <PageHeader
            eyebrow="Selling"
            title="Listings"
            description={description}
            actions={hasListings ? (
              <Link to="/dashboard/listings/new" className={ws.secondary}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                New listing
              </Link>
            ) : undefined}
          />

          {hasListings && (
            <StatGrid label="Listing performance">
              <StatTile label="Live listings" value={counts.published} sub={counts.featured ? `${counts.featured} Featured` : 'None Featured'} />
              <StatTile label={`Views · ${SIGNAL_WINDOW_DAYS} days`} value={sum('views30')} sub="Listing page visits" />
              <StatTile label="Saves" value={sum('saves')} sub="Buyers who saved a listing" />
              <StatTile to="/dashboard/offers" label="Offers waiting" value={sum('offersWaiting')} attention sub="Answer within 48 hours" />
            </StatGrid>
          )}

          <section aria-label="Your listings" className="flex flex-col gap-5">
            {hasListings && <FilterTabs label="Filter listings" tabs={tabs} value={filter} onChange={setFilter} />}

            {showPaymentsNotice && (
              <div className="flex flex-col gap-3 rounded-xl bg-[#FBF1DC] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-[13px] leading-5 text-[#5C3B00]">
                  <span className="font-semibold">Online payments aren’t set up.</span> Buyers can’t pay online for your sale listings until you connect PayPal.
                </p>
                <Link to="/dashboard/payments/setup" className={cn(btn.outline, 'self-start sm:self-auto')}>Set up payments</Link>
              </div>
            )}

            <div className={cn(ws.surface, 'overflow-hidden')}>
              {failed ? (
                <LoadError what="listings" onRetry={() => void refetch()} />
              ) : firstLoad ? (
                <ul aria-busy="true" className="divide-y divide-[#F1ECE5]">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                      <span className={cn(ws.skeleton, 'h-14 w-[72px] shrink-0 rounded-lg')} />
                      <span className="flex-1 space-y-2">
                        <span className={cn(ws.skeleton, 'block h-4 w-56 max-w-full')} />
                        <span className={cn(ws.skeleton, 'block h-3 w-32')} />
                      </span>
                    </li>
                  ))}
                  <li className="sr-only" role="status">Loading</li>
                </ul>
              ) : !hasListings ? (
                <EmptyState
                  title="No listings yet."
                  body="Listing is free. Add photos, a price and where it’s located. Buyers and renters message you through Vendibook, and their offers and bookings show up in your dashboard."
                  action={{ label: 'Create a listing', to: '/dashboard/listings/new' }}
                  secondary={{ label: 'See how pricing works', to: '/pricing' }}
                />
              ) : shown.length === 0 ? (
                emptyForFilter()
              ) : (
                <>
                  <div className={cn(GRID, 'hidden border-b border-[#ECE6DD] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A847B]')} aria-hidden="true">
                    <span>Listing</span>
                    <span className="text-right">Views</span>
                    <span className="text-right">Saves</span>
                    <span className="text-right">Offers</span>
                    <span className="sr-only">Actions</span>
                  </div>
                  <ul className="divide-y divide-[#F1ECE5]">
                    {shown.map((l) => {
                      const featured = isListingFeatured(l as never);
                      const st = listingStatusPill(l.status);
                      const title = l.title?.trim() || 'Untitled listing';
                      const href = l.status === 'published' ? `/listing/${l.id}` : `/dashboard/listings/${l.id}/edit`;
                      const walks = upcomingWalkthroughs(l.id);
                      const paypalOff = paypalReady && l.status === 'published' && l.mode === 'sale' && (l as { accept_paypal_checkout?: boolean | null }).accept_paypal_checkout !== true;
                      const sig = signals.data?.[l.id];
                      return (
                        <li key={l.id} className={cn(GRID, 'px-5 py-4 transition-colors hover:bg-[#FCFAF7] sm:px-6')}>
                          {/* Listing */}
                          <div className="flex min-w-0 items-start gap-3.5 md:items-center">
                            <Link to={href} tabIndex={-1} aria-hidden="true" className="shrink-0">
                              <Thumb src={l.cover_image_url} className="h-16 w-16 md:h-14 md:w-[72px]" />
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link to={href} className="block truncate text-[14px] font-semibold text-[#1C1B1A] hover:underline">{title}</Link>
                              <p className="mt-0.5 truncate text-[12.5px] text-[#8A847B]">
                                <span className="font-semibold text-[#1C1B1A]">{priceLine(l)}</span>
                                {' · '}{l.mode === 'sale' ? 'For sale' : 'For rent'}
                                {l.city ? ` · ${l.city}${l.state ? `, ${l.state}` : ''}` : ''}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                                <StatusPill tone={st.tone}>{st.label}</StatusPill>
                                {featured && (
                                  <StatusPill tone="accent" dot={false}>
                                    <Crown aria-hidden="true" className="h-3 w-3" />
                                    Featured · {featuredDaysRemaining(l as never)}d left
                                  </StatusPill>
                                )}
                                {walks > 0 && (
                                  <Link to="/dashboard/activity?filter=walkthroughs" className="text-[12px] font-semibold text-[#1F6B43] hover:underline">
                                    {walks} upcoming walkthrough{walks === 1 ? '' : 's'}
                                  </Link>
                                )}
                                {paypalOff && (
                                  <Link to="/dashboard/payments/setup" className="text-[12px] font-semibold text-[#7A4F00] hover:underline">
                                    Online payments off
                                  </Link>
                                )}
                              </div>
                              {/* Phones: figures as one line */}
                              <p className="mt-2 text-[12px] tabular-nums text-[#5E5953] md:hidden">
                                {signals.isLoading && signalIds.includes(l.id)
                                  ? 'Loading views…'
                                  : `${formatCount(sig?.views30 ?? null)} views · ${formatCount(sig?.saves ?? null)} saves · ${formatCount(sig?.offersWaiting ?? null)} ${sig?.offersWaiting === 1 ? 'offer' : 'offers'} waiting`}
                              </p>
                            </div>
                          </div>

                          {/* Figures (md+) */}
                          <span className="hidden text-right text-[14px] tabular-nums text-[#1C1B1A] md:block">{signalCell(l.id, 'views30')}</span>
                          <span className="hidden text-right text-[14px] tabular-nums text-[#1C1B1A] md:block">{signalCell(l.id, 'saves')}</span>
                          <span className={cn('hidden text-right text-[14px] tabular-nums md:block', sig?.offersWaiting ? 'font-semibold text-[#FF5124]' : 'text-[#1C1B1A]')}>
                            {sig?.offersWaiting ? <Link to="/dashboard/offers" className="hover:underline">{sig.offersWaiting}</Link> : signalCell(l.id, 'offersWaiting')}
                          </span>

                          {/* Actions */}
                          <div className="mt-3.5 flex flex-wrap items-center gap-2 pl-[78px] md:mt-0 md:flex-nowrap md:justify-end md:pl-0">
                            <Link to={`/dashboard/listings/${l.id}/edit`} className={btn.outline}>
                              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                              {l.status === 'draft' ? 'Continue' : 'Edit'}
                            </Link>
                            {canBoostListing(l as never) && !featured && (
                              <button type="button" className={btn.outline} onClick={() => setBoostTarget({ id: l.id, title: l.title })}>
                                <Crown aria-hidden="true" className="h-3.5 w-3.5 text-[#D4920F]" />
                                Boost
                              </button>
                            )}
                            <ListingRowMenu
                              listing={l}
                              onPause={pauseListing}
                              onResume={unpauseListing}
                              onArchive={archiveListing}
                              onDelete={deleteListing}
                              onShare={() => void share(l.id, l.title)}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            {hasListings && (eligible.length > 0 || counts.featured > 0) && (
              <div className="flex flex-col gap-4 rounded-2xl border border-[#EFE3C8] bg-[#FFFBF2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-[#1C1B1A]">
                    <Crown aria-hidden="true" className="h-4 w-4 text-[#D4920F]" />
                    Featured on Vendibook
                    {counts.featured > 0 && <span className="text-[12.5px] font-medium text-[#8A847B]">· {counts.featured} active</span>}
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-[#5E5953]">
                    A gold Featured badge and dedicated Featured placement for a live listing. Choose one to review boost options and pricing.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                  {counts.featured > 0 && filter !== 'featured' && (
                    <button type="button" onClick={() => setFilter('featured')} className={ws.actionLink}>View Featured</button>
                  )}
                  {eligible.length > 0 && (
                    <button type="button" onClick={startBoost} className={btn.outlineMd}>
                      Boost a listing
                      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {hasListings && (
            <nav aria-label="Listing shortcuts" className="flex flex-wrap gap-x-6 gap-y-3 border-t border-[#ECE6DD] pt-6">
              <Link to="/dashboard/account/scheduling" className={ws.actionLink}>Walkthrough availability</Link>
              <Link to="/dashboard/payments/setup" className={ws.actionLink}>Payment setup</Link>
              <Link to="/dashboard/offers" className={ws.actionLink}>Offers</Link>
              <Link to="/dashboard/activity?filter=listings" className={ws.actionLink}>Listing history</Link>
            </nav>
          )}
        </div>
      </div>

      {boostTarget && (
        <PromoteListingModal
          open={!!boostTarget}
          onOpenChange={(open) => !open && setBoostTarget(null)}
          listingId={boostTarget.id}
          listingTitle={boostTarget.title}
        />
      )}
    </WorkspaceShell>
  );
}
