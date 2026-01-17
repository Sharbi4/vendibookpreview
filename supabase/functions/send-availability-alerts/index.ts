import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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
            ghost_kitchen: "Ghost Kitchen",
            vendor_lot: "Vendor Lot",
          };
          const categoryLabel = categoryLabels[listing.category] || listing.category;

          // Send email using fetch to Resend API
          try {
            const appUrl = Deno.env.get("SUPABASE_URL")?.includes("localhost") 
              ? "http://localhost:5173" 
              : "https://vendibookpreview.lovable.app";

            const emailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    ${listing.cover_image_url ? `
                      <img src="${listing.cover_image_url}" alt="${listing.title}" style="width: 100%; height: 200px; object-fit: cover;" />
                    ` : `
                      <div style="width: 100%; height: 200px; background: linear-gradient(135deg, #f97316, #fb923c);"></div>
                    `}
                    
                    <div style="padding: 32px;">
                      <div style="display: inline-block; background: #fff7ed; color: #ea580c; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px;">
                        ${listing.mode === "rent" ? "FOR RENT" : "FOR SALE"}
                      </div>
                      
                      <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #18181b;">
                        ${listing.title}
                      </h1>
                      
                      <p style="margin: 0 0 16px 0; color: #71717a; font-size: 14px;">
                        ${categoryLabel} - ${listing.address || "Location available on listing"}
                      </p>
                      
                      <p style="margin: 0 0 24px 0; font-size: 28px; font-weight: 700; color: #f97316;">
                        ${price}
                      </p>
                      
                      <a href="${appUrl}/listing/${listing.id}" 
                         style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                        View Listing
                      </a>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin-top: 24px; color: #71717a; font-size: 12px;">
                    <p>You received this because you signed up for availability alerts for zip code ${alert.zip_code}.</p>
                    <p>
                      <a href="${appUrl}/unsubscribe-alert?id=${alert.id}" style="color: #71717a;">Unsubscribe from alerts</a>
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `;

            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "VendiBook <noreply@updates.vendibook.com>",
                to: [alert.email],
                subject: `New ${categoryLabel} Available Near You!`,
                html: emailHtml,
              }),
            });

            if (!emailResponse.ok) {
              const errorText = await emailResponse.text();
              console.error(`Resend API error: ${errorText}`);
            } else {
              console.log(`Email sent to ${alert.email}`);
              emailsSent++;
              processedAlerts.push(alert.id);

              // Update notified_at
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
