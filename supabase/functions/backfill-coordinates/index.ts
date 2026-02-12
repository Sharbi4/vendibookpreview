import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: "Google Maps API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all listings missing coordinates
    const { data: listings, error } = await supabase
      .from("listings")
      .select("id, title, address")
      .or("latitude.is.null,longitude.is.null");

    if (error) throw error;

    console.log(`Found ${listings?.length || 0} listings without coordinates`);

    const results: { id: string; title: string; status: string; address?: string }[] = [];

    for (const listing of listings || []) {
      const address = listing.address?.trim();

      if (!address || address.length < 3) {
        results.push({ id: listing.id, title: listing.title, status: "skipped_no_address" });
        continue;
      }

      try {
        const encodedQuery = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === "OK" && data.results?.length > 0) {
          const location = data.results[0].geometry.location;
          const { error: updateError } = await supabase
            .from("listings")
            .update({ latitude: location.lat, longitude: location.lng })
            .eq("id", listing.id);

          if (updateError) {
            results.push({ id: listing.id, title: listing.title, status: "update_failed", address });
          } else {
            results.push({ id: listing.id, title: listing.title, status: "geocoded", address });
            console.log(`Geocoded: "${listing.title}" -> ${location.lat}, ${location.lng}`);
          }
        } else {
          results.push({ id: listing.id, title: listing.title, status: "geocode_failed", address });
          console.warn(`Could not geocode "${address}" for listing "${listing.title}"`);
        }

        // Rate limit: 50ms between requests
        await new Promise((r) => setTimeout(r, 50));
      } catch (err) {
        results.push({ id: listing.id, title: listing.title, status: "error", address });
        console.error(`Error processing listing "${listing.title}":`, err);
      }
    }

    const geocoded = results.filter((r) => r.status === "geocoded").length;
    const failed = results.filter((r) => r.status !== "geocoded" && r.status !== "skipped_no_address").length;
    const skipped = results.filter((r) => r.status === "skipped_no_address").length;

    return new Response(
      JSON.stringify({ total: results.length, geocoded, failed, skipped, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("Backfill error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
