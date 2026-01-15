import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Truck, Loader2, CheckCircle2, XCircle, MousePointer, Navigation, Locate } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

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

const DeliveryRadiusMap = ({ 
  latitude, 
  longitude, 
  radiusMiles, 
  address,
  deliveryFee 
}: DeliveryRadiusMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const clickMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clickedLocation, setClickedLocation] = useState<ClickedLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapToken(data.token);
        } else {
          setError('Mapbox token not available');
        }
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
        setError('Failed to load map');
      }
    };
    fetchToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapToken) return;

    mapboxgl.accessToken = mapToken;

    // Convert miles to meters for the circle radius
    const radiusMeters = radiusMiles * 1609.34;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [longitude, latitude],
      zoom: calculateZoomLevel(radiusMiles),
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: false }),
      'top-right'
    );

    map.current.on('load', () => {
      if (!map.current) return;
      setMapLoaded(true);

      // Add the delivery radius circle as a source
      map.current.addSource('delivery-radius', {
        type: 'geojson',
        data: createCircleGeoJSON(longitude, latitude, radiusMeters),
      });

      // Add fill layer for the radius
      map.current.addLayer({
        id: 'delivery-radius-fill',
        type: 'fill',
        source: 'delivery-radius',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.15,
        },
      });

      // Add outline layer for the radius
      map.current.addLayer({
        id: 'delivery-radius-outline',
        type: 'line',
        source: 'delivery-radius',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });

      // Add center marker
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([longitude, latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <p class="font-semibold text-sm">Pickup Location</p>
              ${address ? `<p class="text-xs text-gray-600">${address}</p>` : ''}
            </div>`
          )
        )
        .addTo(map.current);

      // Add click handler for checking delivery zone
      map.current.on('click', (e) => {
        const clickedLng = e.lngLat.lng;
        const clickedLat = e.lngLat.lat;
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(latitude, longitude, clickedLat, clickedLng);
        const isWithinRadius = distance <= radiusMiles;

        // Remove existing click marker
        if (clickMarker.current) {
          clickMarker.current.remove();
        }

        // Add new marker at clicked location
        const markerColor = isWithinRadius ? '#22c55e' : '#ef4444';
        clickMarker.current = new mapboxgl.Marker({ color: markerColor })
          .setLngLat([clickedLng, clickedLat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25, closeOnClick: false }).setHTML(
              `<div class="p-2">
                <p class="font-semibold text-sm ${isWithinRadius ? 'text-green-600' : 'text-red-600'}">
                  ${isWithinRadius ? '✓ Within Delivery Zone' : '✗ Outside Delivery Zone'}
                </p>
                <p class="text-xs text-gray-600">${distance.toFixed(1)} miles from pickup</p>
              </div>`
            )
          )
          .addTo(map.current!);

        clickMarker.current.togglePopup();

        setClickedLocation({
          lng: clickedLng,
          lat: clickedLat,
          isWithinRadius,
          distance
        });
      });

      // Change cursor to pointer on hover
      map.current.getCanvas().style.cursor = 'pointer';
    });

    return () => {
      map.current?.remove();
    };
  }, [latitude, longitude, radiusMiles, address, mapToken]);

  // Calculate appropriate zoom level based on radius
  function calculateZoomLevel(miles: number): number {
    if (miles <= 10) return 10;
    if (miles <= 25) return 9;
    if (miles <= 50) return 8;
    if (miles <= 100) return 7;
    return 6;
  }

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

  // Function to check a location and update the map
  const checkLocation = useCallback((userLng: number, userLat: number, isUserLocation = false) => {
    if (!map.current || !mapLoaded) return;

    const distance = calculateDistance(latitude, longitude, userLat, userLng);
    const isWithinRadius = distance <= radiusMiles;

    // Remove existing click marker
    if (clickMarker.current) {
      clickMarker.current.remove();
    }

    // Add new marker at location
    const markerColor = isWithinRadius ? '#22c55e' : '#ef4444';
    clickMarker.current = new mapboxgl.Marker({ color: markerColor })
      .setLngLat([userLng, userLat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25, closeOnClick: false }).setHTML(
          `<div class="p-2">
            <p class="font-semibold text-sm ${isWithinRadius ? 'text-green-600' : 'text-red-600'}">
              ${isWithinRadius ? '✓ Within Delivery Zone' : '✗ Outside Delivery Zone'}
            </p>
            <p class="text-xs text-gray-600">${distance.toFixed(1)} miles from pickup</p>
            ${isUserLocation ? '<p class="text-xs text-blue-600 mt-1">📍 Your location</p>' : ''}
          </div>`
        )
      )
      .addTo(map.current);

    clickMarker.current.togglePopup();

    // Fly to show both the user location and the pickup location
    if (isUserLocation) {
      const bounds = new mapboxgl.LngLatBounds()
        .extend([longitude, latitude])
        .extend([userLng, userLat]);
      
      map.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 12
      });
    }

    setClickedLocation({
      lng: userLng,
      lat: userLat,
      isWithinRadius,
      distance,
      isUserLocation
    });
  }, [latitude, longitude, radiusMiles, mapLoaded]);

  // Handle "Use my location" button click
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
        
        checkLocation(userLng, userLat, true);
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
  }, [checkLocation]);

  // Create a GeoJSON circle from center point and radius
  function createCircleGeoJSON(lng: number, lat: number, radiusMeters: number) {
    const points = 64;
    const coords: [number, number][] = [];

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radiusMeters * Math.cos(angle);
      const dy = radiusMeters * Math.sin(angle);

      // Convert meters to degrees
      const dLat = dy / 111320;
      const dLng = dx / (111320 * Math.cos((lat * Math.PI) / 180));

      coords.push([lng + dLng, lat + dLat]);
    }
    coords.push(coords[0]); // Close the polygon

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [coords],
      },
      properties: {},
    };
  }

  if (error) {
    return (
      <div className="p-4 bg-muted/50 rounded-xl text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!mapToken) {
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
          disabled={isLocating || !mapLoaded}
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
        <div ref={mapContainer} className="h-64 md:h-80 w-full" />
        
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
