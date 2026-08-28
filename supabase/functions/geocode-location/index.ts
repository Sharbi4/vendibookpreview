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
  center: [number, number];
  text: string;
  context?: string;
  city?: string;
  state?: string;
  zip?: string;
}

const buildJsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const parseLatLngQuery = (query: string): { lat: number; lng: number } | null => {
  const match = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

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
  const placeName = `${city}, ${state} ${zip}`.trim();

  return [{
    id: `zip:${zip}`,
    placeName,
    center: [lng, lat],
    text: city || zip,
    context: [state, zip].filter(Boolean).join(" "),
    city,
    state,
    zip,
  }];
};

const nominatimHeaders = {
  "User-Agent": "Vendibook/1.0 (location search)",
  "Accept-Language": "en-US,en;q=0.9",
};

const searchNominatim = async (query: string, limit: number): Promise<GeocodeResult[]> => {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 8)));

  const response = await fetch(url.toString(), { headers: nominatimHeaders });
  if (!response.ok) throw new Error(`Nominatim search failed with status ${response.status}`);

  const rows = await response.json();
  return (Array.isArray(rows) ? rows : []).map((row: any) => {
    const address = row.address || {};
    const city = address.city || address.town || address.village || address.hamlet || address.county || "";
    const state = address.state || "";
    const zip = address.postcode || "";
    const main = city || row.name || row.display_name?.split(",")?.[0] || query;
    const context = [state, zip].filter(Boolean).join(" ");

    return {
      id: `osm:${row.place_id}`,
      placeName: row.display_name || [main, context].filter(Boolean).join(", "),
      center: [Number(row.lon), Number(row.lat)] as [number, number],
      text: main,
      context,
      city,
      state,
      zip,
    } satisfies GeocodeResult;
  }).filter((r: GeocodeResult) => Number.isFinite(r.center[0]) && Number.isFinite(r.center[1]));
};

const reverseNominatim = async (lat: number, lng: number): Promise<GeocodeResult[]> => {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), { headers: nominatimHeaders });
  if (!response.ok) throw new Error(`Nominatim reverse lookup failed with status ${response.status}`);

  const row = await response.json();
  if (!row?.display_name) return [];

  const address = row.address || {};
  const city = address.city || address.town || address.village || address.hamlet || address.county || "";
  const state = address.state || "";
  const zip = address.postcode || "";
  const text = city || row.name || row.display_name.split(",")[0];
  const context = [state, zip].filter(Boolean).join(" ");

  return [{
    id: `osm-reverse:${row.place_id || `${lat},${lng}`}`,
    placeName: row.display_name,
    center: [lng, lat],
    text,
    context,
    city,
    state,
    zip,
  }];
};

