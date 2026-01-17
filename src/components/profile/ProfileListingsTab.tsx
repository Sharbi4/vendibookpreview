import { useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, PlusSquare, Upload, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ListingCard from '@/components/listing/ListingCard';
import { Listing } from '@/types/listing';

interface ProfileListingsTabProps {
  listings: Listing[] | undefined;
  isLoading: boolean;
  isOwnProfile: boolean;
  hostVerified: boolean;
  hostId?: string;
  onListingClick?: (listingId: string) => void;
}

// Category filter chips
const CATEGORY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'rent', label: 'For Rent' },
  { value: 'sale', label: 'For Sale' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'food_trailer', label: 'Food Trailer' },
  { value: 'ghost_kitchen', label: 'Ghost Kitchen' },
  { value: 'vendor_lot', label: 'Vendor Lot' },
] as const;

type FilterValue = typeof CATEGORY_FILTERS[number]['value'];

// Memoized ListingCard wrapper
const MemoizedListingCard = memo(({ 
  listing, 
  hostVerified,
  onClick 
}: { 
  listing: Listing; 
  hostVerified: boolean;
  onClick?: () => void;
}) => (
  <div onClick={onClick}>
    <ListingCard listing={listing} hostVerified={hostVerified} />
  </div>
));
MemoizedListingCard.displayName = 'MemoizedListingCard';

const ProfileListingsTab = ({ 
  listings, 
  isLoading, 
  isOwnProfile,
  hostVerified,
  hostId,
  onListingClick
}: ProfileListingsTabProps) => {
  const [filter, setFilter] = useState<FilterValue>('all');

  // Get available filters based on listings
  const availableFilters = useMemo(() => {
    if (!listings || listings.length === 0) return ['all'];
    
    const filters = new Set<FilterValue>(['all']);
    listings.forEach(l => {
      if (l.mode === 'rent') filters.add('rent');
      if (l.mode === 'sale') filters.add('sale');
      if (l.category) filters.add(l.category as FilterValue);
    });
    return Array.from(filters);
  }, [listings]);

  // Filter listings
  const filteredListings = useMemo(() => {
    if (!listings) return [];
    if (filter === 'all') return listings;
    if (filter === 'rent' || filter === 'sale') {
      return listings.filter(l => l.mode === filter);
    }
    return listings.filter(l => l.category === filter);
  }, [listings, filter]);

  // Featured listings (max 3) - newest listings
  const featuredListings = useMemo(() => {
    if (!listings || listings.length <= 3) return [];
    
    // Sort by created_at (newest first)
    const sorted = [...listings].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return sorted.slice(0, 3);
  }, [listings]);

  // Check if we should show filters (more than one type available)
  const showFilters = availableFilters.length > 2;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state with CTAs
  if (!listings || listings.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <MapPin className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">No listings yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          {isOwnProfile 
            ? 'Start earning by listing your food truck, trailer, or kitchen. Most hosts publish in under 5 minutes.'
            : 'This host hasn\'t published any listings yet.'}
        </p>
        {isOwnProfile && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild>
              <Link to="/list">
                <PlusSquare className="h-4 w-4 mr-2" />
                Create Listing
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/list?import=true">
                <Upload className="h-4 w-4 mr-2" />
                Import Listing
              </Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Featured Listings Section */}
      {featuredListings.length > 0 && filter === 'all' && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Featured Listings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {featuredListings.map((listing) => (
              <Link 
                key={`featured-${listing.id}`} 
                to={`/listing/${listing.id}`}
                onClick={() => onListingClick?.(listing.id)}
              >
                <MemoizedListingCard 
                  listing={listing} 
                  hostVerified={hostVerified} 
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filter Chips */}
      {showFilters && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {CATEGORY_FILTERS.filter(f => availableFilters.includes(f.value)).map((filterOption) => (
            <Badge
              key={filterOption.value}
              variant={filter === filterOption.value ? 'default' : 'outline'}
              className={`cursor-pointer text-xs px-2.5 py-1 transition-colors ${
                filter === filterOption.value 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'hover:bg-muted'
              }`}
              onClick={() => setFilter(filterOption.value)}
            >
              {filterOption.label}
              {filterOption.value !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({listings.filter(l => {
                    if (filterOption.value === 'rent' || filterOption.value === 'sale') {
                      return l.mode === filterOption.value;
                    }
                    return l.category === filterOption.value;
                  }).length})
                </span>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* All Listings Header */}
      {featuredListings.length > 0 && filter === 'all' && (
        <h3 className="text-sm font-semibold text-foreground">All Listings</h3>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredListings.map((listing) => (
          <Link 
            key={listing.id} 
            to={`/listing/${listing.id}`}
            onClick={() => onListingClick?.(listing.id)}
          >
            <MemoizedListingCard 
              listing={listing} 
              hostVerified={hostVerified} 
            />
          </Link>
        ))}
      </div>

      {/* No results for filter */}
      {filteredListings.length === 0 && filter !== 'all' && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No {CATEGORY_FILTERS.find(f => f.value === filter)?.label.toLowerCase()} listings found.
          </p>
          <Button 
            variant="link" 
            size="sm" 
            onClick={() => setFilter('all')}
            className="mt-2"
          >
            View all listings
          </Button>
        </div>
      )}

      {/* Own profile - add create button at bottom */}
      {isOwnProfile && listings.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" asChild>
            <Link to="/list">
              <PlusSquare className="h-4 w-4 mr-2" />
              Add Another Listing
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProfileListingsTab;