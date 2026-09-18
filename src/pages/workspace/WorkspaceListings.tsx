import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CreditCard, Eye, Image as ImageIcon, Megaphone, Pencil, Plus, Share2, Video } from 'lucide-react';
import { toast } from 'sonner';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import PayPalReadyBadge from '@/components/workspace/PayPalReadyBadge';
import { useHostListings } from '@/hooks/useHostListings';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
import { PromoteListingModal } from '@/components/dashboard/PromoteListingModal';
import { isListingFeatured } from '@/lib/featured';
import { useVideoWalkthroughs } from '@/hooks/useVideoWalkthroughs';
import SellerBusinessAccountHelp from '@/components/payments/SellerBusinessAccountHelp';

type StatusFilter = 'all' | 'published' | 'draft' | 'paused' | 'archived';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Live' },
  { key: 'draft', label: 'Drafts' },
  { key: 'paused', label: 'Paused' },
  { key: 'archived', label: 'Archived' },
];

const money = (value?: number | null) =>
  value == null
    ? null
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);

export default function WorkspaceListings() {
  const { listings, isLoading } = useHostListings();
  const { isReady: paypalReady } = useMyPayPalConnection();
  const { walkthroughs } = useVideoWalkthroughs();
  const [searchParams, setSearchParams] = useSearchParams();
  const [boostTarget, setBoostTarget] = useState<{ id: string; title: string } | null>(null);
  const boostHandled = useRef(false);

  const statusParam = (searchParams.get('status') as StatusFilter) || 'all';
  const [filter, setFilter] = useState<StatusFilter>(
    FILTERS.some((f) => f.key === statusParam) ? statusParam : 'all',
  );

  // Email campaign deep link: /dashboard/listings?boost=<listing_id>
  useEffect(() => {
    const boostId = searchParams.get('boost');
    if (!boostId || boostHandled.current || isLoading) return;
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
    if (listing.status !== 'published') {
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
      published: listings.filter((l) => l.status === 'published').length,
      draft: listings.filter((l) => l.status === 'draft').length,
      paused: listings.filter((l) => l.status === 'paused').length,
      archived: listings.filter((l) => l.status === 'archived').length,
    }),
    [listings],
  );

  const shown = filter === 'all' ? listings : listings.filter((l) => l.status === filter);

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

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading v2-heading-action">
          <div>
            <p className="v2-eyebrow">Seller control center</p>
            <h1>My listings</h1>
            <p>
              {counts.published} live · {counts.draft} draft{counts.draft === 1 ? '' : 's'} ·{' '}
              {counts.paused} paused
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <PayPalReadyBadge />
            <Link to="/dashboard/listings/new" className="v2-btn">
              <Plus />
              List an asset
            </Link>
          </div>
        </header>

        <div className="v2-filter-row">
          {FILTERS.filter((f) => f.key === 'all' || counts[f.key] > 0).map((f) => (
            <button
              key={f.key}
              type="button"
              className={`v2-filter${filter === f.key ? ' is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="v2-listing-grid">
            {[0, 1, 2].map((i) => (
              <div className="v2-listing-card" key={i}>
                <div className="v2-skeleton h-44 w-full" />
                <div className="v2-listing-body">
                  <div className="v2-skeleton h-4 w-3/4" />
                  <div className="v2-skeleton h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="v2-card v2-empty">
            <h2>{listings.length ? 'Nothing in this view' : 'Start your first listing'}</h2>
            <p>List a truck, trailer, mobile kitchen, equipment, or vendor space.</p>
            <Link to="/dashboard/listings/new" className="v2-btn">
              Create a listing
            </Link>
          </div>
        ) : (
          <div className="v2-listing-grid">
            {shown.map((listing) => {
              const featured = isListingFeatured(listing as never);
              const rate =
                listing.mode === 'sale'
                  ? money(listing.price_sale) ?? 'Price not set'
                  : money(listing.price_daily)
                    ? `${money(listing.price_daily)}/day`
                    : 'Rate not set';
              return (
                <article className="v2-listing-card" key={listing.id}>
                  <div className="v2-listing-image">
                    {listing.cover_image_url ? (
                      <img src={listing.cover_image_url} alt={listing.title} loading="lazy" />
                    ) : (
                      <ImageIcon aria-label="No listing image yet" />
                    )}
                    <span className="v2-listing-status">{listing.status}</span>
                  </div>
                  <div className="v2-listing-body">
                    <div>
                      <h2>{listing.title}</h2>
                      <p>
                        {listing.city}
                        {listing.state ? `, ${listing.state}` : ''} ·{' '}
                        {listing.mode === 'sale' ? 'For sale' : 'For rent'}
                      </p>
                    </div>
                    <strong className="v2-price">{rate}</strong>
                    <div className="v2-listing-stats flex flex-wrap gap-2">
                      <span>{listing.view_count ?? 0} views</span>
                      {featured && <span className="v2-status">Featured</span>}
                      {walkthroughs.filter(w=>w.listing_id===listing.id&&['scheduled','rescheduled'].includes(w.status)&&+new Date(w.ends_at)>Date.now()).length>0 && <Link className="v2-status is-ok" to="/dashboard/activity?filter=walkthroughs">{walkthroughs.filter(w=>w.listing_id===listing.id&&['scheduled','rescheduled'].includes(w.status)&&+new Date(w.ends_at)>Date.now()).length} upcoming walkthroughs</Link>}
                      {listing.status === 'published' && !paypalReady && (
                        <span className="v2-status is-warn">Online payments not set up</span>
                      )}
                      {paypalReady &&
                        ((listing as { accept_paypal_checkout?: boolean | null })
                          .accept_paypal_checkout === true ? (
                          <span className="v2-status is-ok">Online payments on</span>
                        ) : (
                          <Link to="/dashboard/payments/setup" className="v2-status is-warn">
                            Online payments off
                          </Link>
                        ))}
                    </div>
                    <div className="v2-listing-actions">
                      <Link className="v2-btn v2-btn-sm" to={`/listing/${listing.id}`}>
                        <Eye />
                        View
                      </Link>
                      <Link
                        className="v2-btn-outline v2-btn-sm"
                        to={`/dashboard/listings/${listing.id}/edit`}
                      >
                        <Pencil />
                        {listing.status === 'draft' ? 'Continue' : 'Edit'}
                      </Link>
                      {listing.status === 'published' && !featured && (
                        <button
                          type="button"
                          className="v2-btn-outline v2-btn-sm"
                          onClick={() => setBoostTarget({ id: listing.id, title: listing.title })}
                        >
                          <Megaphone />
                          Promote
                        </button>
                      )}
                      <button
                        type="button"
                        className="v2-btn-quiet"
                        onClick={() => share(listing.id, listing.title)}
                      >
                        <Share2 />
                        Share
                      </button>
                      {!paypalReady && (
                        <Link className="v2-btn-quiet" to="/dashboard/payments">
                          <CreditCard />
                          Payment setup
                        </Link>
                      )}
                      <Link className="v2-btn-quiet" to="/dashboard/account"><Video/> Walkthrough availability</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
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
