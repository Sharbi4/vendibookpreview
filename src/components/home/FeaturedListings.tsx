import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ListingCard from '@/components/listing/ListingCard';
import { ListingCategory, ListingMode } from '@/types/listing';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface FeaturedListingsProps {
  filters?: {
    category: ListingCategory | null;
    mode: ListingMode | null;
    query: string;
  };
}

const FeaturedListings = ({ filters }: FeaturedListingsProps) => {
  const [sortBy, setSortBy] = useState<'newest' | 'price-low'>('newest');

  // Fetch real listings from the database
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['featured-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Extract unique host IDs from real listings
  const hostIds = useMemo(() => [...new Set(listings.map(l => l.host_id))], [listings]);

  // Fetch host verification status
  const { data: hostProfiles = [] } = useQuery({
    queryKey: ['featured-host-profiles', hostIds],
    queryFn: async () => {
      if (hostIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, identity_verified')
        .in('id', hostIds);
      if (error) throw error;
      return data;
    },
    enabled: hostIds.length > 0,
  });

  // Create a map of host_id -> identity_verified
  const hostVerificationMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    hostProfiles.forEach(profile => {
      map[profile.id] = profile.identity_verified ?? false;
    });
    return map;
  }, [hostProfiles]);

  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Filter by mode
    if (filters?.mode) {
      result = result.filter(l => l.mode === filters.mode);
    }

    // Filter by category
    if (filters?.category) {
      result = result.filter(l => l.category === filters.category);
    }

    // Filter by query (location text or address)
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        l => (l.pickup_location_text?.toLowerCase().includes(q)) || 
             (l.address?.toLowerCase().includes(q)) ||
             (l.title?.toLowerCase().includes(q)) ||
             (l.description?.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime());
    } else if (sortBy === 'price-low') {
      result.sort((a, b) => {
        const priceA = a.mode === 'rent' ? (a.price_daily || 0) : (a.price_sale || 0);
        const priceB = b.mode === 'rent' ? (b.price_daily || 0) : (b.price_sale || 0);
        return priceA - priceB;
      });
    }

    return result;
  }, [listings, filters, sortBy]);

  const getTitle = () => {
    if (filters?.category || filters?.mode || filters?.query) {
      return 'Search Results';
    }
    return 'Featured Listings';
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="py-12 bg-background">
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-background">
      <div className="container">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{getTitle()}</h2>
            <p className="text-muted-foreground mt-1">
              {filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''} available
            </p>
          </div>
          
          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'price-low')}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-background"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
            </select>
          </div>
        </div>

        {/* Listings Grid */}
        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((listing) => (
              <ListingCard 
                key={listing.id} 
                listing={listing} 
                hostVerified={hostVerificationMap[listing.host_id] ?? false}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-secondary/30 rounded-2xl">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No listings found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* View All Button */}
        {filteredListings.length > 8 && (
          <div className="mt-10 text-center">
            <Button variant="outline" size="lg" className="rounded-full gap-2">
              View All Listings
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedListings;
