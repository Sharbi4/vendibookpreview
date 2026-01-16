import { useEffect, useState, forwardRef, useCallback, memo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
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

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: mapToken || '',
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

  if (propsLoading || !mapToken || !isLoaded) {
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
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        }}
      >
        {/* User location circle */}
        {userLocation && searchRadius && (
          <>
            <Circle
              center={{ lat: userLocation[1], lng: userLocation[0] }}
              radius={searchRadius * 1609.34} // Convert miles to meters
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
                scale: 8,
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
              title="Your location"
            />
          </>
        )}

        {/* Listing markers */}
        {listings.map((listing) => {
          if (listing.latitude == null || listing.longitude == null) return null;

          const price =
            listing.mode === 'rent'
              ? `$${listing.price_daily}/day`
              : `$${listing.price_sale?.toLocaleString()}`;

          return (
            <Marker
              key={listing.id}
              position={{ lat: listing.latitude, lng: listing.longitude }}
              onClick={() => handleMarkerClick(listing)}
              label={{
                text: price,
                className: 'bg-background border border-border shadow-lg rounded-full px-2 py-1 text-xs font-semibold',
                color: '#000000',
                fontSize: '12px',
                fontWeight: '600',
              }}
            />
          );
        })}

        {/* Info window for selected listing */}
        {selectedListing && selectedListing.latitude && selectedListing.longitude && (
          <InfoWindow
            position={{ lat: selectedListing.latitude, lng: selectedListing.longitude }}
            onCloseClick={() => setSelectedListing(null)}
          >
            <div className="p-2 max-w-[200px]">
              <img
                src={selectedListing.cover_image_url || selectedListing.image_urls?.[0] || '/placeholder.svg'}
                alt={selectedListing.title}
                className="w-full h-24 object-cover rounded-md mb-2"
              />
              <h3 className="font-semibold text-sm line-clamp-1">{selectedListing.title}</h3>
              <p className="text-xs text-gray-500">
                {selectedListing.address?.split(',').slice(-2).join(',').trim() || 'Location TBD'}
              </p>
              <p className="font-bold text-sm mt-1">
                {selectedListing.mode === 'rent'
                  ? `$${selectedListing.price_daily}/day`
                  : `$${selectedListing.price_sale?.toLocaleString()}`}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
});

SearchResultsMap.displayName = 'SearchResultsMap';

export default memo(SearchResultsMap);
