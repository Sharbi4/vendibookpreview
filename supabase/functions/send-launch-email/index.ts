import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LaunchEmailRequest {
  testEmail?: string;
  sendToAll?: boolean;
}

// Using the preview URL which has the latest images (we embed them inline in the email)
const PREVIEW_URL = "https://id-preview--f4d8586e-de66-4307-b052-b071b734f592.lovable.app";
const LOGO_URL = `${PREVIEW_URL}/images/vendibook-email-logo.png`;
const HERO_IMAGE_URL = `${PREVIEW_URL}/images/taco-truck-hero.png`;

// CID ids for inline-embedded images
const LOGO_CID = "vendibook-logo";
const HERO_CID = "taco-truck-hero";

const BASE_URL = "https://vendibookpreview.lovable.app";

// Vendibook Brand Colors (matching the website)
const COLORS = {
  primary: "#FF6D1F",        // Vendibook Orange
  primaryDark: "#E55A0D",    // Darker orange for hover
  charcoal: "#333333",       // Text color
  gray: "#737373",           // Muted text
  lightGray: "#F5F5F5",      // Light background
  cream: "#FAF7F2",          // Cream accent
  white: "#FFFFFF",
  border: "#E5E5E5",
};

const generateEmailHtml = (unsubscribeToken: string, userEmail: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vendibook is LIVE! 🎉</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${COLORS.white};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: ${COLORS.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 30px; background-color: ${COLORS.white};">
              <img src="cid:${LOGO_CID}" alt="Vendibook" style="max-width: 180px; height: auto;" />
            </td>
          </tr>
          
          <!-- Main Announcement Banner -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); border-radius: 16px; padding: 40px 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: ${COLORS.white}; letter-spacing: -0.5px;">
                  🚀 We're LIVE!
                </h1>
                <p style="margin: 16px 0 0; font-size: 16px; color: rgba(255,255,255,0.9); line-height: 1.6;">
                  The marketplace for food trucks, trailers, ghost kitchens & vendor lots is officially open!
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Hero Image - Taco Truck -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <img src="cid:${HERO_CID}" alt="Beautiful taco truck ready for business" style="width: 100%; max-width: 520px; height: auto; border-radius: 12px; display: block; margin: 0 auto;" />
            </td>
          </tr>
          
          <!-- Welcome Message -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <p style="margin: 0; font-size: 16px; color: ${COLORS.charcoal}; line-height: 1.7;">
                We're thrilled to announce that <strong>Vendibook</strong> is now live! Whether you're looking to rent equipment, sell your food truck, or find the perfect vendor spot, we've got you covered.
              </p>
            </td>
          </tr>
          
          <!-- Hero CTA -->
          <tr>
            <td align="center" style="padding: 10px 40px 40px;">
              <a href="${BASE_URL}" style="display: inline-block; background-color: ${COLORS.primary}; color: ${COLORS.white}; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600;">
                Explore Vendibook →
              </a>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background-color: ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- Section: Discover -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h2 style="margin: 0 0 24px; font-size: 22px; color: ${COLORS.charcoal}; font-weight: 600;">
                🔍 Discover What's Available
              </h2>
              
              <!-- Feature Cards -->
              <table role="presentation" style="width: 100%;">
                <!-- AI Tools -->
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table role="presentation" style="width: 100%; background-color: ${COLORS.lightGray}; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="margin: 0 0 8px; color: ${COLORS.charcoal}; font-size: 16px; font-weight: 600;">
                            🤖 AI-Powered Tools
                          </h3>
                          <p style="margin: 0 0 12px; color: ${COLORS.gray}; font-size: 14px; line-height: 1.5;">
                            Get smart recommendations with our AI equipment guide, license finder, and market research tools.
                          </p>
                          <a href="${BASE_URL}/ai-tools" style="color: ${COLORS.primary}; text-decoration: none; font-size: 14px; font-weight: 600;">
                            Try AI Tools →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Browse Listings -->
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table role="presentation" style="width: 100%; background-color: ${COLORS.lightGray}; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="margin: 0 0 8px; color: ${COLORS.charcoal}; font-size: 16px; font-weight: 600;">
                            🍔 Browse Listings
                          </h3>
                          <p style="margin: 0 0 12px; color: ${COLORS.gray}; font-size: 14px; line-height: 1.5;">
                            Find food trucks, trailers, and ghost kitchens near you. Filter by category, price, and availability.
                          </p>
                          <a href="${BASE_URL}/search" style="color: ${COLORS.primary}; text-decoration: none; font-size: 14px; font-weight: 600;">
                            Start Browsing →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background-color: ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- Section: Make Money -->
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h2 style="margin: 0 0 24px; font-size: 22px; color: ${COLORS.charcoal}; font-weight: 600;">
                💰 Start Making Money
              </h2>
              
              <table role="presentation" style="width: 100%;">
                <!-- Create Listing -->
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table role="presentation" style="width: 100%; background-color: ${COLORS.lightGray}; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="margin: 0 0 8px; color: ${COLORS.charcoal}; font-size: 16px; font-weight: 600;">
                            📝 List Your Equipment
                          </h3>
                          <p style="margin: 0 0 12px; color: ${COLORS.gray}; font-size: 14px; line-height: 1.5;">
                            Got a food truck, trailer, or kitchen sitting idle? List it and start earning today with secure Stripe payments.
                          </p>
                          <a href="${BASE_URL}/create-listing" style="color: ${COLORS.primary}; text-decoration: none; font-size: 14px; font-weight: 600;">
                            Create Listing →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Vendor Lots -->
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table role="presentation" style="width: 100%; background-color: ${COLORS.lightGray}; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="margin: 0 0 8px; color: ${COLORS.charcoal}; font-size: 16px; font-weight: 600;">
                            📍 Got a Vendor Lot?
                          </h3>
                          <p style="margin: 0 0 12px; color: ${COLORS.gray}; font-size: 14px; line-height: 1.5;">
                            Own property perfect for food vendors? Turn your unused space into recurring revenue.
                          </p>
                          <a href="${BASE_URL}/vendor-lots" style="color: ${COLORS.primary}; text-decoration: none; font-size: 14px; font-weight: 600;">
                            List Your Lot →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background-color: ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- Benefits Section -->
          <tr>
            <td style="padding: 40px;">
              <div style="background-color: ${COLORS.cream}; border-radius: 12px; padding: 24px; border: 1px solid ${COLORS.border};">
                <h3 style="margin: 0 0 16px; color: ${COLORS.charcoal}; font-size: 18px; font-weight: 600; text-align: center;">
                  ✨ Why Choose Vendibook?
                </h3>
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="padding: 6px 0; color: ${COLORS.charcoal}; font-size: 14px;">
                      ✅ <strong>Secure Payments</strong> – Funds held safely until booking completes
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: ${COLORS.charcoal}; font-size: 14px;">
                      ✅ <strong>Verified Hosts</strong> – Identity verification for peace of mind
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: ${COLORS.charcoal}; font-size: 14px;">
                      ✅ <strong>24/7 Support</strong> – We're here when you need us
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: ${COLORS.charcoal}; font-size: 14px;">
                      ✅ <strong>AI-Powered</strong> – Smart tools to help you succeed
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: ${COLORS.charcoal}; font-size: 14px;">
                      ✅ <strong>Built for Entrepreneurs</strong> – Made for the food business community
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Final CTA -->
          <tr>
            <td align="center" style="padding: 0 40px 40px;">
              <a href="${BASE_URL}" style="display: inline-block; background-color: ${COLORS.primary}; color: ${COLORS.white}; text-decoration: none; padding: 16px 48px; border-radius: 50px; font-size: 16px; font-weight: 600;">
                Get Started Today →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: ${COLORS.lightGray}; padding: 30px 40px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <img src="cid:${LOGO_CID}" alt="Vendibook" style="max-width: 100px; height: auto; margin-bottom: 16px;" />
                    <p style="margin: 0 0 12px; color: ${COLORS.gray}; font-size: 13px;">
                      The marketplace for food trucks, trailers & more.
                    </p>
                    <p style="margin: 0 0 16px; color: ${COLORS.gray}; font-size: 12px;">
                      © 2026 Vendibook. All rights reserved.
                    </p>
                    <p style="margin: 0; font-size: 12px;">
                      <a href="${BASE_URL}/unsubscribe?token=${unsubscribeToken}&email=${encodeURIComponent(userEmail)}" style="color: ${COLORS.gray}; text-decoration: underline;">
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
      const { data: unsubscribed, error: _unsubError } = await supabase
        .from("newsletter_subscribers")
        .select("email")
        .not("unsubscribed_at", "is", null);

      const unsubscribedEmails = new Set(
        (unsubscribed || []).map((u: { email: string }) => u.email.toLowerCase())
      );

      recipients = (profiles || [])
        .filter(
          (p: { id: string; email: string | null }) =>
            p.email && !unsubscribedEmails.has(p.email.toLowerCase())
        )
        .map((p: { id: string; email: string | null }) => ({
          email: p.email!,
          id: p.id,
        }));

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

    console.log("Preparing inline email images...");

    const bytesToBase64 = (bytes: Uint8Array) => {
      // Avoid call stack limits for large arrays by chunking
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    };

    const fetchImageAsBase64 = async (url: string) => {
      const response = await fetch(`${url}?v=${Date.now()}`);
      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `Failed to fetch image (${response.status}) ${url} ${text}`
        );
      }

      // If we accidentally fetched HTML (e.g., an app shell / error page), the CID image will render as broken.
      if (!contentType.toLowerCase().includes("image/")) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `Expected image/* but got '${contentType}' from ${url}. First 200 chars: ${text.slice(
            0,
            200
          )}`
        );
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      console.log(`Fetched inline image ${url} (${contentType}) bytes=${bytes.length}`);
      return bytesToBase64(bytes);
    };

    const [logoBase64, heroBase64] = await Promise.all([
      fetchImageAsBase64(LOGO_URL),
      fetchImageAsBase64(HERO_IMAGE_URL),
    ]);

    const inlineAttachments = [
      {
        filename: "vendibook-email-logo.png",
        content: logoBase64,
        contentType: "image/png",
        contentId: LOGO_CID,
      },
      {
        filename: "taco-truck-hero.png",
        content: heroBase64,
        contentType: "image/png",
        contentId: HERO_CID,
      },
    ];

    for (const recipient of recipients) {
      try {
        // Generate a simple unsubscribe token (base64 of email + timestamp)
        const unsubscribeToken = btoa(`${recipient.email}:${Date.now()}`);

        const emailData = await resend.emails.send({
          from: "VendiBook <noreply@updates.vendibook.com>",
          to: [recipient.email],
          subject: "🚀 Vendibook is LIVE! Start Your Food Business Journey Today",
          html: generateEmailHtml(unsubscribeToken, recipient.email),
          attachments: inlineAttachments,
        });

        const maybeError = (emailData as unknown as { error?: { message?: string } })
          .error;
        if (maybeError) {
          throw new Error(maybeError.message || "Failed to send email");
        }

        console.log(`Email sent to ${recipient.email}:`, emailData);
        results.push({ email: recipient.email, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to send to ${recipient.email}:`, message);
        results.push({
          email: recipient.email,
          success: false,
          error: message,
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error in send-launch-email function:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
