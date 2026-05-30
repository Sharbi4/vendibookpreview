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
  price_daily: number | null;
  price_sale: number | null;
  cover_image_url: string | null;
  published_at: string;
}

interface AvailabilityAlert {
  id: string;
  email: string;
  zip_code: string;
  category: string | null;
  mode: string | null;
  notified_at: string | null;
}

// Extract zip code from address string
function extractZipCode(address: string | null): string | null {
  if (!address) return null;
  const zipMatch = address.match(/\b\d{5}(-\d{4})?\b/);
  return zipMatch ? zipMatch[0].substring(0, 5) : null;
}

// Check if zip codes are in the same area (first 3 digits match = same region)
function isNearbyZipCode(listingZip: string | null, alertZip: string): boolean {
  if (!listingZip) return false;
  // Match first 3 digits for regional proximity
  return listingZip.substring(0, 3) === alertZip.substring(0, 3);
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting availability alert job...");

    // Get listings published in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: newListings, error: listingsError } = await supabase
      .from("listings")
      .select("id, title, category, mode, address, price_daily, price_sale, cover_image_url, published_at")
      .eq("status", "published")
      .gte("published_at", oneHourAgo);

    if (listingsError) {
      console.error("Error fetching listings:", listingsError);
      throw listingsError;
    }

    if (!newListings || newListings.length === 0) {
      console.log("No new listings found in the last hour");
      return new Response(
        JSON.stringify({ success: true, message: "No new listings to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${newListings.length} new listing(s)`);

    // Get all active alerts (not unsubscribed)
    const { data: alerts, error: alertsError } = await supabase
      .from("availability_alerts")
      .select("*")
      .is("unsubscribed_at", null);

    if (alertsError) {
      console.error("Error fetching alerts:", alertsError);
      throw alertsError;
    }

    if (!alerts || alerts.length === 0) {
      console.log("No active alerts found");
      return new Response(
        JSON.stringify({ success: true, message: "No active alerts" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${alerts.length} active alert(s)`);

    let emailsSent = 0;
    const processedAlerts: string[] = [];

    // For each listing, find matching alerts and send emails
    for (const listing of newListings as Listing[]) {
      const listingZip = extractZipCode(listing.address);
      
      for (const alert of alerts as AvailabilityAlert[]) {
        // Skip if already processed this alert in this run
        if (processedAlerts.includes(alert.id)) continue;

        // Check if listing matches alert criteria
        const categoryMatch = !alert.category || alert.category === listing.category;
        const modeMatch = !alert.mode || alert.mode === listing.mode;
        const locationMatch = isNearbyZipCode(listingZip, alert.zip_code);

        if (categoryMatch && modeMatch && locationMatch) {
          console.log(`Match found: Alert ${alert.id} matches listing ${listing.id}`);

          // Format price
          const price = listing.mode === "rent" 
            ? `$${listing.price_daily?.toLocaleString()}/day` 
            : `$${listing.price_sale?.toLocaleString()}`;

          // Format category for display
          const categoryLabels: Record<string, string> = {
            food_truck: "Food Truck",
            food_trailer: "Food Trailer",
            ghost_kitchen: "Shared Kitchen",
            vendor_lot: "Vendor Lot",
          };
          const categoryLabel = categoryLabels[listing.category] || listing.category;

          try {
            const { error: emailError } = await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "new-message",
                recipientEmail: alert.email,
                idempotencyKey: `availability-${alert.id}-${listing.id}`,
                templateData: {
                  name: "there",
                  subject: `New ${categoryLabel} Available Near You!`,
                  message: `${listing.title} just went live in zip code area ${alert.zip_code}. ${categoryLabel} — ${price}.`,
                  ctaUrl: `https://vendibook.com/listing/${listing.id}`,
                  ctaLabel: "View Listing",
                  listingId: listing.id,
                  listingTitle: listing.title,
                },
              },
            });
            if (emailError) {
              console.error(`Email invoke error:`, emailError);
            } else {
              emailsSent++;
              processedAlerts.push(alert.id);
              await supabase
                .from("availability_alerts")
                .update({ notified_at: new Date().toISOString() })
                .eq("id", alert.id);
            }
          } catch (emailError) {
            console.error(`Failed to send email to ${alert.email}:`, emailError);
          }
        }
      }
    }

    console.log(`Job complete. Sent ${emailsSent} email(s)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        listings_processed: newListings.length,
        emails_sent: emailsSent 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in availability alert job:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
