import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "atlasmom421@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "new_user" | "new_booking" | "booking_paid" | "sale_payment" | "newsletter_signup";
  data: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Admin notification function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data }: NotificationRequest = await req.json();
    console.log(`Processing notification type: ${type}`, data);

    let subject = "";
    let html = "";

    switch (type) {
      case "new_user":
        subject = "🎉 New User Signup - VendiBook";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #FF5124;">New User Registered!</h1>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email:</strong> ${data.email || "N/A"}</p>
              <p><strong>Name:</strong> ${data.full_name || "Not provided"}</p>
              <p><strong>Signed up at:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="color: #666;">A new user has joined VendiBook. Welcome them to the platform!</p>
          </div>
        `;
        break;

      case "new_booking":
        subject = "📅 New Booking Request - VendiBook";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #FF5124;">New Booking Request!</h1>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Listing:</strong> ${data.listing_title || "N/A"}</p>
              <p><strong>Dates:</strong> ${data.start_date || "N/A"} to ${data.end_date || "N/A"}</p>
              <p><strong>Total Price:</strong> $${data.total_price || "N/A"}</p>
              <p><strong>Shopper ID:</strong> ${data.shopper_id || "N/A"}</p>
              <p><strong>Host ID:</strong> ${data.host_id || "N/A"}</p>
              <p><strong>Message:</strong> ${data.message || "No message"}</p>
            </div>
            <p style="color: #666;">A new booking request has been submitted on VendiBook.</p>
          </div>
        `;
        break;

      case "booking_paid":
        subject = "💰 Booking Payment Received - VendiBook";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">Payment Received!</h1>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Booking ID:</strong> ${data.booking_id || "N/A"}</p>
              <p><strong>Listing:</strong> ${data.listing_title || "N/A"}</p>
              <p><strong>Amount:</strong> $${data.amount || data.total_price || "N/A"}</p>
              <p><strong>Payment Intent:</strong> ${data.payment_intent_id || "N/A"}</p>
              <p><strong>Paid at:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="color: #666;">A booking payment has been successfully processed on VendiBook.</p>
          </div>
        `;
        break;

      case "sale_payment":
        subject = "🛒 Sale Payment Received (Escrow) - VendiBook";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #22c55e;">Sale Payment in Escrow!</h1>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Listing ID:</strong> ${data.listing_id || "N/A"}</p>
              <p><strong>Amount:</strong> $${data.amount || "N/A"}</p>
              <p><strong>Checkout Session:</strong> ${data.checkout_session_id || "N/A"}</p>
              <p><strong>Payment Intent:</strong> ${data.payment_intent_id || "N/A"}</p>
              <p><strong>Buyer ID:</strong> ${data.buyer_id || "N/A"}</p>
              <p><strong>Seller ID:</strong> ${data.seller_id || "N/A"}</p>
              <p><strong>Received at:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="color: #666;">A sale payment has been received and is held in escrow until both parties confirm.</p>
          </div>
        `;
        break;

      case "newsletter_signup":
        subject = "📧 New Newsletter Subscriber - VendiBook";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #FF5124;">New Newsletter Subscriber!</h1>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email:</strong> ${data.email || "N/A"}</p>
              <p><strong>Source:</strong> ${data.source || "Unknown"}</p>
              <p><strong>Subscribed at:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="color: #666;">A new user has subscribed to the VendiBook newsletter.</p>
          </div>
        `;
        break;

      default:
        console.log(`Unknown notification type: ${type}`);
        return new Response(
          JSON.stringify({ error: "Unknown notification type" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    console.log(`Sending email to admin: ${ADMIN_EMAIL}`);
    
    const emailResponse = await resend.emails.send({
      from: "Vendibook <updates@vendibook.com>",
      to: [ADMIN_EMAIL],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-admin-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
