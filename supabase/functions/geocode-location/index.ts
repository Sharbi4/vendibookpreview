import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { googleGatewayConfigured, googleGatewayFetch, googleGeocode } from "../_shared/googleGateway.ts";
import { getCaller, isBackendCaller } from "../_shared/callerGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeocodeRequest {
  query: string;
  limit?: number;
}

interface GeocodeResult {
  id: string;
  placeName: string;
  center: [number, number]; // [lng, lat]
  text: string;
  context?: string;
  city?: string;
  state?: string;
  address?: { street: string | null; city: string | null; state: string | null; zipCode: string | null; country: string | null };
}

const MAX_QUERY_LENGTH = 200;
const MAX_LIMIT = 5;

const parseLatLngQuery = (query: string): { lat: number; lng: number } | null => {
  const match = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b };
  if (Math.abs(a) <= 180 && Math.abs(b) <= 90) return { lat: b, lng: a };
  return null;
};

const buildJsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const lookupZipWithZippopotam = async (zip: string): Promise<GeocodeResult[]> => {
  const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`ZIP lookup failed with status ${response.status}`);
  const payload = await response.json();
  const place = payload?.places?.[0];
  if (!place) return [];
  const lat = Number(place.latitude);
  const lng = Number(place.longitude);
  const city = place["place name"] || "";
  const state = place["state abbreviation"] || place.state || "";
  return [{ id: `zip:${zip}`, placeName: `${city}, ${state} ${zip}`.trim(), center: [lng, lat], text: city || zip, context: state, city, state }];
};

const STATE_CODES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT",
  delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA",
  "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "puerto rico": "PR",
};

