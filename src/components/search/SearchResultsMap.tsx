import { useEffect, useState, forwardRef, useCallback, memo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow, OverlayView } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_ID } from '@/lib/googleMapsLoader';
import { Listing } from '@/types/listing';
import { Skeleton } from '@/components/ui/skeleton';

interface ListingWithCoords extends Listing {
  latitude?: number | null;
  longitude?: number | null;
}

interface SearchResultsMapProps {
  listings: ListingWithCoords[];
  mapToken: string | null;
  isLoading: boolean;
  error: string | null;
  userLocation?: [number, number] | null; // [lng, lat]
  searchRadius?: number;
  onListingClick?: (listing: ListingWithCoords) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 39.8283, lng: -98.5795 }; // Center of US



// Format price for display
const formatPrice = (listing: ListingWithCoords) => {
  if (listing.mode === 'rent') {
    if (listing.price_hourly) {
      return { amount: `$${listing.price_hourly}`, unit: '/hr' };
    }
    return { amount: `$${listing.price_daily}`, unit: '/day' };
  }
  const salePrice = listing.price_sale || 0;
  return { 
    amount: salePrice >= 1000 ? `$${Math.round(salePrice / 1000)}k` : `$${salePrice.toLocaleString()}`,
    unit: '' 
  };
};

