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

const handler = async (req: Request): Promise<Response> => {
  console.log("geocode-location function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAPBOX_TOKEN = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
    
    if (!MAPBOX_TOKEN) {
      console.error("MAPBOX_PUBLIC_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Mapbox token not configured" }),
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

    // Call Mapbox Geocoding API
    const encodedQuery = encodeURIComponent(query.trim());
    const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&country=us&types=place,locality,neighborhood,address,postcode&limit=${limit}`;

    const response = await fetch(mapboxUrl);
    
    if (!response.ok) {
      console.error("Mapbox API error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ error: "Geocoding service error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = await response.json();
    
    const results: GeocodeResult[] = data.features.map((feature: any) => ({
      id: feature.id,
      placeName: feature.place_name,
      center: feature.center, // [lng, lat]
      text: feature.text,
      context: feature.context?.map((c: any) => c.text).join(", "),
    }));

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
