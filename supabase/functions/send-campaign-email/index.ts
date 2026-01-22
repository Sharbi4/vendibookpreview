import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignEmailRequest {
  to: string;
  subject: string;
  campaignId: string;
}

const campaigns: Record<string, { subject: string; html: string }> = {
  "vfw-churches-kitchen": {
    subject: "VFWs & churches: earn $2,000/month from your kitchen (Vendibook handles the screening)",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="VendiBook" style="height: 56px;" />
  </div>

  <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

  <p style="font-size: 16px; margin-bottom: 20px;">Quick question—does your VFW or church have a commercial kitchen that sits unused during parts of the week?</p>

  <p style="font-size: 16px; margin-bottom: 20px;">Vendibook helps VFWs and churches rent out approved kitchen time to vetted food entrepreneurs for prep, catering, meal prep, and delivery-first concepts. It's a simple way to create reliable revenue while supporting your local community.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://vendibook.com/rent-my-commercial-kitchen" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-right: 12px;">List Your Kitchen Free</a>
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #ffffff; color: #1a1a1a; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #1a1a1a;">Book a Free Setup Call</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">What you could earn (simple example)</h2>

  <p style="font-size: 16px; margin-bottom: 20px;">Many hosts earn around <strong>$500/week</strong> renting their kitchen 3 days/week — about <strong>$2,000/month</strong> (500 × 4).<br><em style="color: #666;">(Results vary by city, kitchen setup, and availability.)</em></p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Why VFWs & churches like Vendibook</h2>

  <p style="font-size: 15px; color: #666; margin-bottom: 20px;">We do the hard work — you stay in control.</p>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Done-for-you document reviews</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">You choose what renters must provide (business license, insurance, ServSafe/food handler certs, work history, etc.). Vendibook collects and reviews submissions so you don't have to.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Verified renters (optional)</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Require Stripe Identity verification so you're only considering verified profiles.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Secure payments + predictable payouts</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Renters pay when they submit a booking request. You review the profile + approved docs, accept the booking, and payouts are initiated at the end of the booking.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Optional deposits for extra protection</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Add a deposit to help protect your kitchen and equipment. If something goes wrong, we can hold the deposit during review to support recovery.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ We help market your kitchen</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Your listing is built to perform in search and in the marketplace—so the right renters can find you faster.</p>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Common ways kitchens get used</h2>

  <ul style="font-size: 15px; color: #444; padding-left: 20px; margin-bottom: 24px;">
    <li style="margin-bottom: 8px;">Prep-only time for caterers and meal prep businesses</li>
    <li style="margin-bottom: 8px;">Shared shifts for multiple approved renters</li>
    <li style="margin-bottom: 8px;">Production days for special events and seasonal items</li>
    <li style="margin-bottom: 8px;">Delivery-first brands (ghost kitchen style operations)</li>
  </ul>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 16px; margin-bottom: 20px;">If you want, I can help you set this up in under 10 minutes (availability, pricing, and the exact documents to require).</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-bottom: 12px;">Schedule a Free Walkthrough</a>
    <br>
    <a href="https://vendibook.com/list" style="display: inline-block; background: #ffffff; color: #1a1a1a; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #1a1a1a; margin-top: 12px;">Start Your Kitchen Listing</a>
  </div>

  <p style="font-size: 16px; margin-bottom: 8px;">Best,</p>
  <p style="font-size: 16px; margin-bottom: 4px;"><strong>Alison M</strong></p>
  <p style="font-size: 14px; color: #666; margin: 0;">Vendibook Customer Success</p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 12px; color: #999; text-align: center;">
    © ${new Date().getFullYear()} VendiBook. All rights reserved.<br>
    <a href="https://vendibook.com/unsubscribe" style="color: #999;">Unsubscribe</a>
  </p>

</body>
</html>
    `,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");

    const resend = new Resend(resendKey);
    const { to, campaignId }: CampaignEmailRequest = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const campaign = campaigns[campaignId];
    if (!campaign) {
      return new Response(
        JSON.stringify({ error: `Unknown campaign: ${campaignId}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: emailError, data } = await resend.emails.send({
      from: "Alison from VendiBook <hello@updates.vendibook.com>",
      to: [to],
      subject: campaign.subject,
      html: campaign.html,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      return new Response(
        JSON.stringify({ error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Campaign email sent successfully:", data);

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
