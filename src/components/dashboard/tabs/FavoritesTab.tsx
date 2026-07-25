import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import EmptyState from '../shared/EmptyState';
import SharePopover from '../shared/SharePopover';
import { Heart, HeartOff } from 'lucide-react';
import { toast } from 'sonner';
import { SmartImage } from '@/components/ui/SmartImage';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

const FavoritesTab = () => {
  const { user } = useAuth();
  const { favorites, isLoading: favLoading, toggleFavorite } = useFavorites();
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

  const handleUnsave = (id: string, title: string) => {
    toggleFavorite(id);
    toast('Removed from favorites', {
      description: title,
      action: {
        label: 'Undo',
        onClick: () => toggleFavorite(id),
      },
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Favorites</h1>
        <p className="text-sm text-muted-foreground mt-1">Everything you've saved, ready to share.</p>
      </header>

      {loading ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="rounded-md border border-border bg-card p-3">
              <SkeletonCard variant="listing" />
            </li>
          ))}
        </ul>
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
            <li key={l.id} className="group rounded-md border border-border bg-card overflow-hidden flex flex-col">
              <Link to={`/listing/${l.id}`} className="block overflow-hidden relative">
                <SmartImage
                  src={l.cover_image_url}
                  alt={l.title}
                  aspect="4/3"
                  className="group-hover:scale-[1.02] transition-transform"
                />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUnsave(l.id, l.title); }}
                  aria-label={`Remove ${l.title} from favorites`}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 backdrop-blur border border-border flex items-center justify-center hover:bg-background transition"
                >
                  <HeartOff className="h-3.5 w-3.5 text-destructive" />
                </button>
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
