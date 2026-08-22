import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
}

// Multiple Google keys exist across environments (legacy, current, browser).
// Any of them may be the one Google accepts server-side, so try each until a
// request is not rejected with REQUEST_DENIED. A key Google rejects is skipped
// so a stale secret never blocks a working one.
const GOOGLE_KEYS = [
  Deno.env.get("GOOGLE_MAPS_API_KEY"),
  Deno.env.get("GOOGLE_API_KEY"),
  Deno.env.get("GOOGLE_MAPS_BROWSER_KEY"),
].filter((k): k is string => !!k);

const isRefererRestrictionError = (text: string) =>
  text.includes("API keys with referer restrictions cannot be used with this API");

// Returns the parsed Google JSON for the first accepted key, or null when
// every key failed / was rejected. `buildUrl` receives the key to try.
const googleJson = async (buildUrl: (key: string) => string): Promise<any | null> => {
  let sawRefererRestriction = false;
  for (const key of GOOGLE_KEYS) {
    try {
      const res = await fetch(buildUrl(key));
      if (!res.ok) {
        console.warn("Google API HTTP error:", res.status);
        continue;
      }
      const data = await res.json();
      if (data.status === "REQUEST_DENIED") {
        sawRefererRestriction = sawRefererRestriction || isRefererRestrictionError(data.error_message || "");
        console.warn("Google key rejected, trying next:", data.error_message);
        continue;
      }
      return data;
    } catch (err) {
      console.warn("Google request threw:", err);
    }
  }
  return sawRefererRestriction ? { status: "REQUEST_DENIED", error_message: "API keys with referer restrictions cannot be used with this API" } : null;
};

const parseLatLngQuery = (query: string): { lat: number; lng: number } | null => {
  const match = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  // Prefer (lat, lng) when it matches valid ranges.
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
    return { lat: a, lng: b };
  }

  // Otherwise allow (lng, lat)
  if (Math.abs(a) <= 180 && Math.abs(b) <= 90) {
    return { lat: b, lng: a };
  }

  return null;
};

const buildJsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const lookupZipWithZippopotam = async (zip: string): Promise<GeocodeResult[]> => {
  const response = await fetch(`https://api.zippopotam.us/us/${zip}`);

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`ZIP lookup failed with status ${response.status}`);
  }

  const payload = await response.json();
  const place = payload?.places?.[0];
  if (!place) {
    return [];
  }

  const lat = Number(place.latitude);
  const lng = Number(place.longitude);
  const city = place["place name"] || "";
  const state = place["state abbreviation"] || place.state || "";
  const placeName = `${city}, ${state} ${zip}`.trim();

  return [{
    id: `zip:${zip}`,
    placeName,
    center: [lng, lat],
    text: city || zip,
    context: state,
    city,
    state,
  }];
};

const handler = async (req: Request): Promise<Response> => {
  console.log("geocode-location function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 5 }: GeocodeRequest = await req.json();

    if (!query || query.trim().length < 2) {
      return buildJsonResponse({ results: [] });
    }

    const trimmedQuery = query.trim();
    const zipMatch = trimmedQuery.match(/^(\d{5})$/);

    console.log("Geocoding query:", trimmedQuery);

    if (zipMatch) {
      const zip = zipMatch[1];

      if (GOOGLE_KEYS.length > 0) {
        const geoData = await googleJson(
          (key) => `https://maps.googleapis.com/maps/api/geocode/json?address=${zip},+USA&key=${key}`,
        );

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

        if (geoData && geoData.status !== "ZERO_RESULTS") {
          console.warn("Google ZIP lookup unavailable, using fallback:", geoData.status, geoData.error_message);
        }
      } else {
        console.warn("No Google key configured, using ZIP fallback service");
      }

      try {
        const fallbackResults = await lookupZipWithZippopotam(zip);
        return buildJsonResponse({ results: fallbackResults });
      } catch (error) {
        console.error("ZIP fallback lookup failed:", error);
        return buildJsonResponse({ error: "ZIP lookup failed" }, 500);
      }
    }

    if (GOOGLE_KEYS.length === 0) {
      console.error("No Google key configured for non-ZIP geocoding");
      return buildJsonResponse({ results: [], error: "GEOCODING_UNAVAILABLE", fallback: true });
    }

    const latLng = parseLatLngQuery(trimmedQuery);
    if (latLng) {
      const reverseData = await googleJson(
        (key) => `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latLng.lat},${latLng.lng}&key=${key}`,
      );

      if (!reverseData) {
        console.error("Google Reverse Geocode API unavailable with all keys");
        return buildJsonResponse({ results: [], error: "GEOCODING_UNAVAILABLE", fallback: true });
      }
      if (reverseData.status !== "OK" && reverseData.status !== "ZERO_RESULTS") {
        console.error("Google Reverse Geocode API status error:", reverseData.status, reverseData.error_message);
        const restricted = isRefererRestrictionError(reverseData.error_message || "");
        return buildJsonResponse({ results: [], error: restricted ? "GEOCODING_KEY_RESTRICTED" : "GEOCODING_UNAVAILABLE", fallback: true });
      }

      const first = reverseData.results?.[0];
      const formatted = first?.formatted_address as string | undefined;

      const results: GeocodeResult[] = formatted
        ? [{
            id: `latlng:${latLng.lat},${latLng.lng}`,
            placeName: formatted,
            center: [latLng.lng, latLng.lat],
            text: formatted.split(',')[0] || formatted,
            context: formatted.split(',').slice(1).join(',').trim() || undefined,
          }]
        : [];

      console.log(`Found ${results.length} results for "${trimmedQuery}" (reverse geocode)`);
      return buildJsonResponse({ results });
    }

    const encodedQuery = encodeURIComponent(trimmedQuery);
    const data = await googleJson(
      (key) => `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&key=${key}&components=country:us&types=geocode`,
    );

    if (!data) {
      console.error("Google Places Autocomplete unavailable with all keys");
      return buildJsonResponse({ results: [], error: "GEOCODING_UNAVAILABLE", fallback: true });
    }
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google API status error:", data.status, data.error_message);
      const restricted = isRefererRestrictionError(data.error_message || "");
      return buildJsonResponse({ results: [], error: restricted ? "GEOCODING_KEY_RESTRICTED" : (data.error_message || "GEOCODING_UNAVAILABLE"), fallback: true });
    }

    const predictions = data.predictions?.slice(0, limit) || [];
    const results: GeocodeResult[] = [];

    for (const prediction of predictions) {
      try {
        const detailsData = await googleJson(
          (key) => `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${key}`,
        );

        if (detailsData?.status === "OK" && detailsData.result) {
          const location = detailsData.result.geometry?.location;
          if (location) {
            results.push({
              id: prediction.place_id,
              placeName: detailsData.result.formatted_address || prediction.description,
              center: [location.lng, location.lat],
              text: prediction.structured_formatting?.main_text || prediction.description.split(',')[0],
              context: prediction.structured_formatting?.secondary_text || prediction.description.split(',').slice(1).join(',').trim(),
            });
          }
        }
      } catch (err) {
        console.error("Error fetching place details:", err);
      }
    }

    console.log(`Found ${results.length} results for "${trimmedQuery}"`);
    return buildJsonResponse({ results });
  } catch (error: any) {
    console.error("Error in geocode-location function:", error);
    return buildJsonResponse({ error: error.message }, 500);
  }
};

serve(handler);
