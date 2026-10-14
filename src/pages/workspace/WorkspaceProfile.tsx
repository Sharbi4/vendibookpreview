import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import MessageBuyerButton from '@/components/workspace/MessageBuyerButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  EmptyState,
  PageHeader,
  Panel,
  SimpleTable,
  StatGrid,
  StatTile,
  StatusPill,
  formatCents,
  formatDay,
  listingStatusPill,
  metric,
  ws,
  type SimpleColumn,
} from '@/components/workspace/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useHostListings } from '@/hooks/useHostListings';
import { useSellerSoldItems, type SellerSoldItem } from '@/hooks/useSellerSoldItems';
import { getDisplayInitials } from '@/lib/displayName';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;

const dollars = (n?: number | null) => (typeof n === 'number' && Number.isFinite(n) ? formatCents(Math.round(n * 100)) : null);

const listingPrice = (l: Listing) => {
  if (l.mode === 'sale') return dollars(l.price_sale) ?? 'Price not set';
  const daily = dollars(l.price_daily);
  return daily ? `${daily}/day` : 'Rate not set';
};

const SHOWN = 6;
/** useSellerSoldItems reads at most this many completed sales. */
const SOLD_CAP = 24;

export default function WorkspaceProfile() {
  const { user, profile } = useAuth();
  const hostListings = useHostListings();
  const soldQ = useSellerSoldItems();
  const sold = useMemo(() => soldQ.data ?? [], [soldQ.data]);

  const listings = hostListings.listings;
  const active = useMemo(() => listings.filter((l) => l.status !== 'archived'), [listings]);
  const live = active.filter((l) => l.status === 'published');
  const drafts = active.filter((l) => l.status === 'draft');
  const soldTotal = sold.reduce((sum, s) => sum + (typeof s.amount === 'number' ? s.amount : 0), 0);
  const soldAllPriced = sold.every((s) => typeof s.amount === 'number');

  const name = profile?.full_name || user?.email || 'Your profile';
  const initials = getDisplayInitials({ full_name: profile?.full_name ?? '' });
  const listingsState = { loading: hostListings.isLoading, error: hostListings.isError };
  const soldState = { loading: soldQ.isLoading, error: soldQ.isError };

  const soldColumns: SimpleColumn<SellerSoldItem>[] = [
    {
      key: 'item',
      header: 'Item',
      cell: (s) => (
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#F3EEE7]">
            {s.coverImageUrl
              ? <img src={s.coverImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              : <ImageIcon aria-hidden="true" className="h-4 w-4 text-[#8A847B]" />}
          </span>
          <span className="min-w-0">
            <span className="block max-w-[260px] truncate font-semibold">{s.title}</span>
            <span className="block text-[12.5px] text-[#8A847B] sm:hidden">Sold {formatDay(s.soldAt)}{dollars(s.amount) ? ` · ${dollars(s.amount)}` : ''}</span>
          </span>
        </span>
      ),
    },
    { key: 'date', header: 'Sold', hideBelow: 'sm', cell: (s) => <span className="whitespace-nowrap text-[#5E5953]">{formatDay(s.soldAt)}</span> },
    { key: 'buyer', header: 'Buyer', hideBelow: 'md', cell: (s) => <span className="text-[#5E5953]">{s.buyerName ?? '—'}</span> },
    { key: 'amount', header: 'Amount', align: 'right', hideBelow: 'sm', cell: (s) => <span className="font-semibold">{dollars(s.amount) ?? '—'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      srOnlyHeader: true,
      align: 'right',
      cell: (s) => <MessageBuyerButton listingId={s.listingId} buyerId={s.buyerId} label="Message" />,
    },
  ];

  return (
    <WorkspaceShell>
      <div className={ws.page}>
        <div className={ws.stack}>
          <PageHeader
            eyebrow="Seller profile"
            title={
              <span className="flex items-center gap-4">
                <Avatar className="h-12 w-12 shrink-0 sm:h-14 sm:w-14">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="" className="object-cover" />
                  <AvatarFallback className="bg-[#F3EEE7] text-[16px] font-semibold text-[#1C1B1A]">{initials}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 break-words">{name}</span>
              </span>
            }
            description="Your storefront at a glance: what’s live, what’s in progress and what you’ve sold."
            actions={
              <>
                <Link to={`/u/${user?.id ?? ''}`} className={ws.secondary}>View public profile</Link>
                <Link to="/dashboard/account#profile" className={ws.secondary}>Edit profile</Link>
              </>
            }
          />

          <StatGrid label="Storefront">
            <StatTile to="/dashboard/listings" label="Live listings" value={metric(live.length, listingsState)} sub="Visible to buyers now" />
            <StatTile to="/dashboard/listings" label="Drafts" value={metric(drafts.length, listingsState)} sub={drafts.length ? 'Finish to publish' : 'Nothing in progress'} />
            <StatTile label="Completed sales" value={soldState.loading ? undefined : sold.length >= SOLD_CAP ? `${SOLD_CAP}+` : metric(sold.length, soldState)} sub="Recorded on Vendibook" />
            <StatTile
              label="Sold value"
              format="cents"
              value={soldState.loading ? undefined : soldState.error || !soldAllPriced ? null : Math.round(soldTotal * 100)}
              sub={!sold.length ? 'No completed sales yet' : sold.length >= SOLD_CAP ? `Your ${SOLD_CAP} most recent sales` : 'Sum of completed sale prices'}
            />
          </StatGrid>

          <section aria-labelledby="profile-listings">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 id="profile-listings" className={ws.sectionTitle}>Listings</h2>
                {!hostListings.isLoading && !hostListings.isError && (
                  <p className={ws.sectionNote + ' mt-1'}>
                    {active.length > SHOWN ? `Showing ${SHOWN} of ${active.length}` : `${active.length} listing${active.length === 1 ? '' : 's'}`}
                  </p>
                )}
              </div>
              <Link to="/dashboard/listings" className={ws.actionLink}>Manage listings<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
            </div>

            {hostListings.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => <div key={i} className={ws.skeleton + ' h-[230px] rounded-2xl'} />)}
              </div>
            ) : hostListings.isError ? (
              <div className={ws.surface}>
                <EmptyState compact className="px-5 py-5 sm:px-6" title="Your listings couldn’t be loaded." body="Nothing has changed on them." action={{ label: 'Open listings', to: '/dashboard/listings' }} />
              </div>
            ) : active.length === 0 ? (
              <div className={ws.surface}>
                <EmptyState title="No listings yet." body="Listing is free. Add photos, a price and where it’s located, and buyers can find you." action={{ label: 'Create a listing', to: '/dashboard/listings/new' }} />
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {active.slice(0, SHOWN).map((l) => {
                  const st = listingStatusPill(l.status);
                  return (
                    <li key={l.id} className={ws.surface + ' overflow-hidden'}>
                      <Link to={`/dashboard/listings/${l.id}/edit`} className="group flex items-start sm:block">
                        <span className="relative block aspect-square w-24 shrink-0 overflow-hidden bg-[#F3EEE7] max-sm:m-3 max-sm:rounded-xl sm:aspect-[4/3] sm:w-auto">
                          {l.cover_image_url
                            ? <img src={l.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                            : <span className="grid h-full place-items-center"><ImageIcon aria-hidden="true" className="h-5 w-5 text-[#8A847B]" /></span>}
                          <span className="absolute left-2.5 top-2.5 hidden sm:flex"><StatusPill tone={st.tone} className="bg-white/95 shadow-[0_1px_2px_rgba(28,27,26,0.12)] ring-0">{st.label}</StatusPill></span>
                        </span>
                        <span className="block min-w-0 flex-1 py-3 pr-3 sm:px-4 sm:py-4">
                          <span className="mb-1 flex sm:hidden"><StatusPill tone={st.tone}>{st.label}</StatusPill></span>
                          <span className="block truncate text-[14px] font-semibold group-hover:underline">{l.title?.trim() || 'Untitled listing'}</span>
                          <span className="mt-0.5 block text-[13px] text-[#5E5953]">{listingPrice(l)}</span>
                          <span className="mt-1.5 block text-[12px] text-[#8A847B]">{l.status === 'draft' ? 'Finish draft' : 'Edit listing'}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <Panel title="Sold items" description="Completed sales. Message a buyer about pickup, title or follow-up." flush>
            <SimpleTable
              caption="Sold items"
              columns={soldColumns}
              rows={sold}
              rowKey={(s) => s.id}
              loading={soldQ.isLoading}
              empty={
                <EmptyState
                  compact
                  className="px-5 py-5 sm:px-6"
                  title="No completed sales yet."
                  body="Sales appear here once a buyer’s purchase is complete."
                  action={{ label: 'Review offers', to: '/dashboard/offers' }}
                />
              }
            />
          </Panel>
        </div>
      </div>
    </WorkspaceShell>
  );
}
