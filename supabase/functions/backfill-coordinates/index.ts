import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GeoComponents = Record<string, string>;

function extractComponents(result: any): GeoComponents {
  const out: GeoComponents = {};
  for (const c of result?.address_components ?? []) {
    for (const t of c.types ?? []) {
      if (!(t in out)) out[t] = c.long_name;
    }
  }
  return out;
}

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

    // Optional scoping: { ids: string[] } restricts the run to specific listings.
    let ids: string[] | null = null;
    try {
      const body = await req.json();
      if (Array.isArray(body?.ids) && body.ids.length > 0) {
        ids = body.ids.filter((x: unknown) => typeof x === "string");
      }
    } catch {
      // no/invalid body -> full backfill behavior
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get listings missing coordinates (optionally scoped to ids)
    let query = supabase
      .from("listings")
      .select("id, title, address, city, state, postal_code")
      .or("latitude.is.null,longitude.is.null");
    if (ids && ids.length > 0) {
      query = query.in("id", ids);
    }

    const { data: listings, error } = await query;

    if (error) throw error;

    console.log(`Found ${listings?.length || 0} listings without coordinates`);

    const results: {
      id: string;
      title: string;
      status: string;
      address?: string;
      lat?: number;
      lng?: number;
      matched_postal?: string;
      matched_locality?: string;
    }[] = [];

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

        if (data.status !== "OK" || !data.results?.length) {
          results.push({ id: listing.id, title: listing.title, status: "geocode_failed", address });
          console.warn(`Could not geocode "${address}" for listing "${listing.title}"`);
          await new Promise((r) => setTimeout(r, 50));
          continue;
        }

        // Confidence gate: when the listing stores postal_code/state, only persist
        // coordinates from a geocode result whose components match them. Never
        // persist a partial match (e.g. a city centroid) for a stored full address.
        const storedPostal = (listing.postal_code ?? "").trim();
        const storedState = (listing.state ?? "").trim().toLowerCase();

        let chosen: any = null;
        let chosenComps: GeoComponents = {};
        for (const candidate of data.results) {
          const comps = extractComponents(candidate);
          const postal = (comps["postal_code"] ?? "").trim();
          const stateLong = (comps["administrative_area_level_1"] ?? "").trim().toLowerCase();
          const candidateStateShort =
            (candidate.address_components ?? [])
              .find((c: any) => (c.types ?? []).includes("administrative_area_level_1"))
              ?.short_name?.toLowerCase() ?? "";

          if (storedPostal && postal !== storedPostal) continue;
          if (
            storedState &&
            storedState !== stateLong &&
            storedState !== candidateStateShort
          ) {
            continue;
          }

          chosen = candidate;
          chosenComps = comps;
          break;
        }

        if (!chosen) {
          results.push({ id: listing.id, title: listing.title, status: "low_confidence", address });
          console.warn(`No component-matching result for "${address}" (listing "${listing.title}")`);
          await new Promise((r) => setTimeout(r, 50));
          continue;
        }

        const location = chosen.geometry.location;
        const { error: updateError } = await supabase
          .from("listings")
          .update({ latitude: location.lat, longitude: location.lng })
          .eq("id", listing.id);

        if (updateError) {
          results.push({ id: listing.id, title: listing.title, status: "update_failed", address });
        } else {
          results.push({
            id: listing.id,
            title: listing.title,
            status: "geocoded",
            address,
            lat: location.lat,
            lng: location.lng,
            matched_postal: chosenComps["postal_code"],
            matched_locality: chosenComps["locality"] ?? chosenComps["sublocality_level_1"],
          });
          console.log(`Geocoded: "${listing.title}" -> ${location.lat}, ${location.lng}`);
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
