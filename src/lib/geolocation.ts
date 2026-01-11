// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Parse coordinates from address string (for listings that may have embedded coords)
export function parseCoordinates(address: string | null): [number, number] | null {
  if (!address) return null;
  
  // Try to extract coordinates in format "lat,lng" or similar
  const coordMatch = address.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [lng, lat]; // Return as [lng, lat] to match Mapbox format
    }
  }
  
  return null;
}

// Simple geocoding cache for listings (in-memory for session)
const geocodeCache = new Map<string, [number, number] | null>();

export function getCachedCoordinates(address: string): [number, number] | null | undefined {
  return geocodeCache.get(address);
}

export function setCachedCoordinates(address: string, coords: [number, number] | null) {
  geocodeCache.set(address, coords);
}
