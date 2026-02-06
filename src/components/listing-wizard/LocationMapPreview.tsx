import { useEffect, useState, useCallback, memo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import { MapPin, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useGoogleMapsToken } from '@/hooks/useGoogleMapsToken';
import { cn } from '@/lib/utils';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_ID } from '@/lib/googleMapsLoader';


interface LocationMapPreviewProps {
  city: string;
  state: string;
  zipCode: string;
  streetAddress?: string;
  showPreciseLocation: boolean;
  onCoordinatesChange?: (coords: { lat: number; lng: number } | null) => void;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions = {
  disableDefaultUI: true,
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
};

const LocationMapPreviewInner = memo(({ 
  city, 
  state, 
  zipCode, 
  streetAddress,
  showPreciseLocation,
  onCoordinatesChange,
  onValidationChange,
  className,
  apiKey,
}: LocationMapPreviewProps & { apiKey: string }) => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidLocation, setIsValidLocation] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: GOOGLE_MAPS_LOADER_ID,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });


  // Geocode the address
  const geocodeAddress = useCallback(async () => {
    // Need at least city and state to geocode
    if (!city.trim() || !state.trim()) {
      setCoordinates(null);
      setValidationError(null);
      setIsValidLocation(false);
      onCoordinatesChange?.(null);
      onValidationChange?.(false);
      return;
    }

    if (!isLoaded) return;

    setIsValidating(true);
    setValidationError(null);

    try {
      const geocoder = new google.maps.Geocoder();
      
      // Build address string for geocoding
      let addressParts: string[] = [];
      if (streetAddress?.trim()) {
        addressParts.push(streetAddress.trim());
      }
      addressParts.push(city.trim());
      addressParts.push(state.trim());
      if (zipCode?.trim()) {
        addressParts.push(zipCode.trim());
      }
      addressParts.push('USA');
      
      const fullAddress = addressParts.join(', ');

      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address: fullAddress }, (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });

      const location = result[0].geometry.location;
      const coords = { lat: location.lat(), lng: location.lng() };
      
      // Validate that the result is in the US
      const addressComponents = result[0].address_components;
      const countryComponent = addressComponents.find(
        (c) => c.types.includes('country')
      );
      
      if (countryComponent?.short_name !== 'US') {
        setValidationError('Location must be in the United States');
        setIsValidLocation(false);
        onValidationChange?.(false);
        return;
      }

      // Check if the geocoded city matches approximately
      const cityComponent = addressComponents.find(
        (c) => c.types.includes('locality') || c.types.includes('sublocality')
      );
      const stateComponent = addressComponents.find(
        (c) => c.types.includes('administrative_area_level_1')
      );

      // Validate state matches
      if (stateComponent && state.trim().toUpperCase() !== stateComponent.short_name.toUpperCase()) {
        setValidationError(`State doesn't match. Did you mean ${stateComponent.short_name}?`);
        setIsValidLocation(false);
        onValidationChange?.(false);
      } else {
        setIsValidLocation(true);
        onValidationChange?.(true);
      }

      setCoordinates(coords);
      onCoordinatesChange?.(coords);
    } catch (error) {
      console.error('Geocoding error:', error);
      setValidationError('Unable to verify this location. Please check the address.');
      setCoordinates(null);
      setIsValidLocation(false);
      onCoordinatesChange?.(null);
      onValidationChange?.(false);
    } finally {
      setIsValidating(false);
    }
  }, [city, state, zipCode, streetAddress, isLoaded, onCoordinatesChange, onValidationChange]);

  // Debounce geocoding
  useEffect(() => {
    const timer = setTimeout(() => {
      geocodeAddress();
    }, 500);

    return () => clearTimeout(timer);
  }, [geocodeAddress]);

  if (loadError) {
    return (
      <div className={cn("rounded-xl border border-border bg-muted/30 p-6 flex items-center justify-center", className)}>
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm">Unable to load map</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={cn("rounded-xl border border-border bg-muted/30 p-6 flex items-center justify-center", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show placeholder if no location data
  if (!city.trim() && !state.trim()) {
    return (
      <div className={cn("rounded-xl border border-border bg-muted/30 p-8 flex items-center justify-center", className)}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Enter city and state to see location preview
          </p>
        </div>
      </div>
    );
  }

  // Show validating state
  if (isValidating) {
    return (
      <div className={cn("rounded-xl border border-border bg-muted/30 p-8 flex items-center justify-center", className)}>
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Validating location...</p>
        </div>
      </div>
    );
  }

  // Show validation error
  if (validationError) {
    return (
      <div className={cn("rounded-xl border border-destructive/50 bg-destructive/5 p-6", className)}>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Location Error</p>
            <p className="text-sm text-muted-foreground mt-1">{validationError}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show map with location
  if (coordinates) {
    return (
      <div className="space-y-2">
        {/* Validation success indicator */}
        {isValidLocation && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Location verified</span>
          </div>
        )}
        
        <div className={cn("rounded-xl overflow-hidden border border-border", className)}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={coordinates}
            zoom={showPreciseLocation ? 15 : 12}
            options={mapOptions}
          >
            {showPreciseLocation ? (
              <Marker 
                position={coordinates}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#ef4444',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3,
                }}
              />
            ) : (
              <Circle
                center={coordinates}
                radius={800}
                options={{
                  fillColor: '#3b82f6',
                  fillOpacity: 0.15,
                  strokeColor: '#3b82f6',
                  strokeOpacity: 0.5,
                  strokeWeight: 2,
                }}
              />
            )}
          </GoogleMap>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          {showPreciseLocation 
            ? "Exact location shown to guests"
            : "Approximate area shown (exact address revealed after booking)"}
        </p>
      </div>
    );
  }

  return null;
});

LocationMapPreviewInner.displayName = 'LocationMapPreviewInner';

export const LocationMapPreview = (props: LocationMapPreviewProps) => {
  const { apiKey, isLoading, error } = useGoogleMapsToken();

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border bg-muted/30 h-48 flex items-center justify-center", props.className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !apiKey) {
    return (
      <div className={cn("rounded-xl border border-border bg-muted/30 h-48 flex items-center justify-center", props.className)}>
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Map preview unavailable</p>
        </div>
      </div>
    );
  }

  return <LocationMapPreviewInner {...props} apiKey={apiKey} />;
};

export default LocationMapPreview;
