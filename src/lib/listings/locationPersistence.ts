/**
 * Listing location persistence helpers.
 *
 * Single source of truth for turning the wizard's structured location inputs
 * (street / city / state / ZIP) into the listings-table columns, and for
 * deciding when coordinates must be re-resolved.
 *
 * Rules enforced here:
 * - city / state / postal_code are ALWAYS included in the save payload when
 *   the seller provided them, so a publish can never silently drop them.
 * - latitude / longitude are only written when the structured location
 *   actually changed versus what is stored — an ordinary re-publish never
 *   overwrites verified coordinates.
 * - when the location changed but no confident geocode is available,
 *   coordinates are cleared (NULL) rather than left pointing at the old
 *   place.
 * - geocoding goes through the existing `geocode-location` edge function and
 *   a result is only trusted when it agrees with the ZIP/state the seller
 *   entered. No metro substitution, no inference from title/description.
 */

export interface StructuredLocationInput {
  streetAddress?: string;
  aptSuite?: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface StoredListingLocation {
  address?: string | null;
  pickup_location_text?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface GeoCandidate {
  lat: number;
  lng: number;
  /** Full formatted place name, e.g. "2435 Shoal Creek Rd, Colbert, GA 30628, USA". */
  placeName: string;
  city?: string;
  state?: string;
}

export type GeocodeQueryFn = (query: string) => Promise<GeoCandidate | null>;

const norm = (v?: string | null): string => (v ?? '').trim().toLowerCase();

/** "123 Main St, Unit 4, Colbert, GA 30628" — the canonical stored address shape. */
export const buildStructuredListingAddress = (input: StructuredLocationInput): string => {
  const stateZip = [input.state.trim(), input.zipCode.trim()].filter(Boolean).join(' ');
  return [input.streetAddress?.trim(), input.aptSuite?.trim(), input.city.trim(), stateZip]
    .filter(Boolean)
    .join(', ');
};

/** Public approximate location — "City, ST" only, never a street or phone. */
export const buildApproxPickupText = (input: StructuredLocationInput): string =>
  [input.city.trim(), input.state.trim()].filter(Boolean).join(', ');

/**
 * True when the wizard's structured location differs from what is stored.
 * Comparison is case/whitespace-insensitive on city/state/ZIP; the street is
 * compared against the leading segment of the stored address when both exist.
 */
export function structuredLocationChanged(
  input: StructuredLocationInput,
  stored: StoredListingLocation,
): boolean {
  if (norm(input.city) !== norm(stored.city)) return true;
  if (norm(input.state) !== norm(stored.state)) return true;
  if (norm(input.zipCode) !== norm(stored.postal_code)) return true;

  const street = norm(input.streetAddress);
  if (street) {
    const storedAddress = norm(stored.address);
    if (!storedAddress) return true; // new street info, nothing stored
    if (!storedAddress.startsWith(street)) return true;
  }
  return false;
}

export interface LocationColumns {
  address: string | null;
  pickup_location_text: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface BuildLocationOptions {
  /** Previous freeform address text kept when the structured address is empty. */
  fallbackAddress?: string | null;
  /** Previous public pickup text kept when no city/state is available. */
  fallbackPickupText?: string | null;
  /**
   * Confident geocode result for a CHANGED location (from
   * resolveListingCoordinates), or null to clear stale coordinates.
   * Ignored when the location has not changed — stored coords stay untouched.
   */
  coords?: { lat: number; lng: number } | null;
}

export function buildLocationColumns(
  input: StructuredLocationInput,
  stored: StoredListingLocation,
  opts: BuildLocationOptions = {},
): LocationColumns {
  const fullAddress = buildStructuredListingAddress(input);
  const approx = buildApproxPickupText(input);

  const columns: LocationColumns = {
    address: fullAddress || opts.fallbackAddress || null,
    pickup_location_text: approx || opts.fallbackPickupText || null,
    city: input.city.trim() || null,
    state: input.state.trim() || null,
    postal_code: input.zipCode.trim() || null,
  };

  if (structuredLocationChanged(input, stored)) {
    columns.latitude = opts.coords?.lat ?? null;
    columns.longitude = opts.coords?.lng ?? null;
  }

  return columns;
}

const stateMatches = (r: GeoCandidate, state: string): boolean =>
  !state.trim() || !r.state || norm(r.state) === norm(state);

const cityMatches = (r: GeoCandidate, city: string): boolean =>
  !city.trim() || !r.city || norm(r.city) === norm(city);

export interface ResolvedCoordinates {
  lat: number;
  lng: number;
  /** 'address' = street-level match, 'zip' = ZIP centroid (city-level). */
  level: 'address' | 'zip';
}

/**
 * Resolve coordinates for a structured location via the provided geocode
 * function (the existing geocode-location edge function in production).
 *
 * A result is only trusted when it anchors to the seller-entered ZIP
 * (and state, when the provider returns one). Street-level results are
 * preferred; a ZIP centroid is the fallback. Returns null when nothing
 * confident is found — callers then persist NULL coordinates rather than
 * keeping a stale or guessed position.
 */
export async function resolveListingCoordinates(
  input: StructuredLocationInput,
  geocode: GeocodeQueryFn,
): Promise<ResolvedCoordinates | null> {
  const zip = input.zipCode.trim();
  const full = buildStructuredListingAddress(input);

  if (input.streetAddress?.trim() && full) {
    const r = await geocode(full);
    if (r && (!zip || r.placeName.includes(zip)) && stateMatches(r, input.state) && cityMatches(r, input.city)) {
      return { lat: r.lat, lng: r.lng, level: 'address' };
    }
  }

  if (zip) {
    const r = await geocode(zip);
    if (r && r.placeName.includes(zip) && stateMatches(r, input.state)) {
      return { lat: r.lat, lng: r.lng, level: 'zip' };
    }
  }

  return null;
}
