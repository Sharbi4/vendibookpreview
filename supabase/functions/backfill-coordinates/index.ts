import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAdminOrInternalCaller, internalOnlyResponse } from "../_shared/internalAuth.ts";

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

function googleStateShort(result: any): string {
  return (
    (result?.address_components ?? [])
      .find((c: any) => (c.types ?? []).includes("administrative_area_level_1"))
      ?.short_name ?? ""
  );
}

// Returns { lat, lng, locality, postal } or null. Tries each configured Google key:
// the first key that yields a component-matching result wins. Keys that Google
// rejects outright are skipped so a stale secret never blocks a working one.
async function geocodeWithGoogle(
  address: string,
  storedPostal: string,
  storedState: string,
  keys: string[],
): Promise<{ lat: number; lng: number; postal: string; locality: string; via: string } | null> {
  const encoded = encodeURIComponent(address);
  for (const key of keys) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${key}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "REQUEST_DENIED") {
        console.warn(`Google key rejected (${data.error_message ?? "denied"}), trying next key`);
        continue;
      }
      if (data.status !== "OK" || !data.results?.length) {
        return null; // genuine ZERO_RESULTS etc. — a different key won't change it
      }
      for (const candidate of data.results) {
        const comps = extractComponents(candidate);
        const postal = (comps["postal_code"] ?? "").trim();
        const stateLong = (comps["administrative_area_level_1"] ?? "").trim().toLowerCase();
        const stateShort = googleStateShort(candidate).toLowerCase();
        if (storedPostal && postal !== storedPostal) continue;
        if (storedState && storedState !== stateLong && storedState !== stateShort) continue;
        return {
          lat: candidate.geometry.location.lat,
          lng: candidate.geometry.location.lng,
          postal,
          locality: comps["locality"] ?? comps["sublocality_level_1"] ?? "",
          via: "google",
        };
      }
      return null; // results existed but none matched stored postal/state
    } catch (err) {
      console.warn("Google geocode attempt threw:", err);
    }
  }
  return null;
}

