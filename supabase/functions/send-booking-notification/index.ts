import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  booking_id: string;
  event_type: "submitted" | "approved" | "declined";
  host_response?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BOOKING-NOTIFICATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { booking_id, event_type, host_response }: NotificationRequest = await req.json();
    logStep("Request received", { booking_id, event_type });

    if (!booking_id || !event_type) {
      throw new Error("Missing required fields: booking_id and event_type");
    }

    // Fetch booking details with listing and user info
    const { data: booking, error: bookingError } = await supabaseClient
      .from("booking_requests")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Failed to fetch booking: ${bookingError?.message}`);
    }
    logStep("Booking fetched", { booking_id: booking.id, status: booking.status });

    // Fetch listing details
    const { data: listing, error: listingError } = await supabaseClient
      .from("listings")
      .select("title, cover_image_url, address, fulfillment_type")
      .eq("id", booking.listing_id)
      .single();

    if (listingError) {
      logStep("Warning: Could not fetch listing", { error: listingError.message });
    }

    // Fetch shopper profile
    const { data: shopper, error: shopperError } = await supabaseClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", booking.shopper_id)
      .single();

    if (shopperError) {
      logStep("Warning: Could not fetch shopper", { error: shopperError.message });
    }

    // Fetch host profile
    const { data: host, error: hostError } = await supabaseClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", booking.host_id)
      .single();

    if (hostError) {
      logStep("Warning: Could not fetch host", { error: hostError.message });
    }

    const listingTitle = listing?.title || "your listing";
    const startDate = new Date(booking.start_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const endDate = new Date(booking.end_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Create short booking reference ID (first 8 chars uppercase)
    const bookingRef = booking.id.substring(0, 8).toUpperCase();

    const emails: { to: string; subject: string; html: string }[] = [];
    const inAppNotifications: { user_id: string; type: string; title: string; message: string; link: string }[] = [];

    if (event_type === "submitted") {
      // Email to host about new booking request
      if (host?.email) {
        emails.push({
          to: host.email,
          subject: `New Booking Request #${bookingRef} - ${listingTitle}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                @font-face {
                  font-family: 'Sofia Pro Soft';
                  src: url('https://vendibook-docs.s3.us-east-1.amazonaws.com/documents/sofiaprosoftlight-webfont.woff') format('woff');
                  font-weight: 300;
                  font-style: normal;
                }
              </style>
            </head>
            <body style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">New Booking Request 📩</h1>
                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    You have received a new booking request for <strong>${listingTitle}</strong>.
                  </p>
                  <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Booking Reference:</strong> #${bookingRef}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Guest:</strong> ${shopper?.full_name || "A shopper"}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Dates:</strong> ${startDate} - ${endDate}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Total:</strong> $${booking.total_price}</p>
                    ${booking.message ? `<p style="margin: 0;"><strong>Message:</strong> ${booking.message}</p>` : ""}
                  </div>
                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Please review and respond to this request as soon as possible.
                  </p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="https://vendibookpreview.lovable.app/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Booking Request
                    </a>
                  </div>
                  <p style="color: #888; font-size: 14px; margin-top: 30px;">
                    — The VendiBook Team<br>
                    <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      }
      
      // In-app notification to host
      inAppNotifications.push({
        user_id: booking.host_id,
        type: "booking_request",
        title: "New Booking Request",
        message: `${shopper?.full_name || "Someone"} requested to book ${listingTitle} from ${startDate} to ${endDate}`,
        link: "/dashboard",
      });

      // Confirmation email to shopper
      if (shopper?.email) {
        emails.push({
          to: shopper.email,
          subject: `Booking Request #${bookingRef} Submitted - ${listingTitle}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                @font-face {
                  font-family: 'Sofia Pro Soft';
                  src: url('https://vendibook-docs.s3.us-east-1.amazonaws.com/documents/sofiaprosoftlight-webfont.woff') format('woff');
                  font-weight: 300;
                  font-style: normal;
                }
              </style>
            </head>
            <body style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Booking Request Submitted ✓</h1>
                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                    Hi ${shopper.full_name || "there"},
                  </p>
                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Your booking request for <strong>${listingTitle}</strong> has been submitted successfully.
                  </p>
                  <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Booking Reference:</strong> #${bookingRef}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Dates:</strong> ${startDate} - ${endDate}</p>
                    <p style="margin: 0;"><strong>Total:</strong> $${booking.total_price}</p>
                  </div>
                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    The host will review your request and respond soon. We'll notify you once they respond.
                  </p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="https://vendibookpreview.lovable.app/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Booking Status
                    </a>
                  </div>
                  <p style="color: #888; font-size: 14px; margin-top: 30px;">
                    — The VendiBook Team<br>
                    <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      }
    } else if (event_type === "approved") {
      // Send branded booking confirmation email to shopper
      if (shopper?.email) {
        try {
          const confirmationResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-confirmation`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({
                email: shopper.email,
                fullName: shopper.full_name || "",
                listingTitle: listingTitle,
                startDate: booking.start_date,
                endDate: booking.end_date,
                totalPrice: booking.total_price,
                hostName: host?.full_name || "Your host",
                fulfillmentType: booking.fulfillment_selected || listing?.fulfillment_type || "pickup",
                address: listing?.address || booking.address_snapshot,
                deliveryAddress: booking.delivery_address,
                bookingId: booking.id,
              }),
            }
          );
          
          if (confirmationResponse.ok) {
            logStep("Branded booking confirmation email sent", { to: shopper.email });
          } else {
            const errorData = await confirmationResponse.json();
            logStep("Failed to send branded confirmation, falling back", { error: errorData });
            // Fallback to basic email
            emails.push({
              to: shopper.email,
              subject: `🎉 Booking #${bookingRef} Approved - ${listingTitle}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    @font-face {
                      font-family: 'Sofia Pro Soft';
                      src: url('https://vendibook-docs.s3.us-east-1.amazonaws.com/documents/sofiaprosoftlight-webfont.woff') format('woff');
                      font-weight: 300;
                      font-style: normal;
                    }
                  </style>
                </head>
                <body style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                      <h1 style="color: #16a34a; font-size: 24px; margin: 0 0 20px 0;">Booking Approved! 🎉</h1>
                      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                        Great news, ${shopper.full_name || "there"}!
                      </p>
                      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Your booking for <strong>${listingTitle}</strong> has been approved by the host.
                      </p>
                      <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Booking Reference:</strong> #${bookingRef}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Confirmed Dates:</strong> ${startDate} - ${endDate}</p>
                        <p style="margin: 0;"><strong>Total:</strong> $${booking.total_price}</p>
                      </div>
                      ${host_response ? `
                        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
                          <p style="margin: 0 0 10px 0; font-weight: bold;">Message from host:</p>
                          <p style="margin: 0; color: #4a4a4a;">${host_response}</p>
                        </div>
                      ` : ""}
                      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                        You can message the host through your dashboard if you have any questions.
                      </p>
                      <div style="text-align: center; margin: 24px 0;">
                        <a href="https://vendibookpreview.lovable.app/dashboard" 
                           style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          View Booking Details
                        </a>
                      </div>
                      <p style="color: #888; font-size: 14px; margin-top: 30px;">
                        — The VendiBook Team<br>
                        <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a>
                      </p>
                    </div>
                  </div>
                </body>
                </html>
              `,
            });
          }
        } catch (confirmError: any) {
          logStep("Error calling booking confirmation function", { error: confirmError.message });
        }
      }
      
      // In-app notification to shopper
      inAppNotifications.push({
        user_id: booking.shopper_id,
        type: "booking_approved",
        title: "Booking Approved!",
        message: `Your booking for ${listingTitle} from ${startDate} to ${endDate} has been approved`,
        link: "/dashboard",
      });
    } else if (event_type === "declined") {
      // Email to shopper about decline
      if (shopper?.email) {
        emails.push({
          to: shopper.email,
          subject: `Booking #${bookingRef} Update - ${listingTitle}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                @font-face {
                  font-family: 'Sofia Pro Soft';
                  src: url('https://vendibook-docs.s3.us-east-1.amazonaws.com/documents/sofiaprosoftlight-webfont.woff') format('woff');
                  font-weight: 300;
                  font-style: normal;
                }
              </style>
            </head>
            <body style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Booking Not Available</h1>
                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                    Hi ${shopper.full_name || "there"},
                  </p>
                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 12px 0;">
                    <strong>Booking Reference:</strong> #${bookingRef}
                  </p>
                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Unfortunately, the host was unable to approve your booking request for <strong>${listingTitle}</strong> for ${startDate} - ${endDate}.
                  </p>
                  ${host_response ? `
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
                      <p style="margin: 0 0 10px 0; font-weight: bold;">Message from host:</p>
                      <p style="margin: 0; color: #4a4a4a;">${host_response}</p>
                    </div>
                  ` : ""}
                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Don't worry! There are plenty of other great options available. Browse our marketplace to find your perfect match.
                  </p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="https://vendibookpreview.lovable.app/search" 
                       style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Browse Listings
                    </a>
                  </div>
                  <p style="color: #888; font-size: 14px; margin-top: 30px;">
                    — The VendiBook Team<br>
                    <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      }
      
      // In-app notification to shopper
      inAppNotifications.push({
        user_id: booking.shopper_id,
        type: "booking_declined",
        title: "Booking Declined",
        message: `Your booking request for ${listingTitle} was not approved${host_response ? `: "${host_response}"` : ""}`,
        link: "/dashboard",
      });
    }
    
    // Create in-app notifications
    for (const notif of inAppNotifications) {
      try {
        await supabaseClient.from("notifications").insert(notif);
        logStep("In-app notification created", { user_id: notif.user_id, type: notif.type });
      } catch (notifError: any) {
        logStep("Failed to create in-app notification", { error: notifError.message });
      }
    }

    // Send all emails using fetch to Resend API
    const results = [];
    for (const email of emails) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "VendiBook <noreply@updates.vendibook.com>",
            to: [email.to],
            subject: email.subject,
            html: email.html,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to send email");
        }
        
        logStep("Email sent", { to: email.to, subject: email.subject });
        results.push({ success: true, to: email.to });
      } catch (emailError: any) {
        logStep("Failed to send email", { to: email.to, error: emailError.message });
        results.push({ success: false, to: email.to, error: emailError.message });
      }
    }

    logStep("Function completed", { emailsSent: results.filter(r => r.success).length });

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
