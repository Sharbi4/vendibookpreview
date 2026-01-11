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

    const listingUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/listing/${listingId}`;
    const dashboardUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/dashboard`;

    const emailResponse = await resend.emails.send({
      from: "Vendibook <onboarding@resend.dev>",
      to: [hostEmail],
      subject: `🎉 Your listing "${listingTitle}" is now live!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your listing is now live on Vendibook</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 20px 0;">Hi ${hostName || 'there'},</p>
            
            <p style="margin: 0 0 20px 0;">Great news! Your listing <strong>"${listingTitle}"</strong> is now published and visible to potential renters and buyers on Vendibook.</p>
            
            ${listingImageUrl ? `
            <div style="margin: 20px 0; text-align: center;">
              <img src="${listingImageUrl}" alt="${listingTitle}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
            </div>
            ` : ''}
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1f2937;">Listing Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Title:</td>
                  <td style="padding: 8px 0; font-weight: 600;">${listingTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Category:</td>
                  <td style="padding: 8px 0;">${category}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Price:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #059669;">${listingPrice}</td>
                </tr>
              </table>
            </div>
            
            <div style="margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1f2937;">What's Next?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                <li style="margin-bottom: 8px;">Share your listing on social media to reach more customers</li>
                <li style="margin-bottom: 8px;">Keep your calendar updated to avoid booking conflicts</li>
                <li style="margin-bottom: 8px;">Respond quickly to booking requests to improve your ranking</li>
                <li style="margin-bottom: 8px;">Consider adding more photos to attract more interest</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${listingUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 10px;">View Your Listing</a>
              <a href="${dashboardUrl}" style="display: inline-block; background: #f3f4f6; color: #374151; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to Dashboard</a>
            </div>
            
            <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">Thank you for choosing Vendibook. We're excited to help you connect with customers!</p>
          </div>
          
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">You're receiving this email because you published a listing on Vendibook.</p>
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
