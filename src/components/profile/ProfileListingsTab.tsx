import { useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, PlusSquare, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import ListingCard from '@/components/listing/ListingCard';
import { Listing } from '@/types/listing';

interface ProfileListingsTabProps {
  listings: Listing[] | undefined;
  isLoading: boolean;
  isOwnProfile: boolean;
  hostVerified: boolean;
}

// Memoized ListingCard wrapper
const MemoizedListingCard = memo(({ listing, hostVerified }: { listing: Listing; hostVerified: boolean }) => (
  <ListingCard listing={listing} hostVerified={hostVerified} />
));
MemoizedListingCard.displayName = 'MemoizedListingCard';

const ProfileListingsTab = ({ 
  listings, 
  isLoading, 
  isOwnProfile,
  hostVerified 
}: ProfileListingsTabProps) => {
  const [filter, setFilter] = useState<'all' | 'rent' | 'sale'>('all');

  // Check if user has both rental and sale listings
  const hasBothModes = useMemo(() => {
    if (!listings) return false;
    const hasRent = listings.some(l => l.mode === 'rent');
    const hasSale = listings.some(l => l.mode === 'sale');
    return hasRent && hasSale;
  }, [listings]);

  // Filter listings based on selected mode
  const filteredListings = useMemo(() => {
    if (!listings) return [];
    if (filter === 'all') return listings;
    return listings.filter(l => l.mode === filter);
  }, [listings, filter]);

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
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <MapPin className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">No listings yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          {isOwnProfile 
            ? 'Start earning by listing your food truck, trailer, or kitchen. Most hosts publish in under 5 minutes.'
            : 'This user hasn\'t published any listings yet.'}
        </p>
        {isOwnProfile && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild>
              <Link to="/create">
                <PlusSquare className="h-4 w-4 mr-2" />
                Create Listing
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/create?import=true">
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
    <div className="space-y-4">
      {/* Filter toggle - only show if user has both rent and sale listings */}
      {hasBothModes && (
        <div className="flex justify-center">
          <ToggleGroup 
            type="single" 
            value={filter} 
            onValueChange={(value) => value && setFilter(value as 'all' | 'rent' | 'sale')}
            className="bg-muted/50 p-1 rounded-lg"
          >
            <ToggleGroupItem 
              value="all" 
              className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              All
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="rent" 
              className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              For Rent
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="sale" 
              className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              For Sale
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* Listings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredListings.map((listing) => (
          <Link key={listing.id} to={`/listing/${listing.id}`}>
            <MemoizedListingCard listing={listing} hostVerified={hostVerified} />
          </Link>
        ))}
      </div>

      {/* Own profile - add create button at bottom */}
      {isOwnProfile && listings.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" asChild>
            <Link to="/create">
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
