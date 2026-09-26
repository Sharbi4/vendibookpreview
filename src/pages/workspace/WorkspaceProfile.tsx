import { Link } from 'react-router-dom';
import { CheckCircle2, Image as ImageIcon } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import MessageBuyerButton from '@/components/workspace/MessageBuyerButton';
import { useAuth } from '@/contexts/AuthContext';
import { useHostListings } from '@/hooks/useHostListings';
import { useSellerSoldItems } from '@/hooks/useSellerSoldItems';

const money = (value?: number | null) =>
  value == null
    ? null
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function WorkspaceProfile() {
  const { user, profile } = useAuth();
  const { listings, isLoading: listingsLoading } = useHostListings();
  const { data: sold = [], isLoading: soldLoading } = useSellerSoldItems();


  const name = profile?.full_name || user?.email || 'Your profile';
  const live = listings.filter((l) => l.status === 'published');

  const live = listings.filter((l) => l.status === 'published');


  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading v2-heading-action">
          <div>
            <p className="v2-eyebrow">Seller profile</p>
            <h1>{name}</h1>
            <p>
              {live.length} live listing{live.length === 1 ? '' : 's'} · {sold.length} sold
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/dashboard/account" className="v2-btn-outline">
              Edit profile
            </Link>
          </div>
        </header>


        <section className="v2-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Listings</h2>
            <Link to="/dashboard/listings" className="text-sm font-semibold underline underline-offset-4">
              Manage listings
            </Link>
          </div>

          {listingsLoading ? (
            <div className="v2-listing-grid mt-4">
              {[0, 1, 2].map((i) => (
                <div className="v2-skeleton h-44 w-full" key={i} />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">
              You don&apos;t have any listings yet.{' '}
              <Link to="/dashboard/listings/new" className="font-semibold underline underline-offset-4">
                Create your first one
              </Link>
              .
            </p>
          ) : (
            <div className="v2-listing-grid mt-4">
              {listings.slice(0, 6).map((listing) => (
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
                    <h3 className="text-sm font-semibold">{listing.title}</h3>
                    <strong className="v2-price">
                      {listing.mode === 'sale'
                        ? (money(listing.price_sale) ?? 'Price not set')
                        : money(listing.price_daily)
                          ? `${money(listing.price_daily)}/day`
                          : 'Rate not set'}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="v2-panel p-5">
          <h2 className="text-base font-semibold">Sold items</h2>
          {soldLoading ? (
            <div className="mt-4 space-y-2">
              {[0, 1].map((i) => (
                <div className="v2-skeleton h-16 w-full" key={i} />
              ))}
            </div>
          ) : sold.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-3">
              Completed sales will appear here once a sale finishes.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sold.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3"
                >
                  <div className="h-14 w-20 overflow-hidden rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {item.coverImageUrl ? (
                      <img
                        src={item.coverImageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-[10rem] flex-1">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-600" />
                      Sold {shortDate(item.soldAt)}
                      {item.buyerName ? ` · ${item.buyerName}` : ''}
                      {money(item.amount) ? ` · ${money(item.amount)}` : ''}
                    </p>
                  </div>
                  <MessageBuyerButton listingId={item.listingId} buyerId={item.buyerId} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
