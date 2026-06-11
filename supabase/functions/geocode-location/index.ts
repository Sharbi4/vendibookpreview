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
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const zipMatch = trimmedQuery.match(/^(\d{5})$/);

    console.log("Geocoding query:", trimmedQuery);

    if (zipMatch) {
      const zip = zipMatch[1];

      if (GOOGLE_MAPS_API_KEY) {
        try {
          const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${zip},+USA&key=${GOOGLE_MAPS_API_KEY}`;
          const geoRes = await fetch(geoUrl);

          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.status === "OK" && geoData.results?.length) {
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

            if (geoData.status !== "ZERO_RESULTS") {
              console.warn("Google ZIP lookup unavailable, using fallback:", geoData.status, geoData.error_message);
            }
          } else {
            console.warn("Google ZIP lookup HTTP error, using fallback:", geoRes.status);
          }
        } catch (error) {
          console.warn("Google ZIP lookup threw, using fallback:", error);
        }
      } else {
        console.warn("GOOGLE_MAPS_API_KEY missing, using ZIP fallback service");
      }

      try {
        const fallbackResults = await lookupZipWithZippopotam(zip);
        return buildJsonResponse({ results: fallbackResults });
      } catch (error) {
        console.error("ZIP fallback lookup failed:", error);
        return buildJsonResponse({ error: "ZIP lookup failed" }, 500);
      }
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.error("GOOGLE_MAPS_API_KEY not configured for non-ZIP geocoding");
      return buildJsonResponse({ results: [], error: "GEOCODING_UNAVAILABLE", fallback: true });
    }

    const isRefererRestrictionError = (text: string) =>
      text.includes("API keys with referer restrictions cannot be used with this API");

    const latLng = parseLatLngQuery(trimmedQuery);
    if (latLng) {
      const reverseUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latLng.lat},${latLng.lng}&key=${GOOGLE_MAPS_API_KEY}`;
      const reverseRes = await fetch(reverseUrl);

      if (!reverseRes.ok) {
        const errText = await reverseRes.text();
        console.error("Google Reverse Geocode API error:", reverseRes.status, errText);
        return buildJsonResponse({ results: [], error: "GEOCODING_UNAVAILABLE", fallback: true });
      }

      const reverseData = await reverseRes.json();
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
    const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&key=${GOOGLE_MAPS_API_KEY}&components=country:us&types=geocode`;

    const response = await fetch(googleUrl);
    if (!response.ok) {
      const errText = await response.text();
      console.error("Google API error:", response.status, errText);
      return buildJsonResponse({ results: [], error: "GEOCODING_UNAVAILABLE", fallback: true });
    }

    const data = await response.json();
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google API status error:", data.status, data.error_message);
      const restricted = isRefererRestrictionError(data.error_message || "");
      return buildJsonResponse({ results: [], error: restricted ? "GEOCODING_KEY_RESTRICTED" : (data.error_message || "GEOCODING_UNAVAILABLE"), fallback: true });
    }

    const predictions = data.predictions?.slice(0, limit) || [];
    const results: GeocodeResult[] = [];

    for (const prediction of predictions) {
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        if (detailsData.status === "OK" && detailsData.result) {
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
