import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { EmptyState, PageHeader, ws } from '@/components/workspace/ui';
import { FilterTabs } from '@/components/workspace/selling/FilterTabs';
import { LoadError, Thumb } from '@/components/workspace/selling/sellingUi';
import { btn } from '@/components/workspace/selling/buttons';
import { dollars } from '@/components/workspace/selling/format';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Listing = Tables<'listings'>;
type View = 'all' | 'sale' | 'rent';

const priceLine = (l: Listing) => {
  if (l.mode === 'sale') return dollars(l.price_sale) ?? 'Price on request';
  const daily = dollars(l.price_daily);
  return daily ? `${daily} / day` : 'Rate on request';
};

function SavedCard({ listing, onRemove, removing }: { listing: Listing; onRemove: () => void; removing: boolean }) {
  const title = listing.title?.trim() || 'Listing';
  const place = [listing.city, listing.state].filter(Boolean).join(', ');
  return (
    <li className="group flex min-w-0 flex-col">
      <Link to={`/listing/${listing.id}`} className="block overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A]">
        <Thumb src={listing.cover_image_url} className="aspect-[4/3] w-full rounded-xl transition-transform duration-300 [&>img]:transition-transform [&>img]:duration-300 group-hover:[&>img]:scale-[1.03]" />
      </Link>
      <div className="mt-3 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/listing/${listing.id}`} className="block truncate text-[14.5px] font-semibold text-[#1C1B1A] hover:underline">{title}</Link>
          <p className="mt-0.5 truncate text-[12.5px] text-[#8A847B]">
            {listing.mode === 'sale' ? 'For sale' : 'For rent'}
            {place ? ` · ${place}` : ''}
          </p>
          <p className="mt-1.5 text-[15px] font-semibold tabular-nums text-[#1C1B1A]">{priceLine(listing)}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remove ${title} from saved`}
          title="Remove from saved"
          className={cn(btn.icon, 'h-9 w-9 shrink-0')}
        >
          <Heart aria-hidden="true" className="h-4 w-4 fill-[#FF5124] text-[#FF5124]" />
        </button>
      </div>
    </li>
  );
}

export default function WorkspaceSaved() {
  const { user } = useAuth();
  const { favorites, isLoading: favoritesLoading, isError: favoritesError, toggleFavorite, isToggling } = useFavorites();
  const stableKey = [...(favorites ?? [])].sort().join(',');
  const [view, setView] = useState<View>('all');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: listings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['favorite-listings', user?.id, stableKey],
    queryFn: async () => {
      if (!user || favorites.length === 0) return [];
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .in('id', favorites)
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .is('deleted_at', null)
        .eq('moderation_status', 'clear');
      if (error) throw error;
      return filterPubliclyVisible(data ?? []);
    },
    enabled: !!user && favorites.length > 0,
  });

  const safe = (Array.isArray(listings) ? listings : []).filter((l) => favorites.includes(l.id));
  const busy = favoritesLoading || (favorites.length > 0 && isLoading);
  const failed = favoritesError || isError;
  const unavailable = busy || failed ? 0 : Math.max(0, favorites.length - safe.length);
  const forSale = safe.filter((l) => l.mode === 'sale').length;
  const forRent = safe.length - forSale;
  const shown = view === 'all' ? safe : safe.filter((l) => (view === 'sale' ? l.mode === 'sale' : l.mode !== 'sale'));

  const remove = (id: string) => {
    setRemovingId(id);
    toggleFavorite(id);
  };

  const description = busy
    ? 'Loading your saved listings…'
    : safe.length
      ? `${safe.length} saved ${safe.length === 1 ? 'listing' : 'listings'}. Prices and availability are live; open one to message the seller, book or make an offer.`
      : 'Listings you save while browsing show up here, so you can compare and come back to them.';

  return (
    <WorkspaceShell>
      <div className={ws.page}>
        <div className={ws.stack}>
          <PageHeader
            eyebrow="Buying"
            title="Saved"
            description={description}
            actions={safe.length ? <Link to="/search" className={ws.secondary}>Browse the marketplace</Link> : undefined}
          />

          <section aria-label="Saved listings" className="flex flex-col gap-6">
            {forSale > 0 && forRent > 0 && (
              <FilterTabs<View>
                label="Filter saved listings"
                value={view}
                onChange={setView}
                tabs={[
                  { key: 'all', label: 'All', count: safe.length },
                  { key: 'sale', label: 'For sale', count: forSale },
                  { key: 'rent', label: 'For rent', count: forRent },
                ]}
              />
            )}

            {failed ? (
              <div className={cn(ws.surface, 'overflow-hidden')}>
                <LoadError what="saved listings" onRetry={() => void refetch()} />
              </div>
            ) : busy ? (
              <ul aria-busy="true" className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <li key={i}>
                    <span className={cn(ws.skeleton, 'block aspect-[4/3] w-full rounded-xl')} />
                    <span className={cn(ws.skeleton, 'mt-3 block h-4 w-3/4')} />
                    <span className={cn(ws.skeleton, 'mt-2 block h-3 w-1/3')} />
                  </li>
                ))}
                <li className="sr-only" role="status">Loading</li>
              </ul>
            ) : safe.length === 0 ? (
              <div className={cn(ws.surface, 'overflow-hidden')}>
                <EmptyState
                  title={unavailable ? 'Your saved listings are no longer available.' : 'Nothing saved yet.'}
                  body={
                    unavailable
                      ? 'They were sold, paused or removed by the seller. Save new listings with the heart on any listing.'
                      : 'Tap the heart on any listing to keep it here and compare later.'
                  }
                  action={{ label: 'Browse the marketplace', to: '/search' }}
                />
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((listing) => (
                  <SavedCard
                    key={listing.id}
                    listing={listing}
                    onRemove={() => remove(listing.id)}
                    removing={isToggling && removingId === listing.id}
                  />
                ))}
              </ul>
            )}

            {unavailable > 0 && safe.length > 0 && (
              <p className="border-t border-[#ECE6DD] pt-5 text-[13px] leading-5 text-[#8A847B]">
                {unavailable} saved {unavailable === 1 ? 'listing is' : 'listings are'} no longer available (sold, paused or removed) and {unavailable === 1 ? 'is' : 'are'} hidden here.
              </p>
            )}
          </section>
        </div>
      </div>
    </WorkspaceShell>
  );
}