// Mapbox fallback (existing project token). Validates postcode + region context.
async function geocodeWithMapbox(
  address: string,
  storedPostal: string,
  storedState: string,
  token: string,
): Promise<{ lat: number; lng: number; postal: string; locality: string; via: string } | null> {
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&country=US&limit=5&types=address,place,postcode`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("Mapbox geocode HTTP error:", res.status);
      return null;
    }
    const data = await res.json();
    for (const feature of data.features ?? []) {
      const ctx: Record<string, string> = {};
      for (const c of feature.context ?? []) {
        const kind = String(c.id ?? "").split(".")[0];
        ctx[kind] = c.text ?? "";
        if (kind === "postcode" && feature.place_type?.includes("postcode") && !ctx.postcode) {
          ctx.postcode = feature.text ?? "";
        }
      }
      // When the feature itself is a postcode/place, its own text is the value
      if (feature.place_type?.includes("postcode")) ctx.postcode = ctx.postcode || feature.text;
      if (feature.place_type?.includes("place")) ctx.place = ctx.place || feature.text;

      const postal = (ctx.postcode ?? "").trim();
      const region = (ctx.region ?? "").trim().toLowerCase();
      const regionShort = (feature.context ?? [])
        .find((c: any) => String(c.id ?? "").startsWith("region"))
        ?.short_code?.replace(/^US-/i, "")
        ?.toLowerCase() ?? "";
      const isStreetLevel = feature.place_type?.includes("address");

      if (storedPostal && postal !== storedPostal) continue;
      if (storedState && storedState !== region && storedState !== regionShort) continue;
      // For non-street-level matches require the postal code to anchor confidence.
      if (!isStreetLevel && !storedPostal) continue;

      const [lng, lat] = feature.center ?? [];
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      return { lat, lng, postal, locality: ctx.place ?? "", via: isStreetLevel ? "mapbox" : "mapbox_postcode" };
    }
    return null;
  } catch (err) {
    console.warn("Mapbox geocode attempt threw:", err);
    return null;
  }
}

// ZIP-centroid fallback via the same Zippopotam service geocode-location already uses.
// Gated on city + state match. Produces ZIP-level (not street-level) coordinates.
async function geocodeZipCentroid(
  postal: string,
  storedCity: string,
  storedState: string,
): Promise<{ lat: number; lng: number; postal: string; locality: string; via: string } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${postal}`);
    if (!res.ok) return null;
    const payload = await res.json();
    const places = payload?.places ?? [];
    const match = places.find((p: any) => {
      const name = (p["place name"] ?? "").trim().toLowerCase();
      const st = (p["state abbreviation"] ?? p.state ?? "").trim().toLowerCase();
      const stateFull = (p.state ?? "").trim().toLowerCase();
      return (
        name === storedCity.toLowerCase() &&
        (st === storedState.toLowerCase() || stateFull === storedState.toLowerCase())
      );
    }) ?? places[0]; // USPS names can differ; fall back to first place but still verify state below
    if (!match) return null;
    const st = (match["state abbreviation"] ?? "").trim().toLowerCase();
    if (st !== storedState.toLowerCase()) return null;
    return {
      lat: Number(match.latitude),
      lng: Number(match.longitude),
      postal,
      locality: match["place name"] ?? "",
      via: "zip_centroid",
    };
  } catch (err) {
    console.warn("Zippopotam fallback threw:", err);
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Paid geocoding API calls — internal scheduler or signed-in admin only.
  if (!(await isAdminOrInternalCaller(req))) {
    return internalOnlyResponse(corsHeaders);
  }

  try {
    const GOOGLE_KEYS = [
      Deno.env.get("GOOGLE_API_KEY"),
      Deno.env.get("GOOGLE_MAPS_BROWSER_KEY"),
      Deno.env.get("GOOGLE_MAPS_API_KEY"),
    ].filter((k): k is string => !!k);
    const MAPBOX_TOKEN = Deno.env.get("MAPBOX_PUBLIC_TOKEN") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (GOOGLE_KEYS.length === 0 && !MAPBOX_TOKEN) {
      return new Response(JSON.stringify({ error: "No geocoding provider configured" }), {
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

    const results: Record<string, unknown>[] = [];

    for (const listing of listings || []) {
      const address = listing.address?.trim();

      if (!address || address.length < 3) {
        results.push({ id: listing.id, title: listing.title, status: "skipped_no_address" });
        continue;
      }

      const storedPostal = (listing.postal_code ?? "").trim();
      const storedState = (listing.state ?? "").trim().toLowerCase();
      const storedCity = (listing.city ?? "").trim();

      try {
        // Confidence-gated provider chain: Google (street) -> Mapbox (street/postcode)
        // -> ZIP centroid (city-level, only when postal+state match stored values).
        let geo = await geocodeWithGoogle(address, storedPostal, storedState, GOOGLE_KEYS);
        if (!geo && MAPBOX_TOKEN) {
          geo = await geocodeWithMapbox(address, storedPostal, storedState, MAPBOX_TOKEN);
        }
        if (!geo && storedPostal && storedCity && storedState) {
          geo = await geocodeZipCentroid(storedPostal, storedCity, storedState);
        }

        if (!geo) {
          results.push({ id: listing.id, title: listing.title, status: "low_confidence", address });
          console.warn(`No confident geocode for "${address}" (listing "${listing.title}")`);
          continue;
        }

        const { error: updateError } = await supabase
          .from("listings")
          .update({ latitude: geo.lat, longitude: geo.lng })
          .eq("id", listing.id);

        if (updateError) {
          results.push({ id: listing.id, title: listing.title, status: "update_failed", address });
        } else {
          results.push({
            id: listing.id,
            title: listing.title,
            status: geo.via === "zip_centroid" ? "geocoded_zip_centroid" : "geocoded",
            via: geo.via,
            address,
            lat: geo.lat,
            lng: geo.lng,
            matched_postal: geo.postal,
            matched_locality: geo.locality,
          });
          console.log(`Geocoded (${geo.via}): "${listing.title}" -> ${geo.lat}, ${geo.lng}`);
        }

        // Rate limit: 50ms between requests
        await new Promise((r) => setTimeout(r, 50));
      } catch (err) {
        results.push({ id: listing.id, title: listing.title, status: "error", address });
        console.error(`Error processing listing "${listing.title}":`, err);
      }
    }

    const geocoded = results.filter((r) => r.status === "geocoded").length;
    const centroids = results.filter((r) => r.status === "geocoded_zip_centroid").length;
    const failed = results.filter(
      (r) => r.status !== "geocoded" && r.status !== "geocoded_zip_centroid" && r.status !== "skipped_no_address",
    ).length;
    const skipped = results.filter((r) => r.status === "skipped_no_address").length;

    return new Response(
      JSON.stringify({ total: results.length, geocoded, zip_centroids: centroids, failed, skipped, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err: any) {
    console.error("Backfill error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
