import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-welcome-email function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, role }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to: ${email}, name: ${fullName}, role: ${role}`);

    if (!email) {
      console.error("No email provided");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roleDisplay = role === 'host' ? 'Host' : 'Shopper';
    const roleDescription = role === 'host' 
      ? "As a Host, you can list your food trucks, trailers, ghost kitchens, and vendor lots for rent or sale."
      : "As a Shopper, you can browse and book amazing food trucks, trailers, ghost kitchens, and vendor lots.";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="color: #FF5124; font-size: 32px; margin: 0;">VendiBook</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Your Mobile Food Business Marketplace</p>
            </div>
            
            <!-- Main Content Card -->
            <div style="background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 16px 0;">
                Welcome to VendiBook${fullName ? `, ${fullName}` : ''}! 🎉
              </h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                We're thrilled to have you join our community! Your account has been successfully created as a <strong style="color: #FF5124;">${roleDisplay}</strong>.
              </p>
              
              <div style="background: #FFF5F2; border-left: 4px solid #FF5124; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="color: #1f2937; font-size: 14px; line-height: 1.6; margin: 0;">
                  ${roleDescription}
                </p>
              </div>
              
              <h3 style="color: #1f2937; font-size: 18px; margin: 32px 0 16px 0;">Getting Started</h3>
              
              <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                ${role === 'host' ? `
                  <li>Complete your profile and verify your identity</li>
                  <li>Create your first listing with photos and details</li>
                  <li>Set up Stripe to receive payments</li>
                  <li>Respond quickly to booking requests</li>
                ` : `
                  <li>Complete your profile</li>
                  <li>Browse available food trucks, trailers, and more</li>
                  <li>Use filters to find the perfect match</li>
                  <li>Book your first rental or make a purchase</li>
                `}
              </ul>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://vendibookpreview.lovable.app'}/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Go to Dashboard
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                Need help? Contact us at support@vendibook.com
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} VendiBook. All rights reserved.
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
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "VendiBook <noreply@updates.vendibook.com>",
        to: [email],
        subject: `Welcome to VendiBook, ${fullName || 'Friend'}! 🚀`,
        html,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Welcome email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
