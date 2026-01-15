import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ListingLiveEmailRequest {
  hostEmail: string;
  hostName: string;
  listingTitle: string;
  listingId: string;
  listingImageUrl: string | null;
  listingPrice: string;
  category: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-listing-live-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      hostEmail, 
      hostName, 
      listingTitle, 
      listingId, 
      listingImageUrl,
      listingPrice,
      category 
    }: ListingLiveEmailRequest = await req.json();

    console.log("Sending listing live email to:", hostEmail);
    console.log("Listing:", listingTitle, listingId);

    const siteUrl = Deno.env.get("SITE_URL") || "https://vendibookpreview.lovable.app";
    const logoUrl = `${siteUrl}/images/vendibook-email-logo.png`;
    const listingUrl = `${siteUrl}/listing/${listingId}`;
    const dashboardUrl = `${siteUrl}/dashboard`;

    const emailResponse = await resend.emails.send({
      from: "VendiBook <noreply@updates.vendibook.com>",
      to: [hostEmail],
      subject: `🎉 Your listing "${listingTitle}" is now live!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 40px;">
              <img src="${logoUrl}" alt="VendiBook" style="max-width: 200px; height: auto; margin-bottom: 16px;" />
              <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Your Mobile Food Business Marketplace</p>
            </div>
            
            <!-- Main Content -->
            <div style="background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">🎉</span>
                </div>
                <h1 style="color: #1f2937; font-size: 24px; margin: 0;">Congratulations!</h1>
                <p style="color: #6b7280; font-size: 16px; margin: 8px 0 0 0;">Your listing is now live</p>
              </div>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Hi ${hostName || 'there'}, great news! Your listing <strong style="color: #1f2937;">"${listingTitle}"</strong> is now published and visible to potential renters and buyers on VendiBook.
              </p>
              
              ${listingImageUrl ? `
              <div style="margin: 24px 0; text-align: center;">
                <img src="${listingImageUrl}" alt="${listingTitle}" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
              </div>
              ` : ''}
              
              <div style="background: #f9fafb; padding: 24px; border-radius: 12px; margin: 24px 0;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px;">Listing Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Title:</td>
                    <td style="padding: 8px 0; font-weight: 600; color: #1f2937; font-size: 14px;">${listingTitle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Category:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${category}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Price:</td>
                    <td style="padding: 8px 0; font-weight: 600; color: #22c55e; font-size: 14px;">${listingPrice}</td>
                  </tr>
                </table>
              </div>
              
              <div style="margin: 24px 0;">
                <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px;">What's Next?</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                  <li>Share your listing on social media to reach more customers</li>
                  <li>Keep your calendar updated to avoid booking conflicts</li>
                  <li>Respond quickly to booking requests to improve your ranking</li>
                  <li>Consider adding more photos to attract more interest</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 32px 0 0 0;">
                <a href="${listingUrl}" style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-right: 12px;">View Your Listing</a>
                <a href="${dashboardUrl}" style="display: inline-block; background: #f3f4f6; color: #374151; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                You're receiving this email because you published a listing on VendiBook.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 12px 0 0 0;">
                Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1 (877) 883-6342</a> or email <a href="mailto:support@vendibook.com" style="color: #FF5124; text-decoration: none;">support@vendibook.com</a>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
                © ${new Date().getFullYear()} VendiBook. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-listing-live-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
