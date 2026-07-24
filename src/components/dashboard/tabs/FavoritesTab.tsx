import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import EmptyState from '../shared/EmptyState';
import SharePopover from '../shared/SharePopover';
import { Loader2, Heart, Image as ImageIcon } from 'lucide-react';

const FavoritesTab = () => {
  const { user } = useAuth();
  const { favorites, isLoading: favLoading } = useFavorites();
  const stableKey = [...(favorites ?? [])].sort().join(',');

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['favorite-listings-tab', user?.id, stableKey],
    enabled: !!user && favorites.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, cover_image_url, category, city, state, price_per_hour, sale_price_cents')
        .in('id', favorites)
        .eq('status', 'published');
      if (error) throw error;
      return data ?? [];
    },
  });

  const loading = favLoading || isLoading;

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Favorites</h1>
        <p className="text-sm text-muted-foreground mt-1">Everything you've saved, ready to share.</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          description="Tap the heart on any listing to save it here. Great for shortlisting or sharing with a partner."
          ctaLabel="Browse listings"
          ctaHref="/search"
        />
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((l: any) => (
            <li key={l.id} className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
              <Link to={`/listing/${l.id}`} className="block aspect-[4/3] bg-muted overflow-hidden">
                {l.cover_image_url ? (
                  <img src={l.cover_image_url} alt={l.title} loading="lazy"
                    className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </Link>
              <div className="p-3 flex-1 flex flex-col">
                <Link to={`/listing/${l.id}`} className="text-sm font-medium text-foreground line-clamp-1">
                  {l.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[l.city, l.state].filter(Boolean).join(', ') || l.category}
                </p>
                <div className="mt-3 flex items-center justify-end">
                  <SharePopover
                    url={`/share/listing/${l.id}`}
                    title={l.title}
                    text={`Check out ${l.title} on Vendibook`}
                    label=""
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FavoritesTab;