const googleZipLookup = async (zip: string, key: string): Promise<GeocodeResult[]> => {
  const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${zip},+USA&key=${key}`;
  const response = await fetch(geoUrl);
  if (!response.ok) return [];
  const data = await response.json();
  if (data.status !== "OK" || !data.results?.length) return [];

  const row = data.results[0];
  const comps = row.address_components || [];
  const cityComp = comps.find((c: any) => c.types.includes("locality") || c.types.includes("sublocality") || c.types.includes("postal_town"));
  const stateComp = comps.find((c: any) => c.types.includes("administrative_area_level_1"));
  const loc = row.geometry?.location;
  if (!loc) return [];

  const city = cityComp?.long_name || "";
  const state = stateComp?.short_name || "";
  return [{
    id: `zip:${zip}`,
    placeName: row.formatted_address || `${city}, ${state} ${zip}`,
    center: [loc.lng, loc.lat],
    text: city || zip,
    context: [state, zip].filter(Boolean).join(" "),
    city,
    state,
    zip,
  }];
};

const googleAutocomplete = async (query: string, limit: number, key: string): Promise<GeocodeResult[]> => {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&key=${key}&components=country:us&types=geocode`;
  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  if (data.status !== "OK" || !data.predictions?.length) return [];

  const predictions = data.predictions.slice(0, limit);
  const results: GeocodeResult[] = [];

  for (const prediction of predictions) {
    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address,address_component&key=${key}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      if (detailsData.status !== "OK" || !detailsData.result?.geometry?.location) continue;

      const loc = detailsData.result.geometry.location;
      const comps = detailsData.result.address_components || [];
      const cityComp = comps.find((c: any) => c.types.includes("locality") || c.types.includes("postal_town") || c.types.includes("sublocality"));
      const stateComp = comps.find((c: any) => c.types.includes("administrative_area_level_1"));
      const zipComp = comps.find((c: any) => c.types.includes("postal_code"));
      const city = cityComp?.long_name || prediction.structured_formatting?.main_text || "";
      const state = stateComp?.short_name || "";
      const zip = zipComp?.long_name || "";

      results.push({
        id: prediction.place_id,
        placeName: detailsData.result.formatted_address || prediction.description,
        center: [loc.lng, loc.lat],
        text: city || prediction.structured_formatting?.main_text || prediction.description.split(",")[0],
        context: [state, zip].filter(Boolean).join(" ") || prediction.structured_formatting?.secondary_text,
        city,
        state,
        zip,
      });
    } catch (error) {
      console.warn("Google place details lookup failed:", error);
    }
  }

  return results;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, limit = 5 }: GeocodeRequest = await req.json();
    if (!query || query.trim().length < 2) return buildJsonResponse({ results: [] });

    const trimmedQuery = query.trim();
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const zipMatch = trimmedQuery.match(/^(\d{5})$/);

    if (zipMatch) {
      const zip = zipMatch[1];
      if (GOOGLE_MAPS_API_KEY) {
        try {
          const googleResults = await googleZipLookup(zip, GOOGLE_MAPS_API_KEY);
          if (googleResults.length) return buildJsonResponse({ results: googleResults, source: "google" });
        } catch (error) {
          console.warn("Google ZIP lookup failed, using fallback:", error);
        }
      }

      try {
        const fallbackResults = await lookupZipWithZippopotam(zip);
        return buildJsonResponse({ results: fallbackResults, source: "zippopotam" });
      } catch (error) {
        console.error("ZIP fallback lookup failed:", error);
        return buildJsonResponse({ results: [], error: "ZIP_LOOKUP_FAILED" }, 200);
      }
    }

    const latLng = parseLatLngQuery(trimmedQuery);
    if (latLng) {
      if (GOOGLE_MAPS_API_KEY) {
        try {
          const reverseUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latLng.lat},${latLng.lng}&key=${GOOGLE_MAPS_API_KEY}`;
          const reverseRes = await fetch(reverseUrl);
          const reverseData = reverseRes.ok ? await reverseRes.json() : null;
          const first = reverseData?.status === "OK" ? reverseData.results?.[0] : null;
          if (first?.formatted_address) {
            const comps = first.address_components || [];
            const cityComp = comps.find((c: any) => c.types.includes("locality") || c.types.includes("postal_town") || c.types.includes("sublocality"));
            const stateComp = comps.find((c: any) => c.types.includes("administrative_area_level_1"));
            const zipComp = comps.find((c: any) => c.types.includes("postal_code"));
            const city = cityComp?.long_name || "";
            const state = stateComp?.short_name || "";
            const zip = zipComp?.long_name || "";
            return buildJsonResponse({
              results: [{
                id: `latlng:${latLng.lat},${latLng.lng}`,
                placeName: first.formatted_address,
                center: [latLng.lng, latLng.lat],
                text: city || first.formatted_address.split(",")[0],
                context: [state, zip].filter(Boolean).join(" "),
                city,
                state,
                zip,
              } satisfies GeocodeResult],
              source: "google",
            });
          }
        } catch (error) {
          console.warn("Google reverse geocode failed, using fallback:", error);
        }
      }

      try {
        const results = await reverseNominatim(latLng.lat, latLng.lng);
        return buildJsonResponse({ results, source: "openstreetmap" });
      } catch (error) {
        console.error("Reverse geocode fallback failed:", error);
        return buildJsonResponse({ results: [], error: "REVERSE_GEOCODING_UNAVAILABLE" }, 200);
      }
    }

    if (GOOGLE_MAPS_API_KEY) {
      try {
        const googleResults = await googleAutocomplete(trimmedQuery, limit, GOOGLE_MAPS_API_KEY);
        if (googleResults.length) return buildJsonResponse({ results: googleResults, source: "google" });
      } catch (error) {
        console.warn("Google autocomplete failed, using fallback:", error);
      }
    }

    try {
      const fallbackResults = await searchNominatim(trimmedQuery, limit);
      return buildJsonResponse({ results: fallbackResults, source: "openstreetmap" });
    } catch (error) {
      console.error("Geocoding fallback failed:", error);
      return buildJsonResponse({ results: [], error: "GEOCODING_UNAVAILABLE" }, 200);
    }
  } catch (error: any) {
    console.error("Error in geocode-location function:", error);
    return buildJsonResponse({ results: [], error: error?.message || "GEOCODING_ERROR" }, 200);
  }
};

serve(handler);
