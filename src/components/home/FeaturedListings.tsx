import { useMemo, useState } from 'react';
import ListingCard from '@/components/listing/ListingCard';
import { mockListings } from '@/data/mockListings';
import { ListingCategory, ListingMode } from '@/types/listing';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeaturedListingsProps {
  filters?: {
    category: ListingCategory | null;
    mode: ListingMode | null;
    query: string;
  };
}

const FeaturedListings = ({ filters }: FeaturedListingsProps) => {
  const [sortBy, setSortBy] = useState<'newest' | 'price-low'>('newest');

  const filteredListings = useMemo(() => {
    let listings = [...mockListings];

    // Filter by mode
    if (filters?.mode) {
      listings = listings.filter(l => l.mode === filters.mode);
    }

    // Filter by category
    if (filters?.category) {
      listings = listings.filter(l => l.category === filters.category);
    }

    // Filter by query (city/state)
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      listings = listings.filter(
        l => l.city.toLowerCase().includes(q) || l.state.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'newest') {
      listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'price-low') {
      listings.sort((a, b) => {
        const priceA = a.mode === 'rent' ? (a.priceDaily || 0) : (a.priceSale || 0);
        const priceB = b.mode === 'rent' ? (b.priceDaily || 0) : (b.priceSale || 0);
        return priceA - priceB;
      });
    }

    return listings;
  }, [filters, sortBy]);

  const getTitle = () => {
    if (filters?.category || filters?.mode || filters?.query) {
      return 'Search Results';
    }
    return 'Featured Listings';
  };

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
              <ListingCard key={listing.id} listing={listing} />
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
