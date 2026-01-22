import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Brand colors
const COLORS = {
  primary: "#FF6D1F",        // Vendibook Orange
  primaryDark: "#E55A0D",    // Darker orange for hover
  charcoal: "#333333",       // Text color
  gray: "#737373",           // Muted text
  lightGray: "#F5F5F5",      // Light background
  white: "#FFFFFF",
  border: "#E5E5E5",
};

// =========================================================================
// NEWSLETTER TEMPLATE - JANUARY 2026
// Subject Options:
//   1. "New ways to buy & sell on Vendibook 🎉"
//   2. "Pay in Person + Affirm/Afterpay now available"
//
// Preheader: "Finance up to $30k with Affirm or meet locally with Pay in Person"
// =========================================================================

interface NewsletterRequest {
  testEmail?: string; // For sending a test to a specific email
}

// Latest blog post (update as needed)
const LATEST_BLOG = {
  title: "How to Sell Your Food Truck in 2026: The Ultimate Valuation Guide",
  excerpt: "The demand for compliant, turnkey used trucks has never been higher. Learn how to price your rig and position it to sell for top dollar.",
  url: "https://vendibook.com/blog/sell-my-food-truck-valuation-guide-2026",
};

// Host tools
const HOST_TOOLS = [
  { name: "PricePilot", description: "Get a data-backed valuation", url: "https://vendibook.com/tools/pricepilot" },
  { name: "ListingStudio", description: "AI-powered listing photos & descriptions", url: "https://vendibook.com/tools/listingstudio" },
  { name: "MarketRadar", description: "See what's selling in your area", url: "https://vendibook.com/tools/marketradar" },
];

