import { useEffect, useState, useRef, forwardRef, useCallback, memo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, Circle, InfoWindowF } from '@react-google-maps/api';
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
  userLocation?: [number, number] | null;
  searchRadius?: number;
  onListingClick?: (listing: ListingWithCoords) => void;
}

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 39.8283, lng: -98.5795 };

const formatPrice = (listing: ListingWithCoords) => {
  if (listing.mode === 'rent') {
    if (listing.price_hourly) return `$${listing.price_hourly}/hr`;
    return `$${listing.price_daily}/day`;
  }
  const p = listing.price_sale || 0;
  return p >= 1000 ? `$${Math.round(p / 1000)}k` : `$${p}`;
};

const SearchResultsMapLoaded = forwardRef<
  HTMLDivElement,
  Omit<SearchResultsMapProps, 'mapToken'> & { mapToken: string }
>(({ listings, mapToken, isLoading: propsLoading, error: propsError, userLocation, searchRadius, onListingClick }, ref) => {
  const [selectedListing, setSelectedListing] = useState<ListingWithCoords | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: mapToken,
    id: GOOGLE_MAPS_LOADER_ID,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const fitMapBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const withCoords = listings.filter(l => l.latitude != null && l.longitude != null);
    if (withCoords.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    withCoords.forEach(l => bounds.extend({ lat: l.latitude!, lng: l.longitude! }));
    if (userLocation) bounds.extend({ lat: userLocation[1], lng: userLocation[0] });

    map.fitBounds(bounds, 50);
  }, [listings, userLocation]);

  // Fit bounds whenever listings change
  useEffect(() => {
    fitMapBounds();
  }, [fitMapBounds]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Fit bounds on initial load after a small delay to ensure map is ready
    setTimeout(() => {
      const withCoords = listings.filter(l => l.latitude != null && l.longitude != null);
      if (withCoords.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        withCoords.forEach(l => bounds.extend({ lat: l.latitude!, lng: l.longitude! }));
        if (userLocation) bounds.extend({ lat: userLocation[1], lng: userLocation[0] });
        map.fitBounds(bounds, 50);
      }
    }, 100);
  }, [listings, userLocation]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
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
      <div ref={ref} className="h-full flex items-center justify-center bg-muted rounded-xl">
        <p className="text-muted-foreground">{propsError || 'Failed to load map'}</p>
      </div>
    );
  }

  const listingsWithCoords = listings.filter(l => l.latitude != null && l.longitude != null);

  return (
    <div ref={ref} className="relative h-full w-full rounded-xl overflow-hidden">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={4}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: 'poi.business', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi.attraction', elementType: 'labels', stylers: [{ visibility: 'on' }] },
          ],
        }}
      >
        {/* User location */}
        {userLocation && searchRadius && (
          <>
            <Circle
              center={{ lat: userLocation[1], lng: userLocation[0] }}
              radius={searchRadius * 1609.34}
              options={{ fillColor: '#3b82f6', fillOpacity: 0.1, strokeColor: '#3b82f6', strokeWeight: 2, strokeOpacity: 0.8 }}
            />
            <MarkerF
              position={{ lat: userLocation[1], lng: userLocation[0] }}
              icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 }}
              title="Your location"
            />
          </>
        )}

        {/* Listing markers with price labels */}
        {listingsWithCoords.map((listing) => (
          <MarkerF
            key={listing.id}
            position={{ lat: listing.latitude!, lng: listing.longitude! }}
            label={{
              text: formatPrice(listing),
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '11px',
            }}
            icon={{
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="36">
                  <rect x="0" y="0" width="80" height="28" rx="14" fill="${selectedListing?.id === listing.id ? '#FF5722' : '#1a1a1a'}"/>
                  <polygon points="35,28 40,36 45,28" fill="${selectedListing?.id === listing.id ? '#FF5722' : '#1a1a1a'}"/>
                </svg>`
              )}`,
              scaledSize: new google.maps.Size(80, 36),
              anchor: new google.maps.Point(40, 36),
              labelOrigin: new google.maps.Point(40, 14),
            }}
            onClick={() => handleMarkerClick(listing)}
            title={listing.title}
          />
        ))}

        {/* Info window popup */}
        {selectedListing && selectedListing.latitude && selectedListing.longitude && (
          <InfoWindowF
            position={{ lat: selectedListing.latitude, lng: selectedListing.longitude }}
            onCloseClick={() => setSelectedListing(null)}
            options={{ pixelOffset: new google.maps.Size(0, -40) }}
          >
            <div style={{ padding: '4px', maxWidth: '260px', fontFamily: 'system-ui, sans-serif' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={selectedListing.cover_image_url || selectedListing.image_urls?.[0] || '/placeholder.svg'}
                  alt={selectedListing.title}
                  style={{ width: '100%', height: '144px', objectFit: 'cover', borderRadius: '8px' }}
                />
                <span style={{
                  position: 'absolute', top: '8px', left: '8px',
                  fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
                  fontWeight: 500, color: '#fff',
                  backgroundColor: selectedListing.mode === 'rent' ? '#3b82f6' : '#10b981',
                }}>
                  {selectedListing.mode === 'rent' ? 'For Rent' : 'For Sale'}
                </span>
                {selectedListing.mode === 'rent' && selectedListing.instant_book && (
                  <span style={{
                    position: 'absolute', top: '8px', right: '8px',
                    fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
                    fontWeight: 500, backgroundColor: '#f59e0b', color: '#fff',
                  }}>
                    ⚡ Instant
                  </span>
                )}
              </div>
              <div style={{ marginTop: '8px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#111', margin: 0 }}>
                  {selectedListing.title}
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedListing.address?.split(',').slice(-2).join(',').trim() || 'Location TBD'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {selectedListing.mode === 'rent' ? (
                    <>
                      {selectedListing.price_hourly && (
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#FF5722' }}>
                          ${selectedListing.price_hourly}<span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280' }}>/hr</span>
                        </span>
                      )}
                      {selectedListing.price_daily && (
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#FF5722' }}>
                          ${selectedListing.price_daily}<span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280' }}>/day</span>
                        </span>
                      )}
                      {selectedListing.price_weekly && (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>${selectedListing.price_weekly}/wk</span>
                      )}
                    </>
                  ) : (
                    <span style={{ fontWeight: 700, fontSize: '16px', color: '#FF5722' }}>
                      ${selectedListing.price_sale?.toLocaleString()}
                    </span>
                  )}
                </div>
                <a
                  href={`/listing/${selectedListing.id}`}
                  style={{
                    display: 'block', marginTop: '12px', width: '100%', padding: '8px 16px',
                    borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#fff',
                    backgroundColor: '#FF5722', textAlign: 'center', textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  View Details
                </a>
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

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
});

SearchResultsMapLoaded.displayName = 'SearchResultsMapLoaded';

const SearchResultsMap = forwardRef<HTMLDivElement, SearchResultsMapProps>((props, ref) => {
  if (!props.mapToken || props.isLoading) {
    return (
      <div ref={ref} className="h-full w-full rounded-xl overflow-hidden">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }
  return <SearchResultsMapLoaded {...props} mapToken={props.mapToken} ref={ref} />;
});

SearchResultsMap.displayName = 'SearchResultsMap';
export default memo(SearchResultsMap);