// Custom price marker component
const PriceMarker = ({ 
  listing, 
  isSelected, 
  onClick 
}: { 
  listing: ListingWithCoords; 
  isSelected: boolean;
  onClick: () => void;
}) => {
  const { amount, unit } = formatPrice(listing);

  return (
    <OverlayView
      position={{ lat: listing.latitude!, lng: listing.longitude! }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <button
        onClick={onClick}
        className={`
          transform -translate-x-1/2 -translate-y-full
          px-2.5 py-1.5 rounded-full font-semibold text-xs
          shadow-lg border-2 transition-all duration-200 cursor-pointer
          hover:scale-110 hover:z-50
          ${isSelected 
            ? 'bg-primary text-primary-foreground border-primary scale-110 z-50' 
            : 'bg-white text-foreground border-white hover:border-primary'
          }
        `}
        style={{ 
          boxShadow: isSelected 
            ? '0 4px 14px rgba(0, 0, 0, 0.25)' 
            : '0 2px 8px rgba(0, 0, 0, 0.15)',
          minWidth: '50px',
        }}
      >
        {amount}
        {unit && <span className="text-[10px] opacity-70">{unit}</span>}
      </button>
    </OverlayView>
  );
};

const SearchResultsMapLoaded = forwardRef<
  HTMLDivElement,
  Omit<SearchResultsMapProps, 'mapToken'> & { mapToken: string }
>(
  (
    {
      listings,
      mapToken,
      isLoading: propsLoading,
      error: propsError,
      userLocation,
      searchRadius,
      onListingClick,
    },
    ref
  ) => {
    const [selectedListing, setSelectedListing] = useState<ListingWithCoords | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);

    // Load Google Maps ONLY after we have a valid API key.
    // This component is mounted conditionally (see wrapper below), so the Loader is never
    // instantiated with different options (prevents the "Loader must not be called again" error).
    const { isLoaded, loadError } = useJsApiLoader({
      googleMapsApiKey: mapToken,
      id: GOOGLE_MAPS_LOADER_ID,
      libraries: GOOGLE_MAPS_LIBRARIES,
    });


    // Calculate center based on listings or user location
    const getCenter = useCallback(() => {
      if (userLocation) {
        return { lat: userLocation[1], lng: userLocation[0] };
      }

      const listingsWithCoords = listings.filter(
        (l) => l.latitude != null && l.longitude != null
      );

      if (listingsWithCoords.length > 0) {
        const lngs = listingsWithCoords.map((l) => l.longitude!);
        const lats = listingsWithCoords.map((l) => l.latitude!);
        return {
          lat: (Math.min(...lats) + Math.max(...lats)) / 2,
          lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
        };
      }

      return defaultCenter;
    }, [listings, userLocation]);

    // Calculate zoom based on search radius or listings
    const getZoom = useCallback(() => {
      if (userLocation && searchRadius) {
        return Math.max(6, 12 - Math.log2(searchRadius));
      }
      return userLocation ? 10 : 4;
    }, [userLocation, searchRadius]);

    // Fit bounds to show all listings
    useEffect(() => {
      if (!map || listings.length === 0 || userLocation) return;

      const listingsWithCoords = listings.filter(
        (l) => l.latitude != null && l.longitude != null
      );

      if (listingsWithCoords.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        listingsWithCoords.forEach((l) => {
          bounds.extend({ lat: l.latitude!, lng: l.longitude! });
        });
        map.fitBounds(bounds, 50);
      }
    }, [map, listings, userLocation]);

    const onLoad = useCallback((mapInstance: google.maps.Map) => {
      setMap(mapInstance);
    }, []);

    const onUnmount = useCallback(() => {
      setMap(null);
    }, []);

    const handleMarkerClick = (listing: ListingWithCoords) => {
      setSelectedListing(listing);
      onListingClick?.(listing);
    };

    if (!isLoaded || propsLoading) {
      return (
        <div ref={ref} className="h-full w-full rounded-xl overflow-hidden">
          <Skeleton className="h-full w-full" />
        </div>
      );
    }

    if (loadError || propsError) {
      return (
        <div
          ref={ref}
          className="h-full flex items-center justify-center bg-muted rounded-xl"
        >
          <p className="text-muted-foreground">
            {propsError || 'Failed to load map'}
          </p>
        </div>
      );
    }

    return (
      <div ref={ref} className="relative h-full w-full rounded-xl overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={getCenter()}
          zoom={getZoom()}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: [
              {
                featureType: 'poi.business',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
              {
                featureType: 'poi.attraction',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }],
              },
            ],
          }}
        >
          {/* User location circle */}
          {userLocation && searchRadius && (
            <>
              <Circle
                center={{ lat: userLocation[1], lng: userLocation[0] }}
                radius={searchRadius * 1609.34}
                options={{
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1,
                  strokeColor: '#3b82f6',
                  strokeWeight: 2,
                  strokeOpacity: 0.8,
                }}
              />
              <Marker
                position={{ lat: userLocation[1], lng: userLocation[0] }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#3b82f6',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3,
                }}
                title="Your location"
              />
            </>
          )}

          {/* Custom price markers for listings */}
          {listings.map((listing) => {
            if (listing.latitude == null || listing.longitude == null) return null;
            return (
              <PriceMarker
                key={listing.id}
                listing={listing}
                isSelected={selectedListing?.id === listing.id}
                onClick={() => handleMarkerClick(listing)}
              />
            );
          })}

          {/* Info window for selected listing - Preview card */}
          {selectedListing &&
            selectedListing.latitude &&
            selectedListing.longitude && (
              <InfoWindow
                position={{
                  lat: selectedListing.latitude,
                  lng: selectedListing.longitude,
                }}
                onCloseClick={() => setSelectedListing(null)}
                options={{ pixelOffset: new google.maps.Size(0, -40) }}
              >
                <div className="p-1 max-w-[260px]">
                  {/* Preview Image */}
                  <div className="relative">
                    <img
                      src={
                        selectedListing.cover_image_url ||
                        selectedListing.image_urls?.[0] ||
                        '/placeholder.svg'
                      }
                      alt={selectedListing.title}
                      className="w-full h-36 object-cover rounded-lg"
                    />
                    {/* Mode badge */}
                    <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-medium text-white ${
                      selectedListing.mode === 'rent' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}>
                      {selectedListing.mode === 'rent' ? 'For Rent' : 'For Sale'}
                    </span>
                    {/* Instant book badge */}
                    {selectedListing.mode === 'rent' && selectedListing.instant_book && (
                      <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500 text-white">
                        ⚡ Instant
                      </span>
                    )}
                  </div>
                  
                  {/* Preview Info */}
                  <div className="mt-2">
                    <h3 className="font-bold text-sm line-clamp-1 text-gray-900">
                      {selectedListing.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {selectedListing.address
                        ?.split(',')
                        .slice(-2)
                        .join(',')
                        .trim() || 'Location TBD'}
                    </p>
                    
                    {/* Dynamic pricing */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {selectedListing.mode === 'rent' ? (
                        <>
                          {selectedListing.price_hourly && (
                            <span className="font-bold text-sm" style={{ color: '#FF5722' }}>
                              ${selectedListing.price_hourly}<span className="text-xs font-normal text-gray-500">/hr</span>
                            </span>
                          )}
                          {selectedListing.price_daily && (
                            <span className="font-bold text-sm" style={{ color: '#FF5722' }}>
                              ${selectedListing.price_daily}<span className="text-xs font-normal text-gray-500">/day</span>
                            </span>
                          )}
                          {selectedListing.price_weekly && (
                            <span className="text-xs text-gray-500">
                              ${selectedListing.price_weekly}/wk
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="font-bold text-base" style={{ color: '#FF5722' }}>
                          ${selectedListing.price_sale?.toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    {/* View Details Button */}
                    <button
                      onClick={() => {
                        window.location.href = `/listing/${selectedListing.id}`;
                      }}
                      className="mt-3 w-full py-2 px-4 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                      style={{ backgroundColor: '#FF5722' }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}
        </GoogleMap>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary border-2 border-white shadow" />
            <span className="text-muted-foreground">Listings</span>
          </div>
          {userLocation && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
              <span className="text-muted-foreground">Your Location</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

SearchResultsMapLoaded.displayName = 'SearchResultsMapLoaded';

const SearchResultsMap = forwardRef<HTMLDivElement, SearchResultsMapProps>(
  (props, ref) => {
    // Don’t mount the loader until we have a real key.
    // This guarantees the Loader is created once with a single set of options.
    if (!props.mapToken || props.isLoading) {
      return (
        <div ref={ref} className="h-full w-full rounded-xl overflow-hidden">
          <Skeleton className="h-full w-full" />
        </div>
      );
    }

    return (
      <SearchResultsMapLoaded
        {...props}
        mapToken={props.mapToken}
        ref={ref}
      />
    );
  }
);

SearchResultsMap.displayName = 'SearchResultsMap';

export default memo(SearchResultsMap);

