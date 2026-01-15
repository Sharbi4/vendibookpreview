import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-NEARBY-LISTINGS] ${step}${detailsStr}`);
};

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { latitude, longitude, radius_miles = 100, limit = 20 } = await req.json();

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ 
        error: "latitude and longitude are required",
        listings: []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Request params", { latitude, longitude, radius_miles, limit });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch all published listings with coordinates
    const { data: listings, error } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("status", "published")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (error) {
      logStep("Database error", { error: error.message });
      throw new Error(error.message);
    }

    logStep("Fetched listings", { count: listings?.length || 0 });

    // Calculate distance for each listing and filter by radius
    const listingsWithDistance = (listings || [])
      .map(listing => ({
        ...listing,
        distance_miles: calculateDistance(
          latitude, 
          longitude, 
          listing.latitude, 
          listing.longitude
        )
      }))
      .filter(listing => listing.distance_miles <= radius_miles)
      .sort((a, b) => a.distance_miles - b.distance_miles)
      .slice(0, limit);

    logStep("Filtered nearby listings", { 
      nearbyCount: listingsWithDistance.length,
      closestDistance: listingsWithDistance[0]?.distance_miles 
    });

    // Get host verification status
    const hostIds = [...new Set(listingsWithDistance.map(l => l.host_id))];
    let hostVerificationMap: Record<string, boolean> = {};

    if (hostIds.length > 0) {
      const { data: profiles } = await supabaseClient
        .from("profiles")
        .select("id, identity_verified")
        .in("id", hostIds);

      if (profiles) {
        profiles.forEach(p => {
          hostVerificationMap[p.id] = p.identity_verified ?? false;
        });
      }
    }

    return new Response(JSON.stringify({ 
      listings: listingsWithDistance,
      hostVerificationMap,
      userLocation: { latitude, longitude },
      totalNearby: listingsWithDistance.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      listings: []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
