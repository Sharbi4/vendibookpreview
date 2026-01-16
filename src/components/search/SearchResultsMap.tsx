import { useEffect, useState, forwardRef, useCallback, memo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow, OverlayView } from '@react-google-maps/api';
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

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places'];

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
  const price = listing.mode === 'rent'
    ? `$${listing.price_daily}`
    : `$${(listing.price_sale || 0) >= 1000 ? `${Math.round((listing.price_sale || 0) / 1000)}k` : listing.price_sale?.toLocaleString()}`;

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
        {price}
        {listing.mode === 'rent' && <span className="text-[10px] opacity-70">/day</span>}
      </button>
    </OverlayView>
  );
};

const SearchResultsMap = forwardRef<HTMLDivElement, SearchResultsMapProps>((
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
  const [nearbyPlaces, setNearbyPlaces] = useState<google.maps.places.PlaceResult[]>([]);

  // Only load Google Maps when we have a valid API key
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: mapToken || '',
    id: 'google-map-script',
    libraries,
  });

  // Early return if no token yet
  if (!mapToken || propsLoading) {
    return (
      <div ref={ref} className="h-full w-full rounded-xl overflow-hidden">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

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

  // Fetch nearby high-value places when map loads
  useEffect(() => {
    if (!map || !isLoaded) return;

    const service = new google.maps.places.PlacesService(map);
    const center = getCenter();

    // Search for high-value places (stadiums, convention centers, etc.)
    service.nearbySearch(
      {
        location: center,
        radius: 50000, // 50km radius
        type: 'stadium',
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setNearbyPlaces(prev => [...prev, ...results.slice(0, 5)]);
        }
      }
    );

    // Also search for convention centers
    service.nearbySearch(
      {
        location: center,
        radius: 50000,
        keyword: 'convention center',
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setNearbyPlaces(prev => {
            const existing = new Set(prev.map(p => p.place_id));
            const newPlaces = results.filter(r => !existing.has(r.place_id)).slice(0, 3);
            return [...prev, ...newPlaces];
          });
        }
      }
    );

    // Search for fairgrounds
    service.nearbySearch(
      {
        location: center,
        radius: 50000,
        keyword: 'fairgrounds',
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setNearbyPlaces(prev => {
            const existing = new Set(prev.map(p => p.place_id));
            const newPlaces = results.filter(r => !existing.has(r.place_id)).slice(0, 3);
            return [...prev, ...newPlaces];
          });
        }
      }
    );
  }, [map, isLoaded, getCenter]);

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

  if (!isLoaded) {
    return (
      <div ref={ref} className="h-full w-full rounded-xl overflow-hidden">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (loadError || propsError) {
    return (
      <div ref={ref} className="h-full flex items-center justify-center bg-muted rounded-xl">
        <p className="text-muted-foreground">{propsError || 'Failed to load map'}</p>
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

        {/* High-value places markers */}
        {nearbyPlaces.map((place) => {
          if (!place.geometry?.location) return null;
          return (
            <Marker
              key={place.place_id}
              position={place.geometry.location}
              icon={{
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 5,
                fillColor: '#f59e0b',
                fillOpacity: 0.9,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
              title={place.name}
            />
          );
        })}

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

        {/* Info window for selected listing */}
        {selectedListing && selectedListing.latitude && selectedListing.longitude && (
          <InfoWindow
            position={{ lat: selectedListing.latitude, lng: selectedListing.longitude }}
            onCloseClick={() => setSelectedListing(null)}
            options={{ pixelOffset: new google.maps.Size(0, -40) }}
          >
            <div className="p-2 max-w-[220px]">
              <img
                src={selectedListing.cover_image_url || selectedListing.image_urls?.[0] || '/placeholder.svg'}
                alt={selectedListing.title}
                className="w-full h-28 object-cover rounded-lg mb-2"
              />
              <h3 className="font-bold text-sm line-clamp-1">{selectedListing.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedListing.address?.split(',').slice(-2).join(',').trim() || 'Location TBD'}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="font-bold text-base text-primary">
                  {selectedListing.mode === 'rent'
                    ? `$${selectedListing.price_daily}/day`
                    : `$${selectedListing.price_sale?.toLocaleString()}`}
                </p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                  {selectedListing.mode === 'rent' ? 'Rental' : 'For Sale'}
                </span>
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
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-amber-500" />
          </div>
          <span className="text-muted-foreground">High-Value Venues</span>
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
});

SearchResultsMap.displayName = 'SearchResultsMap';

export default memo(SearchResultsMap);
