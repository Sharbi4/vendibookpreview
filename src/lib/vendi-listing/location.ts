/**
 * Vendi listing location persistence.
 *
 * List with Vendi writes the same city / state / ZIP columns the manual wizard
 * writes, but until now it never resolved coordinates, so Vendi listings landed
 * without latitude/longitude and fell out of map + radius search.
 *
 * This reuses the wizard's canonical helpers (`geocode-location` edge function
 * + `resolveListingCoordinates` confidence gating). Nothing is inferred: a
 * geocode is only trusted when it anchors to the ZIP/state the seller stated,
 * and when no confident result exists the coordinates are written as NULL
 * rather than guessed.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  resolveListingCoordinates,
  type GeoCandidate,
  type StructuredLocationInput,
} from '@/lib/listings/locationPersistence';

/** Canonical geocoder — same edge function and timeout guard as the wizard. */
export const geocodeListingAddress = async (query: string): Promise<GeoCandidate | null> => {
  try {
    const { data } = await Promise.race([
      supabase.functions.invoke('geocode-location', { body: { query, limit: 1 } }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('geocode-location timed out')), 15000),
      ),
    ]);
    const r = (data as { results?: Array<Record<string, unknown>> } | null)?.results?.[0];
    if (!r || !Array.isArray(r.center)) return null;
    return {
      lat: Number((r.center as number[])[1]),
      lng: Number((r.center as number[])[0]),
      placeName: String(r.placeName ?? ''),
      city: r.city as string | undefined,
      state: r.state as string | undefined,
    };
  } catch (err) {
    console.warn('[Vendi] geocode-location failed:', err);
    return null;
  }
};

export interface VendiLocationInput {
  listingId: string;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  /** Coordinates already stored on the row (from server hydration). */
  hasStoredCoords?: boolean;
}

export interface VendiCoordinateColumns {
  latitude: number | null;
  longitude: number | null;
}

const locationKey = (city?: string | null, state?: string | null, zip?: string | null): string =>
  [city, state, zip].map((v) => (v ?? '').trim().toLowerCase()).join('|');

/** Location each listing's persisted coordinates belong to, per session. */
const resolvedKeys = new Map<string, string>();

/** Test seam — clears the per-listing memo. */
export const __resetVendiLocationMemo = (): void => { resolvedKeys.clear(); };

/**
 * Returns the latitude/longitude columns to merge into a Vendi save payload,
 * or null when the stored coordinates are already correct for this location
 * (an ordinary autosave then never re-geocodes or overwrites them).
 */
export async function resolveVendiCoordinates(
  input: VendiLocationInput,
  geocode: (query: string) => Promise<GeoCandidate | null> = geocodeListingAddress,
): Promise<VendiCoordinateColumns | null> {
  const city = (input.city ?? '').trim();
  const state = (input.state ?? '').trim();
  const zip = (input.zipCode ?? '').trim();
  if (!city && !zip) return null; // nothing stated yet — leave the columns alone

  const key = locationKey(city, state, zip);
  const known = resolvedKeys.get(input.listingId);
  if (known === key) return null;
  if (known === undefined && input.hasStoredCoords) {
    // Server coordinates already belong to this stored location.
    resolvedKeys.set(input.listingId, key);
    return null;
  }

  const structured: StructuredLocationInput = { city, state, zipCode: zip };
  const coords = await resolveListingCoordinates(structured, geocode);
  resolvedKeys.set(input.listingId, key);
  return { latitude: coords?.lat ?? null, longitude: coords?.lng ?? null };
}
