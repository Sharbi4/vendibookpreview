import { useEffect, useState, useRef, forwardRef, useCallback, useMemo, memo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, Circle, OverlayViewF, MarkerClustererF } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_ID } from '@/lib/googleMapsLoader';
import { Listing } from '@/types/listing';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap } from 'lucide-react';
import IdentityVerifiedBadge from '@/components/verification/IdentityVerifiedBadge';


interface ListingWithCoords extends Listing {
  latitude?: number | null;
  longitude?: number | null;
}

type PositionedListing = ListingWithCoords & { mapLat: number; mapLng: number };

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

/**
 * Spread markers that share (or nearly share) the same coordinates so every
 * listing point stays individually hoverable/clickable instead of stacking.
 */
const spreadOverlappingListings = (listings: ListingWithCoords[]): PositionedListing[] => {
  const buckets = new Map<string, ListingWithCoords[]>();
  listings.forEach((l) => {
    const key = `${l.latitude!.toFixed(4)}|${l.longitude!.toFixed(4)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(l);
    else buckets.set(key, [l]);
  });

  const out: PositionedListing[] = [];
  buckets.forEach((bucket) => {
    if (bucket.length === 1) {
      const l = bucket[0];
      out.push({ ...l, mapLat: l.latitude!, mapLng: l.longitude! });
      return;
    }
    // Deterministic ring layout around the shared point (~35m spacing)
    const radius = 0.00042 * Math.max(1, Math.ceil(bucket.length / 8));
    bucket.forEach((l, i) => {
      const angle = (2 * Math.PI * i) / bucket.length;
      const latScale = Math.max(0.2, Math.cos((l.latitude! * Math.PI) / 180));
      out.push({
        ...l,
        mapLat: l.latitude! + radius * Math.sin(angle),
        mapLng: l.longitude! + (radius * Math.cos(angle)) / latScale,
      });
    });
  });
  return out;
};


const SearchResultsMapLoaded = forwardRef<
  HTMLDivElement,
  Omit<SearchResultsMapProps, 'mapToken'> & { mapToken: string }
>(({ listings, mapToken, isLoading: propsLoading, error: propsError, userLocation, searchRadius, onListingClick }, ref) => {
  const [activeListing, setActiveListing] = useState<PositionedListing | null>(null);
  const [pinned, setPinned] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: mapToken,
    id: GOOGLE_MAPS_LOADER_ID,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const positioned = useMemo(
    () => spreadOverlappingListings(listings.filter((l) => l.latitude != null && l.longitude != null)),
    [listings],
  );

  const fitMapBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map || positioned.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    positioned.forEach((l) => bounds.extend({ lat: l.mapLat, lng: l.mapLng }));
    if (userLocation) bounds.extend({ lat: userLocation[1], lng: userLocation[0] });

    map.fitBounds(bounds, 60);
  }, [positioned, userLocation]);

  // Fit bounds whenever listings change
  useEffect(() => {
    fitMapBounds();
  }, [fitMapBounds]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setTimeout(() => fitMapBounds(), 100);
  }, [fitMapBounds]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openCard = useCallback((listing: PositionedListing) => {
    cancelClose();
    setActiveListing(listing);
    // next frame -> triggers the fade/scale transition
    requestAnimationFrame(() => setCardVisible(true));
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    if (pinned) return;
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setCardVisible(false);
      setTimeout(() => setActiveListing(null), 180);
    }, 160);
  }, [pinned, cancelClose]);

  const closeCard = useCallback(() => {
    cancelClose();
    setPinned(false);
    setCardVisible(false);
    setTimeout(() => setActiveListing(null), 180);
  }, [cancelClose]);

  const handleMarkerClick = (listing: PositionedListing) => {
    setPinned(true);
    openCard(listing);
    mapRef.current?.panTo({ lat: listing.mapLat, lng: listing.mapLng });
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

  return (
    <div ref={ref} className="relative h-full w-full rounded-xl overflow-hidden">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={4}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={closeCard}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
          scrollwheel: true,
          isFractionalZoomEnabled: true,
          maxZoom: 19,
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

        {/* Listing markers with price labels — clustered to prevent overlap */}
        <MarkerClustererF
          options={{
            gridSize: 55,
            maxZoom: 15,
            averageCenter: true,
            zoomOnClick: true,
            styles: [
              {
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><circle cx="22" cy="22" r="20" fill="#FF5722" stroke="#ffffff" stroke-width="3"/></svg>`
                )}`,
                height: 44,
                width: 44,
                textColor: '#ffffff',
                textSize: 13,
                fontWeight: '700',
                anchorText: [0, 0],
              },
              {
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="54" height="54"><circle cx="27" cy="27" r="25" fill="#FF5722" stroke="#ffffff" stroke-width="3"/></svg>`
                )}`,
                height: 54,
                width: 54,
                textColor: '#ffffff',
                textSize: 14,
                fontWeight: '700',
                anchorText: [0, 0],
              },
              {
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="30" fill="#FF5722" stroke="#ffffff" stroke-width="3"/></svg>`
                )}`,
                height: 64,
                width: 64,
                textColor: '#ffffff',
                textSize: 15,
                fontWeight: '700',
                anchorText: [0, 0],
              },
            ],
          }}
        >
          {(clusterer) => (
            <>
              {positioned.map((listing) => {
                const isActive = activeListing?.id === listing.id;
                return (
                  <MarkerF
                    key={listing.id}
                    position={{ lat: listing.mapLat, lng: listing.mapLng }}
                    clusterer={clusterer}
                    zIndex={isActive ? 999 : 1}
                    label={{
                      text: formatPrice(listing),
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '11px',
                    }}
                    icon={{
                      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="36">
                          <rect x="0" y="0" width="80" height="28" rx="14" fill="${isActive ? '#FF5722' : '#1a1a1a'}"/>
                          <polygon points="35,28 40,36 45,28" fill="${isActive ? '#FF5722' : '#1a1a1a'}"/>
                        </svg>`
                      )}`,
                      scaledSize: new google.maps.Size(80, 36),
                      anchor: new google.maps.Point(40, 36),
                      labelOrigin: new google.maps.Point(40, 14),
                    }}
                    onMouseOver={() => { if (!pinned) openCard(listing); }}
                    onMouseOut={scheduleClose}
                    onClick={() => handleMarkerClick(listing)}
                    title={listing.title}
                  />
                );
              })}
            </>
          )}
        </MarkerClustererF>

        {/* Smooth mini listing card */}
        {activeListing && (
          <OverlayViewF
            position={{ lat: activeListing.mapLat, lng: activeListing.mapLng }}
            mapPaneName="floatPane"
            getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h + 44) })}
          >
            <div
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              className={`w-[260px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0d]/95 shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out ${
                cardVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
              }`}
            >
              <div className="relative">
                <img
                  src={activeListing.cover_image_url || activeListing.image_urls?.[0] || '/placeholder.svg'}
                  alt={activeListing.title}
                  loading="lazy"
                  className="h-36 w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                  {activeListing.mode === 'rent' ? 'For Rent' : 'For Sale'}
                </span>
                {activeListing.mode === 'rent' && activeListing.instant_book && (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    <Zap className="h-3 w-3" /> Instant
                  </span>
                )}
              </div>

              <div className="p-3">
                <h3 className="truncate text-sm font-semibold text-white">{activeListing.title}</h3>
                <p className="mt-0.5 truncate text-xs text-white/50">
                  {activeListing.address?.split(',').slice(-2).join(',').trim() || 'Location TBD'}
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                  {activeListing.mode === 'rent' ? (
                    <>
                      {activeListing.price_hourly != null && (
                        <span className="text-sm font-bold text-primary">
                          ${activeListing.price_hourly}<span className="text-xs font-normal text-white/50">/hr</span>
                        </span>
                      )}
                      {activeListing.price_daily != null && (
                        <span className="text-sm font-bold text-primary">
                          ${activeListing.price_daily}<span className="text-xs font-normal text-white/50">/day</span>
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-base font-bold text-primary">
                      ${activeListing.price_sale?.toLocaleString()}
                    </span>
                  )}
                </div>
                <Link
                  to={`/listing/${activeListing.id}`}
                  className="mt-3 block rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground transition-transform duration-150 hover:scale-[1.02]"
                >
                  View more
                </Link>
              </div>
            </div>
          </OverlayViewF>
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
