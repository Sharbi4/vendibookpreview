import React, { useState, useEffect, useCallback, memo } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useGoogleMapsToken } from '@/hooks/useGoogleMapsToken';
import { cn } from '@/lib/utils';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_ID } from '@/lib/googleMapsLoader';


interface ListingLocationMapProps {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  className?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Inner component that only renders when API key is available
const ListingLocationMapInner = memo(({
  address,
  city,
  state,
  zipCode,
  latitude,
  longitude,
  className,
  apiKey,
}: ListingLocationMapProps & { apiKey: string }) => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: GOOGLE_MAPS_LOADER_ID,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const providedCoordinates = React.useMemo(() => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { lat: latitude, lng: longitude };
  }, [latitude, longitude]);


  // Build location string from available data
  const locationString = React.useMemo(() => {
    if (address) return address;
    const parts: string[] = [];
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (zipCode) parts.push(zipCode);
    return parts.length > 0 ? parts.join(', ') + ', USA' : null;
  }, [address, city, state, zipCode]);

  // Geocode the location
  const geocodeLocation = useCallback(async () => {
    if (providedCoordinates) {
      setCoordinates(providedCoordinates);
      setGeocodeError(null);
      setIsGeocoding(false);
      return;
    }

    if (!locationString || !isLoaded) return;

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: locationString });

      if (result.results && result.results.length > 0) {
        const location = result.results[0].geometry.location;
        setCoordinates({
          lat: location.lat(),
          lng: location.lng(),
        });
      } else {
        setGeocodeError('Location not found');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setGeocodeError('Could not load map');
    } finally {
      setIsGeocoding(false);
    }
  }, [locationString, isLoaded, providedCoordinates]);

  useEffect(() => {
    geocodeLocation();
  }, [geocodeLocation]);

  // Loading state
  const mapCoordinates = providedCoordinates ?? coordinates;

  if (!isLoaded || (!providedCoordinates && isGeocoding)) {
    return (
      <div className={cn('rounded-xl border border-border bg-muted/30 flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading map...</span>
        </div>
      </div>
    );
  }

  // Error state — render a premium dark fallback panel instead of "Map unavailable"
  if (loadError || (!providedCoordinates && geocodeError) || (!providedCoordinates && !locationString) || !mapCoordinates) {
    return (
      <div
        className={cn('rounded-xl overflow-hidden relative', className)}
        style={{
          background:
            'radial-gradient(circle at 78% 35%, rgba(255,94,31,0.18), transparent 55%), linear-gradient(145deg, rgba(21,24,26,0.96), rgba(8,9,10,0.98))',
          boxShadow: 'inset 0 0 0 1px rgba(255,91,31,0.28)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-center px-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="text-sm font-semibold text-foreground">Approximate area</div>
            <div className="text-xs text-muted-foreground max-w-[240px]">
              Exact location shared after purchase confirmation.
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className={cn('rounded-xl overflow-hidden border border-border', className)}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCoordinates}
        zoom={13}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          scrollwheel: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        }}
      >
        <Marker
          position={mapCoordinates}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#1d4ed8',
            strokeWeight: 2,
          }}
        />
      </GoogleMap>
    </div>
  );
});

ListingLocationMapInner.displayName = 'ListingLocationMapInner';

// Main wrapper component that handles API key loading
export const ListingLocationMap: React.FC<ListingLocationMapProps> = (props) => {
  const { apiKey, isLoading, error } = useGoogleMapsToken();

  if (isLoading) {
    return (
      <div className={cn('rounded-xl border border-border bg-muted/30 flex items-center justify-center', props.className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading map...</span>
        </div>
      </div>
    );
  }

  if (error || !apiKey) {
    return (
      <div
        className={cn('rounded-xl overflow-hidden relative', props.className)}
        style={{
          background:
            'radial-gradient(circle at 78% 35%, rgba(255,94,31,0.18), transparent 55%), linear-gradient(145deg, rgba(21,24,26,0.96), rgba(8,9,10,0.98))',
          boxShadow: 'inset 0 0 0 1px rgba(255,91,31,0.28)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-center px-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="text-sm font-semibold text-foreground">Approximate area</div>
            <div className="text-xs text-muted-foreground max-w-[240px]">
              Exact location shared after purchase confirmation.
            </div>
          </div>
        </div>
      </div>
    );
  }


  return <ListingLocationMapInner {...props} apiKey={apiKey} />;
};

export default ListingLocationMap;
