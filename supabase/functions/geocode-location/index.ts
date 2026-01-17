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

const handler = async (req: Request): Promise<Response> => {
  console.log("geocode-location function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("GOOGLE_MAPS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { query, limit = 5 }: GeocodeRequest = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Geocoding query:", query);

    // If the query looks like coordinates, use Reverse Geocoding.
    const latLng = parseLatLngQuery(query);
    if (latLng) {
      const reverseUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latLng.lat},${latLng.lng}&key=${GOOGLE_MAPS_API_KEY}`;
      const reverseRes = await fetch(reverseUrl);

      if (!reverseRes.ok) {
        console.error("Google Reverse Geocode API error:", reverseRes.status, await reverseRes.text());
        return new Response(
          JSON.stringify({ error: "Geocoding service error" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const reverseData = await reverseRes.json();
      if (reverseData.status !== "OK" && reverseData.status !== "ZERO_RESULTS") {
        console.error("Google Reverse Geocode API status error:", reverseData.status, reverseData.error_message);
        return new Response(
          JSON.stringify({ error: reverseData.error_message || "Geocoding failed" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
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

      console.log(`Found ${results.length} results for "${query}" (reverse geocode)`);

      return new Response(
        JSON.stringify({ results }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Call Google Places Autocomplete API
    const encodedQuery = encodeURIComponent(query.trim());
    const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedQuery}&key=${GOOGLE_MAPS_API_KEY}&components=country:us&types=geocode`;

    const response = await fetch(googleUrl);
    
    if (!response.ok) {
      console.error("Google API error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ error: "Geocoding service error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = await response.json();
    
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google API status error:", data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: data.error_message || "Geocoding failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get details for each prediction to get coordinates
    const predictions = data.predictions?.slice(0, limit) || [];
    const results: GeocodeResult[] = [];

    for (const prediction of predictions) {
      try {
        // Get place details to get coordinates
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_API_KEY}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        if (detailsData.status === "OK" && detailsData.result) {
          const location = detailsData.result.geometry?.location;
          if (location) {
            results.push({
              id: prediction.place_id,
              placeName: detailsData.result.formatted_address || prediction.description,
              center: [location.lng, location.lat], // [lng, lat] to match expected format
              text: prediction.structured_formatting?.main_text || prediction.description.split(',')[0],
              context: prediction.structured_formatting?.secondary_text || prediction.description.split(',').slice(1).join(',').trim(),
            });
          }
        }
      } catch (err) {
        console.error("Error fetching place details:", err);
      }
    }

    console.log(`Found ${results.length} results for "${query}"`);

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in geocode-location function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
