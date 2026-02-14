import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ListingCard from '@/components/listing/ListingCard';
import ListingPreviewDrawer from '@/components/listing/ListingPreviewDrawer';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Navigation, Map, List, Columns, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import SearchResultsMap from '@/components/search/SearchResultsMap';
import { useGoogleMapsToken } from '@/hooks/useGoogleMapsToken';
import { Listing } from '@/types/listing';
import { useIsMobile } from '@/hooks/use-mobile';

const ITEMS_PER_PAGE = 8;

interface UserLocation {
  latitude: number;
  longitude: number;
}

const FeaturedListings = () => {
  const isMobile = useIsMobile();
  const [sortBy, setSortBy] = useState<'nearest' | 'newest' | 'price-low' | 'price-high'>('nearest');
  const [currentPage, setCurrentPage] = useState(1);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'split'>(() => isMobile === false ? 'split' : 'list');
  const [selectedListing, setSelectedListing] = useState<(Listing & { distance_miles?: number }) | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const navigate = useNavigate();
  const { apiKey: mapToken, isLoading: isMapLoading, error: mapError } = useGoogleMapsToken();

  // Default to split view on desktop once mobile detection resolves
  useEffect(() => {
    if (isMobile === false) setViewMode('split');
  }, [isMobile]);

  // Auto-request location removed - keep only manual "Find nearby" button
  // This prevents unsolicited location prompts which feel invasive (UX audit item #11)

  // Fetch nearby listings from edge function when we have location
  const { data: nearbyData, isLoading: isLoadingNearby } = useQuery({
    queryKey: ['nearby-listings', userLocation?.latitude, userLocation?.longitude],
    queryFn: async () => {
      if (!userLocation) return null;
      
      const { data, error } = await supabase.functions.invoke('get-nearby-listings', {
        body: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius_miles: 500, // Wide radius to get more results
          limit: 100
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!userLocation,
  });

  // Always fetch all listings immediately on page load
  const { data: allListings = [], isLoading: isLoadingAll } = useQuery({
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
    enabled: true, // Always fetch immediately
  });

  // Use nearby listings if available, otherwise fall back to all listings
  const listings = useMemo(() => {
    if (nearbyData?.listings && nearbyData.listings.length > 0) {
      return nearbyData.listings;
    }
    return allListings;
  }, [nearbyData, allListings]);

  // Extract unique host IDs
  const hostIds = useMemo(() => {
    const ids = listings.map(l => l.host_id).filter(Boolean);
    return [...new Set(ids)] as string[];
  }, [listings]);

  // Use host verification from nearby API or fetch separately
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
    enabled: hostIds.length > 0 && !nearbyData?.hostVerificationMap,
  });

  // Create verification map
  const hostVerificationMap = useMemo(() => {
    if (nearbyData?.hostVerificationMap) {
      return nearbyData.hostVerificationMap;
    }
    const map: Record<string, boolean> = {};
    hostProfiles.forEach(profile => {
      map[profile.id] = profile.identity_verified ?? false;
    });
    return map;
  }, [nearbyData?.hostVerificationMap, hostProfiles]);

  const sortedListings = useMemo(() => {
    let result = [...listings];

    // Helper to check if a listing is featured (featured_enabled=true AND featured_expires_at in the future)
    const isFeatured = (listing: any) => 
      listing.featured_enabled && 
      listing.featured_expires_at && 
      new Date(listing.featured_expires_at) > new Date();

    if (sortBy === 'nearest' && userLocation) {
      // Sort by distance but put featured listings first
      result.sort((a, b) => {
        const aFeatured = isFeatured(a);
        const bFeatured = isFeatured(b);
        if (aFeatured && !bFeatured) return -1;
        if (!aFeatured && bFeatured) return 1;
        // Both are featured or both are not - maintain distance order
        return 0;
      });
    } else if (sortBy === 'newest') {
      result.sort((a, b) => {
        const aFeatured = isFeatured(a);
        const bFeatured = isFeatured(b);
        if (aFeatured && !bFeatured) return -1;
        if (!aFeatured && bFeatured) return 1;
        return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
      });
    } else if (sortBy === 'price-low') {
      result.sort((a, b) => {
        const aFeatured = isFeatured(a);
        const bFeatured = isFeatured(b);
        if (aFeatured && !bFeatured) return -1;
        if (!aFeatured && bFeatured) return 1;
        const priceA = a.mode === 'rent' ? (a.price_daily || 0) : (a.price_sale || 0);
        const priceB = b.mode === 'rent' ? (b.price_daily || 0) : (b.price_sale || 0);
        return priceA - priceB;
      });
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => {
        const aFeatured = isFeatured(a);
        const bFeatured = isFeatured(b);
        if (aFeatured && !bFeatured) return -1;
        if (!aFeatured && bFeatured) return 1;
        const priceA = a.mode === 'rent' ? (a.price_daily || 0) : (a.price_sale || 0);
        const priceB = b.mode === 'rent' ? (b.price_daily || 0) : (b.price_sale || 0);
        return priceB - priceA;
      });
    }

    return result;
  }, [listings, sortBy, userLocation]);

  // Reset to page 1 when sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedListings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedListings = sortedListings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequestLocation = () => {
    if ('geolocation' in navigator) {
      setIsRequestingLocation(true);
      setLocationError(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setIsRequestingLocation(false);
          setSortBy('nearest');
        },
        (error) => {
          setLocationError(error.message);
          setIsRequestingLocation(false);
        },
        { timeout: 10000 }
      );
    }
  };

  const handleListingClick = (listing: typeof sortedListings[0]) => {
    // Open drawer for map/split view, navigate directly for list view
    if (viewMode === 'map' || viewMode === 'split') {
      setSelectedListing(listing);
      setDrawerOpen(true);
    } else {
      navigate(`/listing/${listing.id}`);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  // Only show loading for initial listings fetch, not for location request
  const isLoading = isLoadingAll;

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="py-6 bg-background">
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
    <section className="py-8 bg-background">
      <div className="container">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">
                {userLocation ? 'Listings Near You' : 'Featured Listings'}
              </h2>
              {userLocation && (
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  <Navigation className="h-3 w-3" />
                  Location enabled
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {sortedListings.length} listing{sortedListings.length !== 1 ? 's' : ''} available
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
              {userLocation && nearbyData?.listings?.[0]?.distance_miles && (
                <span className="ml-2">
                  • Closest: {nearbyData.listings[0].distance_miles.toFixed(1)} miles away
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none"
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'split' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('split')}
                className="rounded-none hidden lg:flex"
                title="Split view"
              >
                <Columns className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('map')}
                className="rounded-none"
                title="Map view"
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>

            {/* Location button if not enabled */}
            {!userLocation && !locationError && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestLocation}
                className="flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                Find nearby
              </Button>
            )}
            
            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-sm border border-border rounded-lg px-3 py-2 bg-background"
              >
                {userLocation && <option value="nearest">Nearest</option>}
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Split View */}
        {viewMode === 'split' ? (
          <div className="flex gap-6 h-[600px]">
            {/* Listings Panel */}
            <div className="w-1/2 overflow-y-auto pr-2 space-y-4">
              {paginatedListings.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {paginatedListings.map((listing) => (
                      <ListingCard 
                        key={listing.id} 
                        listing={listing} 
                        hostVerified={hostVerificationMap[listing.host_id] ?? false}
                        distanceMiles={listing.distance_miles}
                      />
                    ))}
                  </div>
                  {/* Pagination in split view */}
                  {totalPages > 1 && (
                    <div className="pt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          {getPageNumbers().map((page, index) => (
                            <PaginationItem key={index}>
                              {page === 'ellipsis' ? (
                                <PaginationEllipsis />
                              ) : (
                                <PaginationLink
                                  onClick={() => handlePageChange(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              )}
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 bg-secondary/30 rounded-2xl">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No listings found</h3>
                </div>
              )}
            </div>
            {/* Map Panel */}
            <div className="w-1/2 rounded-xl overflow-hidden border border-border">
              <SearchResultsMap
                listings={sortedListings}
                mapToken={mapToken}
                isLoading={isMapLoading}
                error={mapError}
                userLocation={userLocation ? [userLocation.longitude, userLocation.latitude] : null}
                searchRadius={userLocation ? 100 : undefined}
                onListingClick={handleListingClick}
              />
            </div>
          </div>
        ) : viewMode === 'map' ? (
          /* Map View */
          <div className="h-[500px] rounded-xl overflow-hidden border border-border">
            <SearchResultsMap
              listings={sortedListings}
              mapToken={mapToken}
              isLoading={isMapLoading}
              error={mapError}
              userLocation={userLocation ? [userLocation.longitude, userLocation.latitude] : null}
              searchRadius={userLocation ? 100 : undefined}
              onListingClick={handleListingClick}
            />
          </div>
        ) : (
          /* Listings Grid */
          paginatedListings.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedListings.map((listing) => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing} 
                    hostVerified={hostVerificationMap[listing.host_id] ?? false}
                    distanceMiles={listing.distance_miles}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {getPageNumbers().map((page, index) => (
                        <PaginationItem key={index}>
                          {page === 'ellipsis' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-secondary/30 rounded-2xl">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No listings found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search or filters to find what you're looking for.
              </p>
            </div>
          )
        )}

        {/* Browse All CTA */}
        {sortedListings.length > 0 && (
          <div className="text-center mt-10">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/search')}
              className="gap-2"
            >
              Browse All Listings
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Listing Preview Drawer */}
      <ListingPreviewDrawer
        listing={selectedListing}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        hostVerified={selectedListing ? hostVerificationMap[selectedListing.host_id] ?? false : false}
      />
    </section>
  );
};

export default FeaturedListings;
