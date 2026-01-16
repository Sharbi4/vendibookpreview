import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import { MapPin, Truck, Loader2, CheckCircle2, XCircle, MousePointer, Locate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGoogleMapsToken } from '@/hooks/useGoogleMapsToken';

interface DeliveryRadiusMapProps {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  address?: string;
  deliveryFee?: number | null;
}

interface ClickedLocation {
  lng: number;
  lat: number;
  isWithinRadius: boolean;
  distance: number;
  isUserLocation?: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate appropriate zoom level based on radius
function calculateZoomLevel(miles: number): number {
  if (miles <= 10) return 10;
  if (miles <= 25) return 9;
  if (miles <= 50) return 8;
  if (miles <= 100) return 7;
  return 6;
}

const DeliveryRadiusMap = ({
  latitude,
  longitude,
  radiusMiles,
  address,
  deliveryFee
}: DeliveryRadiusMapProps) => {
  const { apiKey, isLoading: tokenLoading, error: tokenError } = useGoogleMapsToken();
  const [clickedLocation, setClickedLocation] = useState<ClickedLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showPickupInfo, setShowPickupInfo] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
  });

  const center = { lat: latitude, lng: longitude };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    
    const clickedLat = e.latLng.lat();
    const clickedLng = e.latLng.lng();
    
    const distance = calculateDistance(latitude, longitude, clickedLat, clickedLng);
    const isWithinRadius = distance <= radiusMiles;

    setClickedLocation({
      lng: clickedLng,
      lat: clickedLat,
      isWithinRadius,
      distance
    });
  }, [latitude, longitude, radiusMiles]);

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        const distance = calculateDistance(latitude, longitude, userLat, userLng);
        const isWithinRadius = distance <= radiusMiles;

        setClickedLocation({
          lng: userLng,
          lat: userLat,
          isWithinRadius,
          distance,
          isUserLocation: true
        });
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError('Location access denied. Please enable location permissions.');
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable.');
            break;
          case err.TIMEOUT:
            setLocationError('Location request timed out.');
            break;
          default:
            setLocationError('Unable to get your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [latitude, longitude, radiusMiles]);

  if (tokenError || loadError) {
    return (
      <div className="p-4 bg-muted/50 rounded-xl text-center">
        <p className="text-sm text-muted-foreground">{tokenError || 'Failed to load map'}</p>
      </div>
    );
  }

  if (tokenLoading || !apiKey || !isLoaded) {
    return (
      <div className="p-8 bg-muted/50 rounded-xl flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Delivery Coverage Area
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="gap-2"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Locate className="h-4 w-4" />
          )}
          {isLocating ? 'Locating...' : 'Use my location'}
        </Button>
      </div>

      {locationError && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          {locationError}
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden border border-border">
        <div className="h-64 md:h-80 w-full">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={calculateZoomLevel(radiusMiles)}
            onClick={handleMapClick}
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
            {/* Delivery radius circle */}
            <Circle
              center={center}
              radius={radiusMiles * 1609.34}
              options={{
                fillColor: '#3b82f6',
                fillOpacity: 0.15,
                strokeColor: '#3b82f6',
                strokeWeight: 2,
                strokeOpacity: 0.8,
              }}
            />

            {/* Pickup location marker */}
            <Marker
              position={center}
              onClick={() => setShowPickupInfo(true)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#3b82f6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
            />

            {showPickupInfo && (
              <InfoWindow position={center} onCloseClick={() => setShowPickupInfo(false)}>
                <div className="p-2">
                  <p className="font-semibold text-sm">Pickup Location</p>
                  {address && <p className="text-xs text-gray-600">{address}</p>}
                </div>
              </InfoWindow>
            )}

            {/* Clicked location marker */}
            {clickedLocation && (
              <>
                <Marker
                  position={{ lat: clickedLocation.lat, lng: clickedLocation.lng }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: clickedLocation.isWithinRadius ? '#22c55e' : '#ef4444',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  }}
                />
                <InfoWindow
                  position={{ lat: clickedLocation.lat, lng: clickedLocation.lng }}
                  onCloseClick={() => setClickedLocation(null)}
                >
                  <div className="p-2">
                    <p className={`font-semibold text-sm ${clickedLocation.isWithinRadius ? 'text-green-600' : 'text-red-600'}`}>
                      {clickedLocation.isWithinRadius ? '✓ Within Delivery Zone' : '✗ Outside Delivery Zone'}
                    </p>
                    <p className="text-xs text-gray-600">{clickedLocation.distance.toFixed(1)} miles from pickup</p>
                    {clickedLocation.isUserLocation && (
                      <p className="text-xs text-blue-600 mt-1">📍 Your location</p>
                    )}
                  </div>
                </InfoWindow>
              </>
            )}
          </GoogleMap>
        </div>

        {/* Legend overlay */}
        <div className="absolute bottom-3 left-3 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-md border border-border">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-full bg-primary/20 border-2 border-primary border-dashed" />
            <span className="text-foreground font-medium">
              {radiusMiles} mile radius
            </span>
          </div>
          {deliveryFee && (
            <p className="text-xs text-muted-foreground mt-1">
              Delivery fee: ${deliveryFee}
            </p>
          )}
        </div>

        {/* Click result indicator */}
        {clickedLocation && (
          <div className={`absolute top-3 left-3 backdrop-blur-sm rounded-lg p-3 shadow-md border ${
            clickedLocation.isWithinRadius
              ? 'bg-green-50/95 border-green-200'
              : 'bg-red-50/95 border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {clickedLocation.isWithinRadius ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  clickedLocation.isWithinRadius ? 'text-green-700' : 'text-red-700'
                }`}>
                  {clickedLocation.isWithinRadius ? 'Delivery Available!' : 'Outside Delivery Zone'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {clickedLocation.distance.toFixed(1)} miles from pickup
                  {clickedLocation.isUserLocation && ' • Your location'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instruction hint */}
        {!clickedLocation && (
          <div className="absolute top-3 left-3 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MousePointer className="h-3.5 w-3.5" />
              <span>Click map or use your location to check delivery</span>
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 inline mr-1" />
        Delivery available within the highlighted area from the pickup location.
      </p>
    </div>
  );
};

export default DeliveryRadiusMap;
