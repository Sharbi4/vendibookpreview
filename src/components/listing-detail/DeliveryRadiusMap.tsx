import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Truck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryRadiusMapProps {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  address?: string;
  deliveryFee?: number | null;
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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" />
        Delivery Coverage Area
      </h2>
      
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
      </div>
      
      <p className="text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 inline mr-1" />
        Delivery available within the highlighted area from the pickup location.
      </p>
    </div>
  );
};

export default DeliveryRadiusMap;
