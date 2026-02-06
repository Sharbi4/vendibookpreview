import { useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, PlusSquare, Upload, Loader2, Sparkles, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ListingCard from '@/components/listing/ListingCard';
import SoldListingsSection from './SoldListingsSection';
import { Listing } from '@/types/listing';

interface ProfileListingsTabProps {
  listings: Listing[] | undefined;
  isLoading: boolean;
  isOwnProfile: boolean;
  hostVerified: boolean;
  hostId?: string;
  onListingClick?: (listingId: string) => void;
  soldListings?: Listing[];
  soldListingsLoading?: boolean;
  pinnedListingId?: string | null;
}

// Category filter chips
const CATEGORY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'rent', label: 'For Rent' },
  { value: 'sale', label: 'For Sale' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'food_trailer', label: 'Food Trailer' },
  { value: 'ghost_kitchen', label: 'Shared Kitchen' },
  { value: 'vendor_lot', label: 'Vendor Space' },
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
  onListingClick,
  soldListings,
  soldListingsLoading,
  pinnedListingId
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

  // Pinned listing (if set)
  const pinnedListing = useMemo(() => {
    if (!pinnedListingId || !listings) return null;
    return listings.find(l => l.id === pinnedListingId);
  }, [listings, pinnedListingId]);

  // Featured listings (max 3) - newest listings, excluding pinned
  const featuredListings = useMemo(() => {
    if (!listings || listings.length <= 3) return [];
    
    // Sort by created_at (newest first), exclude pinned
    const sorted = [...listings]
      .filter(l => l.id !== pinnedListingId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return sorted.slice(0, 3);
  }, [listings, pinnedListingId]);

  // Check if we should show filters (more than one type available)
  const showFilters = availableFilters.length > 2;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state with CTAs
  if (!listings || listings.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-muted flex items-center justify-center">
          <MapPin className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <h3 className="font-medium text-sm text-foreground mb-1">No listings yet</h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
          {isOwnProfile 
            ? 'List your food truck, trailer, or kitchen. Most hosts publish in under 5 minutes.'
            : 'This host hasn\'t published any listings yet.'}
        </p>
        {isOwnProfile && (
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" asChild className="h-8 text-xs rounded-lg">
              <Link to="/list">
                <PlusSquare className="h-3.5 w-3.5 mr-1" />
                Create Listing
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs rounded-lg">
              <Link to="/list?import=true">
                <Upload className="h-3.5 w-3.5 mr-1" />
                Import
              </Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pinned Listing */}
      {pinnedListing && filter === 'all' && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Pin className="h-3.5 w-3.5 text-primary" />
            Pinned
          </h3>
          <Link 
            to={`/listing/${pinnedListing.id}`}
            onClick={() => onListingClick?.(pinnedListing.id)}
          >
            <MemoizedListingCard listing={pinnedListing} hostVerified={hostVerified} />
          </Link>
        </div>
      )}

      {/* Featured Listings Section */}
      {featuredListings.length > 0 && filter === 'all' && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Featured
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
        <div className="flex flex-wrap gap-1 pb-0.5">
          {CATEGORY_FILTERS.filter(f => availableFilters.includes(f.value)).map((filterOption) => (
            <Badge
              key={filterOption.value}
              variant={filter === filterOption.value ? 'default' : 'outline'}
              className={`cursor-pointer text-[10px] px-2 py-0.5 rounded-md transition-colors ${
                filter === filterOption.value 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'border-border hover:bg-muted'
              }`}
              onClick={() => setFilter(filterOption.value)}
            >
              {filterOption.label}
              {filterOption.value !== 'all' && (
                <span className="ml-0.5 opacity-70">
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
        <h3 className="text-xs font-semibold text-foreground">All Listings</h3>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground">
            No {CATEGORY_FILTERS.find(f => f.value === filter)?.label.toLowerCase()} listings.
          </p>
          <Button 
            variant="link" 
            size="sm" 
            onClick={() => setFilter('all')}
            className="mt-1 h-auto p-0 text-xs"
          >
            View all
          </Button>
        </div>
      )}

      {/* Sold Listings Section */}
      {soldListings && soldListings.length > 0 && (
        <SoldListingsSection listings={soldListings} isLoading={soldListingsLoading} />
      )}

      {/* Own profile - add create button at bottom */}
      {isOwnProfile && listings.length > 0 && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" asChild className="h-8 text-xs rounded-lg">
            <Link to="/list">
              <PlusSquare className="h-3.5 w-3.5 mr-1" />
              Add Listing
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProfileListingsTab;