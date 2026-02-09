import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AddressRequestEmail {
  to: string;
  firstName: string;
  listingTitle: string;
  listingId?: string;
  category?: string;
}

// Get signage text based on listing category
const getSignageText = (category?: string): string => {
  const categoryMap: Record<string, string> = {
    commercial_kitchen: 'Rent This Kitchen',
    food_truck: 'Rent This Food Truck',
    food_trailer: 'Rent This Trailer',
    vendor_space: 'Book This Space',
  };
  return categoryMap[category || ''] || 'Rent This Space';
};

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
      listingTitle = "Your Listing",
      listingId = "",
      category = ""
    }: AddressRequestEmail = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signageText = getSignageText(category);
    const formUrl = `https://vendibook.com/signage-request${listingId ? `?listing=${listingId}` : ''}`;

    const { error: emailError, data } = await resend.emails.send({
      from: "VendiBook <hello@updates.vendibook.com>",
      replyTo: "support@vendibook.com",
      to: [to],
      subject: `🎁 Claim Your FREE QR Signage for "${listingTitle}"`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
          </head>
          <body style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              
              <!-- Logo -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="https://vendibook.com" style="display: inline-block; text-decoration: none;">
                  <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="VendiBook" style="height: 80px;" />
                </a>
              </div>
              
              <!-- Greeting -->
              <h2 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px; font-weight: 600;">Hey ${firstName}! 👋</h2>
              
              <p style="font-size: 16px; color: #374151;">
                Congratulations on publishing <strong>"${listingTitle}"</strong> on VendiBook!
              </p>
              
              <!-- Value Prop Box -->
              <div style="background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #FF6D1F;">
                <p style="margin: 0 0 12px 0; font-weight: 600; color: #1a1a1a; font-size: 18px;">🎁 Your FREE QR Code Signage</p>
                <p style="margin: 0; color: #374151; font-size: 15px;">
                  We'll send you <strong>professional signage</strong> with a unique QR code. When renters scan it, they're taken directly to your listing to book and pay instantly!
                </p>
              </div>
              
              <!-- Signage Options -->
              <p style="font-size: 16px; color: #1a1a1a; font-weight: 600; margin-bottom: 16px;">Choose Your FREE Signage:</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="48%" style="vertical-align: top; padding-right: 8px;">
                    <div style="border: 2px solid #E5E7EB; border-radius: 12px; padding: 20px; text-align: center; background: #FAFAFA;">
                      <div style="width: 60px; height: 60px; background: #FFF7ED; border-radius: 8px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 28px;">📇</span>
                      </div>
                      <p style="margin: 0 0 4px 0; font-weight: 600; color: #1a1a1a;">6×6 QR Cards</p>
                      <p style="margin: 0; font-size: 13px; color: #6B7280;">Pack of 10</p>
                      <p style="margin: 8px 0 0 0; font-size: 12px; color: #9CA3AF;">Perfect for counters & windows</p>
                    </div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align: top; padding-left: 8px;">
                    <div style="border: 2px solid #E5E7EB; border-radius: 12px; padding: 20px; text-align: center; background: #FAFAFA;">
                      <div style="width: 60px; height: 60px; background: #FFF7ED; border-radius: 8px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 28px;">🪧</span>
                      </div>
                      <p style="margin: 0 0 4px 0; font-weight: 600; color: #1a1a1a;">24×24 Outdoor Sign</p>
                      <p style="margin: 0; font-size: 13px; color: #6B7280;">Double stake</p>
                      <p style="margin: 8px 0 0 0; font-size: 12px; color: #9CA3AF;">Weather-resistant for entrances</p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Signage Preview -->
              <div style="background: #F3F4F6; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #6B7280;">Your signage will say:</p>
                <p style="margin: 0; font-size: 20px; font-weight: 700; color: #FF6D1F;">"${signageText}"</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #9CA3AF;">+ Your unique QR code</p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${formUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #FF6D1F 0%, #FF8A50 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(255, 109, 31, 0.4);">
                  Claim My Free Signage →
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6B7280; text-align: center;">
                📦 Free shipping • Arrives in 7-10 business days
              </p>
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 28px 0;">
              
              <!-- Benefits -->
              <p style="font-size: 15px; color: #374151; font-weight: 600; margin-bottom: 8px;">Why get signage?</p>
              <ul style="color: #374151; padding-left: 20px; margin-bottom: 24px;">
                <li style="margin-bottom: 8px;">✅ Capture walk-in leads 24/7</li>
                <li style="margin-bottom: 8px;">✅ Instant bookings—no phone calls needed</li>
                <li style="margin-bottom: 8px;">✅ Professional look builds trust</li>
                <li style="margin-bottom: 8px;">✅ Track scans in your dashboard</li>
              </ul>
              
              <!-- Support -->
              <p style="color: #6B7280; font-size: 14px;">
                Questions? Reply to this email or call us at 
                <a href="tel:+18778836342" style="color: #FF6D1F; text-decoration: none; font-weight: 600;">1-877-8-VENDI-2</a>
              </p>
              
              <p style="color: #6B7280; font-size: 14px; margin-top: 16px;">
                Cheers,<br>
                <strong>The VendiBook Team</strong>
              </p>
            </div>
            
            <!-- Footer -->
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

    console.log("QR signage request email sent successfully:", data);

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