// Free OpenStreetMap-based lookup (Photon) used for signed-out visitors, so
// paid Google Maps calls only ever run for signed-in members and backend jobs.
const photonLookup = async (path: string): Promise<GeocodeResult[]> => {
  const res = await fetch(`https://photon.komoot.io${path}`, {
    headers: { "User-Agent": "Vendibook/1.0 (support@vendibook.com)" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Photon lookup failed with status ${res.status}`);
  const payload = await res.json();
  const features: any[] = Array.isArray(payload?.features) ? payload.features : [];
  return features
    .filter((f) => f?.properties?.countrycode === "US" && Array.isArray(f?.geometry?.coordinates))
    .map((f): GeocodeResult => {
      const p = f.properties;
      const [lng, lat] = f.geometry.coordinates as [number, number];
      const city = p.city || (["city", "town", "village", "locality"].includes(p.type) ? p.name : "") || "";
      const state = STATE_CODES[String(p.state ?? "").toLowerCase()] || "";
      const street = [p.housenumber, p.street].filter(Boolean).join(" ") || null;
      const name = p.name || street || city;
      const context = [city && city !== name ? city : "", state, p.postcode].filter(Boolean).join(", ");
      return {
        id: `osm:${p.osm_type ?? ""}${p.osm_id ?? `${lat},${lng}`}`,
        placeName: [name, context].filter(Boolean).join(", "),
        center: [lng, lat],
        text: name,
        context: context || undefined,
        city,
        state,
        address: { street, city: city || null, state: state || null, zipCode: p.postcode || null, country: "US" },
      };
    });
};

type NewComponent = { longText?: string; shortText?: string; types?: string[] };

const placeDetails = async (placeId: string, sessionToken: string) => {
  return await googleGatewayFetch(
    `/places/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
    { fieldMask: "id,formattedAddress,location,addressComponents" },
  );
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: GeocodeRequest = await req.json();
    const query = typeof body?.query === "string" ? body.query : "";
    const limit = Math.min(Math.max(Number(body?.limit) || MAX_LIMIT, 1), MAX_LIMIT);

    if (query.trim().length < 2) return buildJsonResponse({ results: [] });
    const trimmedQuery = query.trim().slice(0, MAX_QUERY_LENGTH);
    const zipMatch = trimmedQuery.match(/^(\d{5})$/);
    // Paid Google lookups are only for signed-in members and backend jobs.
    const member = (await isBackendCaller(req)) || !!(await getCaller(req));
    const google = member && googleGatewayConfigured();

    if (!member && !zipMatch) {
      try {
        const ll = parseLatLngQuery(trimmedQuery);
        const results = ll
          ? await photonLookup(`/reverse?lat=${ll.lat}&lon=${ll.lng}&lang=en`)
          : await photonLookup(`/api/?q=${encodeURIComponent(trimmedQuery)}&limit=${Math.min(limit * 3, 15)}&lang=en&bbox=-179.9,17.5,-64.5,71.5`);
        return buildJsonResponse({ results: results.slice(0, limit) });
      } catch (err) {
        console.error("Free location lookup failed:", String(err));
        return buildJsonResponse({ results: [], error: "GEOCODING_UNAVAILABLE", fallback: true });
      }
    }

    if (zipMatch) {
      const zip = zipMatch[1];
      if (google) {
        try {
          const geoData = await googleGeocode({ address: `${zip}, USA` });
          if (geoData?.status === "OK" && geoData.results?.length) {
            const r = geoData.results[0];
            const comps = r.address_components || [];
            const cityComp = comps.find((c: any) => c.types.includes("locality") || c.types.includes("sublocality") || c.types.includes("postal_town"));
            const stateComp = comps.find((c: any) => c.types.includes("administrative_area_level_1"));
            const loc = r.geometry?.location;
            return buildJsonResponse({
              results: [{
                id: `zip:${zip}`,
                placeName: r.formatted_address || `${zip}, USA`,
                center: [loc?.lng || 0, loc?.lat || 0],
                text: cityComp?.long_name || zip,
                context: stateComp?.short_name || "",
                city: cityComp?.long_name || "",
                state: stateComp?.short_name || "",
              } satisfies GeocodeResult],
            });
          }
        } catch (err) {
          console.warn("Google ZIP lookup unavailable, using fallback:", String(err));
        }
      }
      try {
        return buildJsonResponse({ results: await lookupZipWithZippopotam(zip) });
      } catch (error) {
        console.error("ZIP fallback lookup failed:", error);
        return buildJsonResponse({ error: "ZIP lookup failed" }, 500);
      }
    }

    if (!google) {
      console.error("Google Maps connector not configured for non-ZIP geocoding");
      return buildJsonResponse({ results: [], error: "GEOCODING_UNAVAILABLE", fallback: true });
    }

    const latLng = parseLatLngQuery(trimmedQuery);
    if (latLng) {
      try {
        const reverseData = await googleGeocode({ latlng: `${latLng.lat},${latLng.lng}` });
        if (reverseData.status !== "OK" && reverseData.status !== "ZERO_RESULTS") {
          console.error("Reverse geocode status error:", reverseData.status, reverseData.error_message);
          return buildJsonResponse({ results: [], error: "GEOCODING_UNAVAILABLE", fallback: true });
        }
        const formatted = reverseData.results?.[0]?.formatted_address as string | undefined;
        return buildJsonResponse({
          results: formatted
            ? [{
              id: `latlng:${latLng.lat},${latLng.lng}`,
              placeName: formatted,
              center: [latLng.lng, latLng.lat],
              text: formatted.split(",")[0] || formatted,
              context: formatted.split(",").slice(1).join(",").trim() || undefined,
            }]
            : [],
        });
      } catch (err) {
        console.error("Reverse geocode failed:", String(err));
        return buildJsonResponse({ results: [], error: "GEOCODING_UNAVAILABLE", fallback: true });
      }
    }

    // Places API (New) autocomplete, then details for each suggestion so the
    // response keeps its existing shape (coordinates + address parts).
    const sessionToken = crypto.randomUUID();
    let suggestions: any[] = [];
    try {
      const data = await googleGatewayFetch("/places/v1/places:autocomplete", {
        body: { input: trimmedQuery, includedRegionCodes: ["us"], sessionToken },
        fieldMask: "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat",
      });
      suggestions = (data?.suggestions ?? []).filter((s: any) => s?.placePrediction?.placeId).slice(0, limit);
    } catch (err) {
      console.error("Places autocomplete failed:", String(err));
      return buildJsonResponse({ results: [], error: "GEOCODING_UNAVAILABLE", fallback: true });
    }

    const settled = await Promise.allSettled(suggestions.map(async (s: any): Promise<GeocodeResult | null> => {
      const p = s.placePrediction;
      const description: string = p.text?.text ?? "";
      const d = await placeDetails(p.placeId, sessionToken);
      const lat = Number(d?.location?.latitude);
      const lng = Number(d?.location?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const comps: NewComponent[] = d.addressComponents ?? [];
      const component = (type: string, short = false) => {
        const c = comps.find((c) => c.types?.includes(type));
        return (short ? c?.shortText : c?.longText) || null;
      };
      return {
        id: p.placeId,
        placeName: d.formattedAddress || description,
        center: [lng, lat],
        text: p.structuredFormat?.mainText?.text || description.split(",")[0],
        context: p.structuredFormat?.secondaryText?.text || description.split(",").slice(1).join(",").trim(),
        address: {
          street: [component("street_number"), component("route")].filter(Boolean).join(" ") || null,
          city: component("locality") || component("postal_town") || component("sublocality"),
          state: component("administrative_area_level_1", true),
          zipCode: [component("postal_code"), component("postal_code_suffix")].filter(Boolean).join("-") || null,
          country: component("country", true),
        },
      };
    }));

    const results = settled
      .map((r) => {
        if (r.status === "rejected") console.error("Place details failed:", String(r.reason));
        return r.status === "fulfilled" ? r.value : null;
      })
      .filter((r): r is GeocodeResult => !!r);

    return buildJsonResponse({ results });
  } catch (error: any) {
    console.error("Error in geocode-location function:", error);
    return buildJsonResponse({ error: "Location lookup failed" }, 500);
  }
};

serve(handler);
