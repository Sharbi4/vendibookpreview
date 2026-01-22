import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  to: string;
  firstName?: string;
  listingTitle?: string;
  listingPrice?: string;
  listingLocation?: string;
  listingId?: string;
  photoCount?: number;
  videoCount?: number;
  missingItem?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");

    const resend = new Resend(resendKey);
    
    const { 
      to,
      firstName = "there",
      listingTitle = "My Food Trailer",
      listingPrice = "$20,000",
      listingLocation = "Atlanta, Georgia",
      listingId = "1197411e-7c1c-4a97-9df1-8c68ef5ceb3e",
      photoCount = 6,
      videoCount = 1,
      missingItem = "description"
    }: TestEmailRequest = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const listingUrl = `https://vendibook.com/create-listing/${listingId}`;

    const { error: emailError, data } = await resend.emails.send({
      from: "VendiBook <noreply@updates.vendibook.com>",
      to: [to],
      subject: `Your ${listingTitle} listing is 90% ready! Just add a ${missingItem} 🚀`,
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
          <body style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              
              <div style="text-align: center; margin-bottom: 24px;">
                <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="VendiBook" style="height: 40px;" />
              </div>
              
              <h2 style="color: #1a1a1a; font-size: 22px; margin-bottom: 16px;">Hey ${firstName}! 👋</h2>
              
              <p style="font-size: 16px; color: #374151;">You're <strong>so close</strong> to getting your <strong>Food Trailer</strong> listed on VendiBook!</p>
              
              <div style="background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #FF5124;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #1a1a1a;">"${listingTitle}" - ${listingPrice}</p>
                <p style="margin: 0; color: #6B7280; font-size: 14px;">📍 ${listingLocation}</p>
                <p style="margin: 8px 0 0 0; color: #6B7280; font-size: 14px;">📸 ${photoCount} photos${videoCount > 0 ? ` + ${videoCount} video` : ''} uploaded</p>
              </div>
              
              <p style="font-size: 16px; color: #374151;">There's just <strong>one thing missing</strong>: a ${missingItem}!</p>
              
              <p style="font-size: 15px; color: #6B7280;">A good description helps buyers understand what makes your trailer special. Just a few sentences about:</p>
              
              <ul style="color: #374151; padding-left: 20px;">
                <li>Equipment included (grills, fryers, etc.)</li>
                <li>Condition and age</li>
                <li>Why you're selling</li>
              </ul>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${listingUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 81, 36, 0.4);">
                  Finish My Listing →
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6B7280; text-align: center;">Takes less than 2 minutes!</p>
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 28px 0;">
              
              <p style="color: #6B7280; font-size: 14px;">Need help writing your description? Just reply to this email and we'll help you craft the perfect one.</p>
              
              <p style="color: #6B7280; font-size: 14px;">Or give us a call: <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none; font-weight: 600;">1-877-8-VENDI-2</a></p>
            </div>
            
            <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">
              © ${new Date().getFullYear()} VendiBook. All rights reserved.<br>
              <a href="https://vendibook.com/unsubscribe" style="color: #9CA3AF;">Unsubscribe</a>
            </p>
          </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      return new Response(
        JSON.stringify({ error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Test email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
