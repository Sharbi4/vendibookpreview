/**
 * Server-side geocoding and distance, shared by the freight estimate and the
 * sale checkout so delivery and freight charges are always computed on the
 * server from the same coordinates.
 */

export type LatLng = { lat: number; lng: number };

export function coerceCoords(value: unknown): LatLng | null {
  const v = value as { lat?: unknown; lng?: unknown } | null | undefined;
  const lat = Number(v?.lat);
  const lng = Number(v?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/** Straight-line distance in miles. */
export function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3959;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function geocodeViaMapbox(address: string): Promise<LatLng | null> {
  const token = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
  if (!token) return null;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?country=us&limit=1&access_token=${token}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const center = data?.features?.[0]?.center;
    return Array.isArray(center) && center.length === 2 ? { lat: Number(center[1]), lng: Number(center[0]) } : null;
  } catch {
    return null;
  }
}

/** US address → coordinates. Google first, Mapbox as the fallback. */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;
  // "lat,lng" passes straight through (listings without a street address).
  const pair = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (pair) return coerceCoords({ lat: pair[1], lng: pair[2] });

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${apiKey}&components=country:US`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const loc = data?.status === "OK" ? data.results?.[0]?.geometry?.location : null;
        if (loc) return { lat: Number(loc.lat), lng: Number(loc.lng) };
      }
    } catch {
      // fall through to Mapbox
    }
  }
  return await geocodeViaMapbox(trimmed);
}
