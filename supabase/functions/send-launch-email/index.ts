import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LaunchEmailRequest {
  testEmail?: string;
  sendToAll?: boolean;
}

const LOGO_URL = "https://vendibook-docs.s3.us-east-1.amazonaws.com/documents/vendibook-logo.png";
const BASE_URL = "https://vendibookpreview.lovable.app";

const generateEmailHtml = (unsubscribeToken: string, userEmail: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vendibook is LIVE! 🎉</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <img src="${LOGO_URL}" alt="Vendibook" style="max-width: 200px; height: auto;" />
            </td>
          </tr>
          
          <!-- Main Announcement -->
          <tr>
            <td align="center" style="padding: 20px 40px;">
              <h1 style="margin: 0; font-size: 36px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">
                🚀 WE'RE LIVE!
              </h1>
              <p style="margin: 20px 0 0; font-size: 18px; color: #94a3b8; line-height: 1.6;">
                The marketplace for food trucks, trailers, ghost kitchens & vendor lots is officially open for business!
              </p>
            </td>
          </tr>
          
          <!-- Hero CTA -->
          <tr>
            <td align="center" style="padding: 30px 40px;">
              <a href="${BASE_URL}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 30px rgba(249, 115, 22, 0.4);">
                Explore Vendibook →
              </a>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);"></div>
            </td>
          </tr>
          
          <!-- Features Grid -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 30px; font-size: 24px; color: #ffffff; text-align: center;">
                What's Waiting For You
              </h2>
              
              <!-- Feature 1: AI Tools -->
              <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 60px; vertical-align: top;">
                          <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px;">
                            🤖
                          </div>
                        </td>
                        <td style="vertical-align: top; padding-left: 16px;">
                          <h3 style="margin: 0 0 8px; color: #ffffff; font-size: 18px;">AI-Powered Tools</h3>
                          <p style="margin: 0 0 12px; color: #94a3b8; font-size: 14px; line-height: 1.5;">
                            Smart equipment guides, license finders, and market research at your fingertips.
                          </p>
                          <a href="${BASE_URL}/ai-tools" style="color: #f97316; text-decoration: none; font-size: 14px; font-weight: 600;">
                            Try AI Tools →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Feature 2: Browse & Discover -->
              <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 60px; vertical-align: top;">
                          <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px;">
                            🔍
                          </div>
                        </td>
                        <td style="vertical-align: top; padding-left: 16px;">
                          <h3 style="margin: 0 0 8px; color: #ffffff; font-size: 18px;">Browse & Discover</h3>
                          <p style="margin: 0 0 12px; color: #94a3b8; font-size: 14px; line-height: 1.5;">
                            Find food trucks, trailers, and ghost kitchens near you. Filter by category, price, and availability.
                          </p>
                          <a href="${BASE_URL}/search" style="color: #f97316; text-decoration: none; font-size: 14px; font-weight: 600;">
                            Start Browsing →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Feature 3: List & Earn -->
              <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 60px; vertical-align: top;">
                          <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #f97316, #ea580c); border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px;">
                            💰
                          </div>
                        </td>
                        <td style="vertical-align: top; padding-left: 16px;">
                          <h3 style="margin: 0 0 8px; color: #ffffff; font-size: 18px;">List & Start Earning</h3>
                          <p style="margin: 0 0 12px; color: #94a3b8; font-size: 14px; line-height: 1.5;">
                            Got equipment sitting idle? List it and start earning today. Secure payments via Stripe.
                          </p>
                          <a href="${BASE_URL}/create-listing" style="color: #f97316; text-decoration: none; font-size: 14px; font-weight: 600;">
                            Create Your Listing →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Feature 4: Vendor Lots -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 24px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 60px; vertical-align: top;">
                          <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 12px; text-align: center; line-height: 50px; font-size: 24px;">
                            📍
                          </div>
                        </td>
                        <td style="vertical-align: top; padding-left: 16px;">
                          <h3 style="margin: 0 0 8px; color: #ffffff; font-size: 18px;">Got a Lot? List It!</h3>
                          <p style="margin: 0 0 12px; color: #94a3b8; font-size: 14px; line-height: 1.5;">
                            Own property perfect for food vendors? Turn unused space into recurring revenue.
                          </p>
                          <a href="${BASE_URL}/vendor-lots" style="color: #f97316; text-decoration: none; font-size: 14px; font-weight: 600;">
                            Explore Vendor Lots →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Benefits Section -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background: linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.1)); border-radius: 16px; padding: 30px; border: 1px solid rgba(249,115,22,0.3);">
                <h3 style="margin: 0 0 20px; color: #ffffff; font-size: 20px; text-align: center;">
                  ✨ Why Vendibook?
                </h3>
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px;">
                      ✅ Secure escrow payments – funds held until booking completes
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px;">
                      ✅ Identity verification for hosts – book with confidence
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px;">
                      ✅ 24/7 support – we've got your back
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px;">
                      ✅ AI-powered tools – find licenses, equipment & more
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px;">
                      ✅ Built for entrepreneurs – not the gig economy
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(0,0,0,0.3); padding: 30px 40px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 16px; color: #64748b; font-size: 14px;">
                      Follow us for updates and tips
                    </p>
                    <p style="margin: 0 0 24px;">
                      <a href="https://twitter.com/vendibook" style="color: #94a3b8; text-decoration: none; margin: 0 12px;">Twitter</a>
                      <a href="https://instagram.com/vendibook" style="color: #94a3b8; text-decoration: none; margin: 0 12px;">Instagram</a>
                      <a href="https://facebook.com/vendibook" style="color: #94a3b8; text-decoration: none; margin: 0 12px;">Facebook</a>
                    </p>
                    <p style="margin: 0 0 16px; color: #475569; font-size: 12px;">
                      © 2026 Vendibook. All rights reserved.
                    </p>
                    <p style="margin: 0; color: #475569; font-size: 12px;">
                      <a href="${BASE_URL}/unsubscribe?token=${unsubscribeToken}&email=${encodeURIComponent(userEmail)}" style="color: #64748b; text-decoration: underline;">
                        Unsubscribe from these emails
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  console.log("send-launch-email function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { testEmail, sendToAll }: LaunchEmailRequest = await req.json();

    let recipients: { email: string; id: string }[] = [];

    if (testEmail) {
      // Send to test email only
      console.log(`Sending test email to: ${testEmail}`);
      recipients = [{ email: testEmail, id: "test-user" }];
    } else if (sendToAll) {
      // Fetch all users with emails from profiles table (excluding unsubscribed)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email")
        .not("email", "is", null);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw new Error("Failed to fetch user profiles");
      }

      // Check newsletter_subscribers for unsubscribed users
      const { data: unsubscribed, error: unsubError } = await supabase
        .from("newsletter_subscribers")
        .select("email")
        .not("unsubscribed_at", "is", null);

      const unsubscribedEmails = new Set(
        (unsubscribed || []).map((u) => u.email.toLowerCase())
      );

      recipients = (profiles || [])
        .filter((p) => p.email && !unsubscribedEmails.has(p.email.toLowerCase()))
        .map((p) => ({ email: p.email!, id: p.id }));

      console.log(`Sending launch email to ${recipients.length} users`);
    } else {
      return new Response(
        JSON.stringify({ error: "Must specify testEmail or sendToAll" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const recipient of recipients) {
      try {
        // Generate a simple unsubscribe token (base64 of email + timestamp)
        const unsubscribeToken = btoa(`${recipient.email}:${Date.now()}`);

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "VendiBook <noreply@updates.vendibook.com>",
            to: [recipient.email],
            subject: "🚀 Vendibook is LIVE! Start Your Food Business Journey Today",
            html: generateEmailHtml(unsubscribeToken, recipient.email),
          }),
        });

        const emailData = await emailResponse.json();

        if (!emailResponse.ok) {
          throw new Error(emailData.message || "Failed to send email");
        }

        console.log(`Email sent to ${recipient.email}:`, emailData);
        results.push({ email: recipient.email, success: true });
      } catch (error: any) {
        console.error(`Failed to send to ${recipient.email}:`, error);
        results.push({
          email: recipient.email,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        message: `Sent ${successCount} emails successfully, ${failCount} failed`,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-launch-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