const generateHtmlEmail = (unsubscribeUrl: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Vendibook Newsletter</title>
  <!-- Google Fonts: Poppins -->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${COLORS.white}; color: ${COLORS.charcoal};">
  
  <!-- Preview text (preheader) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    Finance up to $30k with Affirm or meet locally with Pay in Person
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.white};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main container -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: ${COLORS.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 32px 40px 24px; background-color: ${COLORS.white};">
              <img src="https://vendibook.com/images/vendibook-email-logo.png" alt="Vendibook" style="max-width: 180px; height: auto;" />
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <h1 style="margin: 0 0 16px; font-size: 26px; font-weight: 700; color: ${COLORS.charcoal}; line-height: 1.3;">
                What's New on Vendibook
              </h1>
              <p style="margin: 0; font-size: 16px; color: ${COLORS.gray}; line-height: 1.6;">
                We've been building tools to make buying and selling mobile food assets simpler and safer. Here's what's new:
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- Feature 1: Pay in Person -->
          <tr>
            <td style="padding: 24px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="48" valign="top" style="padding-right: 16px;">
                    <div style="width: 40px; height: 40px; background-color: ${COLORS.primary}; border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">
                      🤝
                    </div>
                  </td>
                  <td valign="top">
                    <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: ${COLORS.primary}; text-transform: uppercase; letter-spacing: 0.5px;">NEW</p>
                    <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: ${COLORS.charcoal};">Pay in Person</h3>
                    <p style="margin: 0; font-size: 15px; color: ${COLORS.gray}; line-height: 1.5;">
                      Meet locally and handle payment directly with your buyer or seller. Great for local transactions where you want to inspect the asset before committing. No platform fees when you choose this option.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Feature 2: Buy Now Pay Later -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="48" valign="top" style="padding-right: 16px;">
                    <div style="width: 40px; height: 40px; background-color: ${COLORS.primary}; border-radius: 10px; text-align: center; line-height: 40px; font-size: 20px;">
                      💳
                    </div>
                  </td>
                  <td valign="top">
                    <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: ${COLORS.primary}; text-transform: uppercase; letter-spacing: 0.5px;">NEW</p>
                    <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: ${COLORS.charcoal};">Buy Now, Pay Over Time</h3>
                    <p style="margin: 0 0 12px; font-size: 15px; color: ${COLORS.gray}; line-height: 1.5;">
                      Financing is now available at checkout for eligible transactions:
                    </p>
                    <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px; color: ${COLORS.gray}; line-height: 1.6;">
                      <li style="margin-bottom: 6px;"><strong>Affirm</strong> – Monthly payments available for purchases up to $30,000. Rates vary by applicant.</li>
                      <li><strong>Afterpay</strong> – Pay in 4 interest-free installments for eligible purchases; limits vary by shopper.</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Buttons -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="https://vendibook.com/list" style="display: inline-block; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); color: ${COLORS.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; min-width: 220px; text-align: center;">
                      Create a Free Listing
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="https://vendibook.com/search" style="display: inline-block; background-color: ${COLORS.lightGray}; color: ${COLORS.charcoal}; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; border: 1px solid ${COLORS.border};">
                      Browse New Listings →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- Latest Blog Post Section -->
          <tr>
            <td style="padding: 24px 40px;">
              <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: ${COLORS.primary}; text-transform: uppercase; letter-spacing: 0.5px;">FROM THE BLOG</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.lightGray}; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: ${COLORS.charcoal}; line-height: 1.3;">
                      <a href="${LATEST_BLOG.url}" style="color: ${COLORS.charcoal}; text-decoration: none;">${LATEST_BLOG.title}</a>
                    </h3>
                    <p style="margin: 0 0 12px; font-size: 14px; color: ${COLORS.gray}; line-height: 1.5;">
                      ${LATEST_BLOG.excerpt}
                    </p>
                    <a href="${LATEST_BLOG.url}" style="font-size: 14px; font-weight: 600; color: ${COLORS.primary}; text-decoration: none;">
                      Read the full guide →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- Host Tools Section -->
          <tr>
            <td style="padding: 24px 40px;">
              <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: ${COLORS.charcoal};">
                🛠️ Free Tools for Hosts
              </h3>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                ${HOST_TOOLS.map(tool => `
                <tr>
                  <td style="padding-bottom: 12px;">
                    <a href="${tool.url}" style="text-decoration: none; display: block; padding: 12px 16px; background-color: ${COLORS.lightGray}; border-radius: 8px; border-left: 3px solid ${COLORS.primary};">
                      <strong style="color: ${COLORS.charcoal}; font-size: 14px;">${tool.name}</strong>
                      <span style="color: ${COLORS.gray}; font-size: 13px;"> – ${tool.description}</span>
                    </a>
                  </td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- Industry Tip Section -->
          <tr>
            <td style="padding: 24px 40px;">
              <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: ${COLORS.charcoal};">
                💡 Quick Tip: Prep Your Truck for Sale
              </h3>
              <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px; color: ${COLORS.gray}; line-height: 1.7;">
                <li style="margin-bottom: 6px;"><strong>Gather your paperwork</strong> – Buyers expect: title, health permits, fire suppression tags, equipment receipts.</li>
                <li style="margin-bottom: 6px;"><strong>Deep clean everything</strong> – First impressions matter. A spotless truck commands higher offers.</li>
                <li><strong>Price it right</strong> – Use <a href="https://vendibook.com/tools/pricepilot" style="color: ${COLORS.primary}; text-decoration: underline;">PricePilot</a> to get a data-backed valuation.</li>
              </ul>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: ${COLORS.lightGray}; padding: 24px 40px;">
              <p style="margin: 0 0 12px; font-size: 13px; color: ${COLORS.gray}; text-align: center; line-height: 1.5;">
                You're receiving this because you subscribed to updates on <a href="https://vendibook.com" style="color: ${COLORS.primary}; text-decoration: none;">Vendibook</a>.
              </p>
              <p style="margin: 0 0 12px; font-size: 13px; color: ${COLORS.gray}; text-align: center; line-height: 1.5;">
                Need help? <a href="https://vendibook.com/contact" style="color: ${COLORS.primary}; text-decoration: none;">Contact us</a> or call <a href="tel:+18778836342" style="color: ${COLORS.primary}; text-decoration: none;">1-877-8-VENDI-2</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: ${COLORS.gray}; text-align: center;">
                <a href="${unsubscribeUrl}" style="color: ${COLORS.gray}; text-decoration: underline;">Unsubscribe</a>
                &nbsp;•&nbsp;
                © ${new Date().getFullYear()} VendiBook. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
`.trim();
};

const generatePlainTextEmail = (unsubscribeUrl: string): string => {
  return `
VENDIBOOK NEWSLETTER
====================

What's New on Vendibook

We've been building tools to make buying and selling mobile food assets simpler and safer. Here's what's new:

---

✨ NEW: Pay in Person
Meet locally and handle payment directly with your buyer or seller. Great for local transactions where you want to inspect the asset before committing. No platform fees when you choose this option.

---

✨ NEW: Buy Now, Pay Over Time
Financing is now available at checkout for eligible transactions:

• Affirm – Monthly payments available for purchases up to $30,000. Rates vary by applicant.
• Afterpay – Pay in 4 interest-free installments for eligible purchases; limits vary by shopper.

---

→ Create a Free Listing: https://vendibook.com/list
→ Browse New Listings: https://vendibook.com/search

---

📖 FROM THE BLOG

${LATEST_BLOG.title}
${LATEST_BLOG.excerpt}
Read the full guide: ${LATEST_BLOG.url}

---

🛠️ FREE TOOLS FOR HOSTS

${HOST_TOOLS.map(tool => `• ${tool.name} – ${tool.description}: ${tool.url}`).join('\n')}

---

💡 QUICK TIP: Prep Your Truck for Sale

• Gather your paperwork – Buyers expect: title, health permits, fire suppression tags, equipment receipts.
• Deep clean everything – First impressions matter. A spotless truck commands higher offers.
• Price it right – Use PricePilot to get a data-backed valuation: https://vendibook.com/tools/pricepilot

---

You're receiving this because you subscribed to updates on Vendibook.

Need help? Contact us at https://vendibook.com/contact or call 1-877-8-VENDI-2

Unsubscribe: ${unsubscribeUrl}

© ${new Date().getFullYear()} VendiBook. All rights reserved.
`.trim();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);
    const { testEmail } = await req.json() as NewsletterRequest;

    if (!testEmail) {
      return new Response(
        JSON.stringify({ error: "testEmail is required for draft mode" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // For testing, use a placeholder unsubscribe URL
    // In production with Resend audiences, this would be {{unsubscribe_url}}
    const unsubscribeUrl = `https://vendibook.com/unsubscribe?email=${encodeURIComponent(testEmail)}`;

    const htmlContent = generateHtmlEmail(unsubscribeUrl);
    const textContent = generatePlainTextEmail(unsubscribeUrl);

    // Subject line options:
    // 1. "New ways to buy & sell on Vendibook 🎉"
    // 2. "Pay in Person + Affirm/Afterpay now available"
    const subjectLine = "New ways to buy & sell on Vendibook 🎉";

    const emailResponse = await resend.emails.send({
      from: "Vendibook <hello@updates.vendibook.com>",
      to: [testEmail],
      subject: subjectLine,
      html: htmlContent,
      text: textContent,
    });

    console.log("[NEWSLETTER] Test email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailResponse,
        message: `Test email sent to ${testEmail}`,
        subjectOptions: [
          "New ways to buy & sell on Vendibook 🎉",
          "Pay in Person + Affirm/Afterpay now available"
        ],
        preheader: "Finance up to $30k with Affirm or meet locally with Pay in Person"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[NEWSLETTER] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
};

serve(handler);
