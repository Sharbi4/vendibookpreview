import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

    const siteUrl = Deno.env.get("SITE_URL") || "https://vendibook.com";
    const logoUrl = `${siteUrl}/images/vendibook-email-logo.png`;

    let subject = "";
    let contentHtml = "";
    let iconEmoji = "";
    let iconBgColor = "";

    switch (type) {
      case "new_user":
        subject = "🎉 New User Signup - VendiBook";
        iconEmoji = "👤";
        iconBgColor = "linear-gradient(135deg, #FF5124 0%, #FF7A50 100%)";
        contentHtml = `
          <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 20px 0;">New User Registered!</h2>
          <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.email || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Name:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.full_name || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Signed up at:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">A new user has joined VendiBook. Welcome them to the platform!</p>
        `;
        break;

      case "new_booking":
        subject = "📅 New Booking Request - VendiBook";
        iconEmoji = "📅";
        iconBgColor = "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)";
        contentHtml = `
          <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 20px 0;">New Booking Request!</h2>
          <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Listing:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.listing_title || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Dates:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.start_date || "N/A"} to ${data.end_date || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Total Price:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #22c55e; font-size: 14px;">$${data.total_price || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Shopper ID:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.shopper_id || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Host ID:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.host_id || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Message:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.message || "No message"}</td>
              </tr>
            </table>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">A new booking request has been submitted on VendiBook.</p>
        `;
        break;

      case "booking_paid":
        subject = "💰 Booking Payment Received - VendiBook";
        iconEmoji = "💰";
        iconBgColor = "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)";
        contentHtml = `
          <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 20px 0;">Payment Received!</h2>
          <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Booking ID:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.booking_id || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Listing:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.listing_title || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #22c55e; font-size: 14px;">$${data.amount || data.total_price || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Payment Intent:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.payment_intent_id || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Paid at:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">A booking payment has been successfully processed on VendiBook.</p>
        `;
        break;

      case "sale_payment":
        subject = "🛒 Sale Payment Received (Escrow) - VendiBook";
        iconEmoji = "🛒";
        iconBgColor = "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)";
        contentHtml = `
          <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 20px 0;">Sale Payment in Escrow!</h2>
          <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Listing ID:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.listing_id || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #22c55e; font-size: 14px;">$${data.amount || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Checkout Session:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.checkout_session_id || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Payment Intent:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.payment_intent_id || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Buyer ID:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.buyer_id || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Seller ID:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.seller_id || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Received at:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">A sale payment has been received and is held in escrow until both parties confirm.</p>
        `;
        break;

      case "newsletter_signup":
        subject = "📧 New Newsletter Subscriber - VendiBook";
        iconEmoji = "📧";
        iconBgColor = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
        contentHtml = `
          <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 20px 0;">New Newsletter Subscriber!</h2>
          <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                <td style="padding: 8px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${data.email || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Source:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${data.source || "Unknown"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subscribed at:</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">A new user has subscribed to the VendiBook newsletter.</p>
        `;
        break;

      default:
        console.log(`Unknown notification type: ${type}`);
        return new Response(
          JSON.stringify({ error: "Unknown notification type" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    const html = `
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
          <!-- Header with Logo -->
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="display: inline-block; background-color: #ffffff; padding: 16px 24px; border-radius: 12px; margin-bottom: 16px;">
              <img src="${logoUrl}" alt="VendiBook" style="max-width: 360px; height: auto;" />
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Admin Notification</p>
          </div>
          
          <!-- Main Content -->
          <div style="background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 64px; height: 64px; background: ${iconBgColor}; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px;">${iconEmoji}</span>
              </div>
            </div>
            
            ${contentHtml}
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This is an admin notification from VendiBook.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 12px 0 0 0;">
              Support: <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
              © ${new Date().getFullYear()} VendiBook. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`Sending email to admin: ${ADMIN_EMAIL}`);
    
    const emailResponse = await resend.emails.send({
      from: "VendiBook <noreply@updates.vendibook.com>",
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
