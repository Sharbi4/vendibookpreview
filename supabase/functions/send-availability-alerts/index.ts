import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Listing {
  id: string;
  title: string;
  category: string;
  mode: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  price_daily: number | null;
  price_sale: number | null;
  cover_image_url: string | null;
  published_at: string;
}

interface AvailabilityAlert {
  id: string;
  email: string;
  name: string | null;
  zip_code: string;
  category: string | null;
  mode: string | null;
  radius_miles: number | null;
  latitude: number | null;
  longitude: number | null;
  notified_at: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  food_truck: "Food Truck",
  food_trailer: "Food Trailer",
  ghost_kitchen: "Shared Kitchen",
  vendor_lot: "Vendor Lot",
};

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function extractZip(address: string | null): string | null {
  if (!address) return null;
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}

async function geocodeZip(zip: string): Promise<{ lat: number; lng: number; city?: string; state?: string } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.places?.[0];
    if (!place) return null;
    const lat = Number(place.latitude);
    const lng = Number(place.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, city: place["place name"], state: place["state abbreviation"] };
  } catch {
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    // Allow operator override; default look-back window = 65 minutes (cron runs hourly).
    const lookbackMinutes: number = Number(body?.lookback_minutes) || 65;
    const sinceIso = new Date(Date.now() - lookbackMinutes * 60 * 1000).toISOString();

    console.log(`[availability-alerts] window since ${sinceIso}`);

    const { data: newListings, error: listingsError } = await supabase
      .from("listings")
      .select("id, title, category, mode, address, latitude, longitude, price_daily, price_sale, cover_image_url, published_at")
      .eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear")
      .gte("published_at", sinceIso);

    if (listingsError) throw listingsError;
    if (!newListings?.length) {
      return new Response(JSON.stringify({ success: true, listings: 0, emails: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: alerts, error: alertsError } = await supabase
      .from("availability_alerts")
      .select("id, email, name, zip_code, category, mode, radius_miles, latitude, longitude, notified_at")
      .is("unsubscribed_at", null);

    if (alertsError) throw alertsError;
    if (!alerts?.length) {
      return new Response(JSON.stringify({ success: true, listings: newListings.length, emails: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lazily geocode alerts that are missing coordinates.
    const geocodeCache = new Map<string, { lat: number; lng: number } | null>();
    const enriched: AvailabilityAlert[] = [];
    for (const a of alerts as AvailabilityAlert[]) {
      if (a.latitude != null && a.longitude != null) {
        enriched.push(a);
        continue;
      }
      const zip = a.zip_code?.match(/^\d{5}$/) ? a.zip_code : extractZip(a.zip_code);
      if (!zip) {
        enriched.push(a);
        continue;
      }
      let coords = geocodeCache.get(zip);
      if (coords === undefined) {
        coords = await geocodeZip(zip);
        geocodeCache.set(zip, coords);
      }
      if (coords) {
        await supabase
          .from("availability_alerts")
          .update({ latitude: coords.lat, longitude: coords.lng, last_geocoded_at: new Date().toISOString() })
          .eq("id", a.id);
        enriched.push({ ...a, latitude: coords.lat, longitude: coords.lng });
      } else {
        enriched.push(a);
      }
    }

    let emailsSent = 0;
    const notifiedThisRun = new Set<string>(); // one email per alert per run

    for (const listing of newListings as Listing[]) {
      // Resolve listing coords (fall back to ZIP centroid if missing).
      let lLat = listing.latitude;
      let lLng = listing.longitude;
      let lCity: string | undefined;
      let lState: string | undefined;
      if (lLat == null || lLng == null) {
        const zip = extractZip(listing.address);
        if (zip) {
          let coords = geocodeCache.get(zip);
          if (coords === undefined) {
            const g = await geocodeZip(zip);
            geocodeCache.set(zip, g);
            coords = g;
            if (g) { lCity = g.city; lState = g.state; }
          }
          if (coords) { lLat = coords.lat; lLng = coords.lng; }
        }
      }
      if (lLat == null || lLng == null) continue;

      for (const alert of enriched) {
        if (notifiedThisRun.has(alert.id)) continue;
        if (alert.latitude == null || alert.longitude == null) continue;

        if (alert.category && alert.category !== listing.category) continue;
        if (alert.mode && alert.mode !== listing.mode) continue;

        const radius = alert.radius_miles ?? 50;
        const distance = haversineMiles(alert.latitude, alert.longitude, lLat, lLng);
        if (distance > radius) continue;

        const categoryLabel = CATEGORY_LABELS[listing.category] || listing.category;
        const modeLabel = listing.mode === "rent" ? "For Rent" : "For Sale";
        const priceLabel = listing.mode === "rent"
          ? (listing.price_daily ? `$${listing.price_daily.toLocaleString()}/day` : "")
          : (listing.price_sale ? `$${listing.price_sale.toLocaleString()}` : "");

        try {
          const { error: emailError } = await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "new-listing-alert",
              recipientEmail: alert.email,
              idempotencyKey: `availability-${alert.id}-${listing.id}`,
              templateData: {
                name: alert.name || undefined,
                listingTitle: listing.title,
                listingId: listing.id,
                categoryLabel,
                modeLabel,
                priceLabel,
                city: lCity,
                state: lState,
                distanceMiles: distance,
                coverImageUrl: listing.cover_image_url || undefined,
              },
            },
          });
          if (emailError) {
            console.error(`[availability-alerts] email error for ${alert.email}`, emailError);
            continue;
          }
          emailsSent++;
          notifiedThisRun.add(alert.id);
          await supabase
            .from("availability_alerts")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", alert.id);
        } catch (e) {
          console.error(`[availability-alerts] invoke failed`, e);
        }
      }
    }

    console.log(`[availability-alerts] done. listings=${newListings.length} emails=${emailsSent}`);
    return new Response(
      JSON.stringify({ success: true, listings: newListings.length, emails: emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[availability-alerts] fatal", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
