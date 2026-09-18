// deno-lint-ignore-file no-explicit-any
/**
 * Server-side Google Maps access for delivery tracking (geocoding + routing).
 *
 * Calls go through the Lovable connector gateway so no Google server key is
 * ever handled here or exposed to the browser. When the connector is not
 * configured every helper returns null — callers must then show live location
 * without a route or ETA rather than inventing one.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const creds = () => ({
  lovable: Deno.env.get("LOVABLE_API_KEY") ?? "",
  connector: Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "",
});

export function isGoogleRoutingConfigured(): boolean {
  const c = creds();
  return !!c.lovable && !!c.connector;
}

function headers(extra: Record<string, string> = {}) {
  const c = creds();
  return {
    Authorization: `Bearer ${c.lovable}`,
    "X-Connection-Api-Key": c.connector,
    "Content-Type": "application/json",
    ...extra,
  };
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Geocode a free-text address. Returns null when unavailable — never guesses. */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!isGoogleRoutingConfigured() || !address.trim()) return null;
  try {
    const res = await fetch(
      `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
      { headers: headers() },
    );
    if (!res.ok) {
      console.error(`Geocode failed [${res.status}]: ${await res.text()}`);
      return null;
    }
    const body = await res.json();
    const loc = body?.results?.[0]?.geometry?.location;
    if (typeof loc?.lat !== "number" || typeof loc?.lng !== "number") return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    console.error("Geocode error", err);
    return null;
  }
}

export interface RouteResult {
  distance_meters: number;
  duration_seconds: number;
  polyline: string | null;
}

/** Live driving route from the vehicle to the destination via the Routes API. */
export async function computeRoute(origin: LatLng, destination: LatLng): Promise<RouteResult | null> {
  if (!isGoogleRoutingConfigured()) return null;
  try {
    const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: headers({
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      }),
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });
    if (!res.ok) {
      console.error(`Route failed [${res.status}]: ${await res.text()}`);
      return null;
    }
    const body = await res.json();
    const route = body?.routes?.[0];
    if (!route) return null;
    const seconds = Number(String(route.duration ?? "").replace("s", ""));
    if (!Number.isFinite(route.distanceMeters) || !Number.isFinite(seconds)) return null;
    return {
      distance_meters: Math.round(route.distanceMeters),
      duration_seconds: Math.round(seconds),
      polyline: route.polyline?.encodedPolyline ?? null,
    };
  } catch (err) {
    console.error("Route error", err);
    return null;
  }
}
