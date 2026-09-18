import { useEffect, useMemo, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { Truck, MapPin, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGoogleMapsToken } from '@/hooks/useGoogleMapsToken';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_ID } from '@/lib/googleMapsLoader';
import { useDeliveryTracking, isDeliveryMode } from '@/hooks/useDeliveryTracking';
import type { FulfillmentSession } from '@/hooks/useHandoff';

interface Props {
  saleTransactionId?: string | null;
  bookingId?: string | null;
  /** Only rendered for orders that actually include a physical delivery. */
  fulfillmentType?: string | null;
}

const STEPS = [
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready for delivery' },
  { key: 'en_route', label: 'En route' },
  { key: 'arriving', label: 'Arriving' },
  { key: 'delivered', label: 'Delivered' },
] as const;

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : null;
};

function currentStep(s: FulfillmentSession | null): number {
  if (!s) return 0;
  if (s.status === 'completed' || s.delivered_at) return 4;
  if (s.status === 'arrived') return 3;
  if (s.tracking_active && !s.tracking_paused) return 2;
  if (s.status === 'en_route') return 2;
  return 1;
}

function agoLabel(iso?: string | null): string | null {
  if (!iso) return null;
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `Last updated ${secs} second${secs === 1 ? '' : 's'} ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `Last updated ${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  return `Last updated ${hours} hour${hours === 1 ? '' : 's'} ago`;
}

/** Decode a Google encoded polyline without needing the geometry library. */
function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

const mapStyle = { width: '100%', height: '100%' };


function TrackingMap({
  apiKey,
  driver,
  destination,
  polyline,
}: {
  apiKey: string;
  driver: { lat: number; lng: number };
  destination: { lat: number; lng: number } | null;
  polyline: string | null;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: GOOGLE_MAPS_LOADER_ID,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const path = useMemo(() => {
    if (!isLoaded || !polyline) return null;
    return decodePolyline(polyline);
  }, [isLoaded, polyline]);


  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        The map could not be loaded right now.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapStyle}
      center={driver}
      zoom={destination ? 11 : 14}
      options={{
        clickableIcons: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      <Marker position={driver} title="Delivery vehicle" />
      {destination && <Marker position={destination} title="Delivery address" opacity={0.85} />}
      {path && <Polyline path={path} options={{ strokeColor: '#1f1f22', strokeOpacity: 0.7, strokeWeight: 4 }} />}
    </GoogleMap>
  );
}

export default function DeliveryTrackingPanel({ saleTransactionId, bookingId, fulfillmentType }: Props) {
  const { session, isLoading } = useDeliveryTracking(saleTransactionId, bookingId);
  const { apiKey } = useGoogleMapsToken();
  const [, setTick] = useState(0);

  // Refresh the "last updated" label without polling the server.
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 15000);
    return () => window.clearInterval(t);
  }, []);

  const deliveryOrder = isDeliveryMode(session?.mode) || ['rental_delivery', 'equipment_delivery', 'shipping'].includes(fulfillmentType ?? '');
  if (!deliveryOrder) return null;
  if (isLoading && !session) return null;

  const step = currentStep(session ?? null);
  const lat = num(session?.last_latitude);
  const lng = num(session?.last_longitude);
  const dLat = num(session?.destination_latitude);
  const dLng = num(session?.destination_longitude);
  const live = !!session?.tracking_active && !session?.tracking_paused && lat !== null && lng !== null;
  const eta = session?.route_duration_seconds ?? null;
  const distance = session?.route_distance_meters ?? null;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Truck className="h-4 w-4" /> Delivery tracking
        </h2>
        {live ? (
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">Live</Badge>
        ) : session?.tracking_paused ? (
          <Badge variant="outline">Tracking paused</Badge>
        ) : null}
      </div>

      {/* Status timeline — always available, no invented data */}
      <ol className="mt-4 grid gap-2 sm:grid-cols-5">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.key} className="flex items-center gap-2 sm:block">
              <span
                className={`block h-1.5 w-full rounded-full ${
                  done || active ? 'bg-foreground' : 'bg-foreground/10'
                }`}
              />
              <span
                className={`mt-2 block text-xs ${
                  active ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                {done && <CheckCircle2 className="mr-1 inline h-3 w-3" />}
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {live && apiKey && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <div className="h-[280px] sm:h-[340px]">
            <TrackingMap
              apiKey={apiKey}
              driver={{ lat: lat as number, lng: lng as number }}
              destination={dLat !== null && dLng !== null ? { lat: dLat, lng: dLng } : null}
              polyline={session?.route_polyline ?? null}
            />
          </div>
        </div>
      )}

      <div className="mt-4 space-y-1 text-sm">
        {live ? (
          <>
            <p className="font-medium">
              {session?.status === 'arrived' ? 'Arriving now' : 'On the way'}
            </p>
            {eta !== null && distance !== null ? (
              <p className="text-muted-foreground">
                <Clock className="mr-1 inline h-3.5 w-3.5" />
                About {Math.max(1, Math.round(eta / 60))} min away · {(distance / 1609.34).toFixed(1)} mi remaining
              </p>
            ) : (
              <p className="text-muted-foreground">
                Live location is shown. An arrival estimate isn't available for this delivery.
              </p>
            )}
            <p className="text-xs text-muted-foreground">{agoLabel(session?.last_location_at)}</p>
          </>
        ) : session?.delivered_at || session?.status === 'completed' ? (
          <p className="text-muted-foreground">
            Delivery was marked delivered
            {session?.delivered_at ? ` on ${new Date(session.delivered_at).toLocaleString()}` : ''}. Location sharing
            has stopped.
          </p>
        ) : (
          <p className="text-muted-foreground">
            Live tracking will appear here once the driver starts the delivery.
          </p>
        )}
        {session?.destination_label && (
          <p className="text-xs text-muted-foreground">
            <MapPin className="mr-1 inline h-3.5 w-3.5" />
            Delivering to {session.destination_label}
          </p>
        )}
      </div>
    </Card>
  );
}
