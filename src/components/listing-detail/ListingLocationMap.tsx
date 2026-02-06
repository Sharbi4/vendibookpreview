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
  }, [locationString, isLoaded]);

  useEffect(() => {
    geocodeLocation();
  }, [geocodeLocation]);

  // Loading state
  if (!isLoaded || isGeocoding) {
    return (
      <div className={cn('rounded-xl border border-border bg-muted/30 flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading map...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError || geocodeError || !locationString) {
    return (
      <div className={cn('rounded-xl border border-border bg-muted/30 flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <MapPin className="h-6 w-6" />
          <span className="text-sm">Map unavailable</span>
        </div>
      </div>
    );
  }

  // No coordinates yet
  if (!coordinates) {
    return (
      <div className={cn('rounded-xl border border-border bg-muted/30 flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-6 w-6" />
          <span className="text-sm">Location not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl overflow-hidden border border-border', className)}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={coordinates}
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
          position={coordinates}
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
      <div className={cn('rounded-xl border border-border bg-muted/30 flex items-center justify-center', props.className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <MapPin className="h-6 w-6" />
          <span className="text-sm">Map unavailable</span>
        </div>
      </div>
    );
  }

  return <ListingLocationMapInner {...props} apiKey={apiKey} />;
};

export default ListingLocationMap;
