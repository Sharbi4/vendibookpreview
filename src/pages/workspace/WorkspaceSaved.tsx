import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, Search } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import ListingCard from '@/components/listing/ListingCard';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';

export default function WorkspaceSaved() {
  const { user } = useAuth();
  const { favorites, isLoading: favoritesLoading } = useFavorites();
  const stableKey = [...(favorites ?? [])].sort().join(',');

  const { data: listings = [], isLoading, isError } = useQuery({
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

  const safe = Array.isArray(listings) ? listings : [];
  const busy = favoritesLoading || isLoading;

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <p className="v2-eyebrow">Saved</p>
          <h1>Saved listings</h1>
          <p>
            {favorites.length
              ? `${favorites.length} saved ${favorites.length === 1 ? 'listing' : 'listings'}.`
              : 'Listings you save while browsing show up here.'}
          </p>
        </header>

        {busy ? (
          <div className="v2-listing-grid">
            <div className="v2-skeleton h-64" />
            <div className="v2-skeleton h-64" />
            <div className="v2-skeleton h-64" />
          </div>
        ) : isError ? (
          <div className="v2-empty">
            <Heart />
            <h3>We couldn&apos;t load your saved listings</h3>
            <p>Please refresh the page and try again.</p>
          </div>
        ) : safe.length === 0 ? (
          <div className="v2-empty">
            <Heart />
            <h3>Nothing saved yet</h3>
            <p>Tap the heart on any listing to keep it here for later.</p>
            <Link to="/search" className="v2-btn">
              <Search className="h-4 w-4" />
              Browse the marketplace
            </Link>
          </div>
        ) : (
          <div className="v2-listing-grid">
            {safe.map((listing) => (
              <ListingCard key={listing.id} listing={listing as never} />
            ))}
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
