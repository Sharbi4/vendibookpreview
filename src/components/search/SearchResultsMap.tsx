import { useEffect, useRef, useState, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Listing } from '@/types/listing';
import { Skeleton } from '@/components/ui/skeleton';

function getHslCssVar(varName: string, fallback: string) {
  // varName should be like "--primary"
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  // Our design tokens are stored as "H S% L%" so we wrap in hsl(...)
  return raw ? `hsl(${raw})` : fallback;
}

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

const SearchResultsMap = forwardRef<HTMLDivElement, SearchResultsMapProps>((
  {
    listings,
    mapToken,
    isLoading,
    error,
    userLocation,
    searchRadius,
    onListingClick,
  },
  ref
) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const retryTimeoutRef = useRef<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Merge forwarded ref (prevents "Function components cannot be given refs" warnings)
  const setWrapperNode = (node: HTMLDivElement | null) => {
    wrapperRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapToken) return;

    // Wait for container to have dimensions before initializing
    const initializeMap = () => {
      if (!mapContainer.current) return;
      
      const { offsetWidth, offsetHeight } = mapContainer.current;
      if (offsetWidth === 0 || offsetHeight === 0) {
        // Container not ready yet, retry after a short delay
        const retryTimeout = setTimeout(initializeMap, 100);
        return () => clearTimeout(retryTimeout);
      }

      // Clean up existing map if any
      if (map.current) {
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }

      mapboxgl.accessToken = mapToken;

      // Get initial center and zoom
      const listingsWithCoords = listings.filter(
        (l) => l.latitude != null && l.longitude != null
      );
      
      let center: [number, number] = userLocation || [-98.5795, 39.8283]; // Center of US
      let zoom = 4;

      if (userLocation) {
        center = userLocation;
        zoom = searchRadius ? Math.max(6, 12 - Math.log2(searchRadius)) : 10;
      } else if (listingsWithCoords.length > 0) {
        const lngs = listingsWithCoords.map((l) => l.longitude!);
        const lats = listingsWithCoords.map((l) => l.latitude!);
        center = [
          (Math.min(...lngs) + Math.max(...lngs)) / 2,
          (Math.min(...lats) + Math.max(...lats)) / 2,
        ];
        zoom = 5;
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center,
        zoom,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setMapLoaded(true);
        
        // Trigger resize to ensure proper rendering
        setTimeout(() => {
          map.current?.resize();
        }, 100);

        // Add user location circle if available
        if (userLocation && searchRadius && map.current) {
          map.current.addSource('user-radius', {
            type: 'geojson',
            data: createCircleGeoJSON(userLocation, searchRadius),
          });

          map.current.addLayer({
            id: 'user-radius-fill',
            type: 'fill',
            source: 'user-radius',
            paint: {
              'fill-color': '#3b82f6',
              'fill-opacity': 0.1,
            },
          });

          map.current.addLayer({
            id: 'user-radius-outline',
            type: 'line',
            source: 'user-radius',
            paint: {
              'line-color': '#3b82f6',
              'line-width': 2,
              'line-dasharray': [2, 2],
            },
          });

          // Add user location marker
          new mapboxgl.Marker({ color: '#3b82f6' })
            .setLngLat(userLocation)
            .addTo(map.current);
        }
      });
    };

    // Use requestAnimationFrame to wait for layout
    const rafId = requestAnimationFrame(() => {
      initializeMap();
    });

    return () => {
      cancelAnimationFrame(rafId);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [mapToken, listings.length, userLocation, searchRadius]);

  // Update markers when listings change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    listings.forEach((listing) => {
      if (listing.latitude == null || listing.longitude == null) return;

      const price =
        listing.mode === 'rent'
          ? `$${listing.price_daily}/day`
          : `$${listing.price_sale?.toLocaleString()}`;

      const el = document.createElement('div');
      el.className = 'listing-marker';
      el.innerHTML = `
        <div class="bg-background border border-border shadow-lg rounded-full px-2 py-1 text-xs font-semibold cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap">
          ${price}
        </div>
      `;

      el.addEventListener('click', () => {
        onListingClick?.(listing);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([listing.longitude, listing.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
            <div class="p-2 max-w-[200px]">
              <img src="${listing.cover_image_url || listing.image_urls?.[0] || '/placeholder.svg'}" 
                   alt="${listing.title}" 
                   class="w-full h-24 object-cover rounded-md mb-2" />
              <h3 class="font-semibold text-sm line-clamp-1">${listing.title}</h3>
              <p class="text-xs text-muted-foreground">${listing.address?.split(',').slice(-2).join(',').trim() || 'Location TBD'}</p>
              <p class="font-bold text-sm mt-1">${price}</p>
            </div>
          `)
        )
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all listings
    if (listings.length > 0 && !userLocation) {
      const listingsWithCoords = listings.filter(
        (l) => l.latitude != null && l.longitude != null
      );
      if (listingsWithCoords.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        listingsWithCoords.forEach((l) => {
          bounds.extend([l.longitude!, l.latitude!]);
        });
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
      }
    }
  }, [listings, mapLoaded, onListingClick, userLocation]);

  // Update user location circle when search radius changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !userLocation || !searchRadius) return;

    const source = map.current.getSource('user-radius') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(createCircleGeoJSON(userLocation, searchRadius));
    }
  }, [userLocation, searchRadius, mapLoaded]);

  if (isLoading || !mapToken) {
    return (
      <div className="h-full w-full rounded-xl overflow-hidden">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-muted rounded-xl">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div ref={setWrapperNode} className="relative h-full w-full rounded-xl overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
});

SearchResultsMap.displayName = 'SearchResultsMap';
// Helper function to create a GeoJSON circle
function createCircleGeoJSON(
  center: [number, number],
  radiusMiles: number
): GeoJSON.FeatureCollection {
  const radiusKm = radiusMiles * 1.60934;
  const points = 64;
  const coords: [number, number][] = [];

  for (let i = 0; i < points; i++) {
    const angle = (i * 360) / points;
    const dx = radiusKm * Math.cos((angle * Math.PI) / 180);
    const dy = radiusKm * Math.sin((angle * Math.PI) / 180);

    const lat = center[1] + (dy / 111.32);
    const lng = center[0] + (dx / (111.32 * Math.cos((center[1] * Math.PI) / 180)));
    coords.push([lng, lat]);
  }
  coords.push(coords[0]); // Close the polygon

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
        properties: {},
      },
    ],
  };
}

export default SearchResultsMap;
