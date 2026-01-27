import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface WeeklyNewsletterRequest {
  testEmail?: string;
  sendToAll?: boolean;
  blog_1_title?: string;
  blog_1_url?: string;
}

const generateHtmlEmail = (unsubscribeUrl: string, blogTitle: string, blogUrl: string): string => {
  // Top Picks - Real production listings
  const topPicks = [
    {
      title: "TURNKEY Mobile Tap Trailer",
      price: "$28,500",
      url: "https://vendibook.com/listing/29db594a-1746-4d42-954a-16673d9ff875",
    },
    {
      title: "🔥 TURNKEY SHIPPING CONTAINER KITCHEN🔥",
      price: "$18,000 • Atlanta, Georgia",
      url: "https://vendibook.com/listing/f4d5e5ae-31eb-4ba0-9d2b-13df7279d020",
    },
  ];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>This Week on Vendibook</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${COLORS.white}; color: ${COLORS.charcoal};">
  
  <!-- Preview text (preheader) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    Fresh listings, proven tools, and smart moves to grow your food business this week.
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
              <a href="https://vendibook.com" style="text-decoration: none;">
                <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="VendiBook" style="height: 56px;" />
              </a>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: ${COLORS.charcoal}; line-height: 1.3;">
                This Week on Vendibook
              </h1>
              <p style="margin: 0; font-size: 15px; color: ${COLORS.gray}; line-height: 1.6;">
                Your weekly roundup of new listings, tools, and insights for the mobile food industry.
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- TOP PICKS THIS WEEK -->
          <tr>
            <td style="padding: 24px 40px 16px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: ${COLORS.charcoal};">
                🔥 Top Picks This Week
              </h2>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                ${topPicks.map(pick => `
                <tr>
                  <td style="padding-bottom: 10px;">
                    <a href="${pick.url}" style="text-decoration: none; display: block; padding: 14px 16px; background-color: ${COLORS.lightGray}; border-radius: 8px; border-left: 4px solid ${COLORS.primary};">
                      <strong style="color: ${COLORS.charcoal}; font-size: 14px;">${pick.title}</strong>
                      <span style="color: ${COLORS.gray}; font-size: 13px; display: block; margin-top: 2px;">${pick.price}</span>
                      <span style="color: ${COLORS.primary}; font-size: 13px; display: block; margin-top: 4px;">View listing →</span>
                    </a>
                  </td>
                </tr>
                `).join('')}
              </table>
              <p style="margin: 12px 0 0; font-size: 13px; color: ${COLORS.gray};">
                Our AI surfaces the newest listings and helpful resources each week—so you never miss an opportunity.
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 8px 40px;">
              <div style="border-top: 1px solid ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- VENDIBOOK TOOLS -->
          <tr>
            <td style="padding: 24px 40px 16px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: ${COLORS.charcoal};">
                🛠️ Vendibook Tools You Can Use Today
              </h2>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <a href="https://vendibook.com/tools/permit-path" style="text-decoration: none; display: block; padding: 14px 16px; background-color: ${COLORS.lightGray}; border-radius: 8px;">
                      <strong style="color: ${COLORS.charcoal}; font-size: 14px;">Permit Path</strong>
                      <span style="color: ${COLORS.gray}; font-size: 13px; display: block; margin-top: 4px;">Get a personalized checklist of permits and licenses you need based on your city and business type.</span>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="https://vendibook.com/tools/builder-kit" style="text-decoration: none; display: block; padding: 14px 16px; background-color: ${COLORS.lightGray}; border-radius: 8px;">
                      <strong style="color: ${COLORS.charcoal}; font-size: 14px;">Builder Kit</strong>
                      <span style="color: ${COLORS.gray}; font-size: 13px; display: block; margin-top: 4px;">Plan your buildout with equipment recommendations, cost estimates, and vendor contacts—all in one place.</span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 8px 40px;">
              <div style="border-top: 1px solid ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- QUICK MOVES TO EARN MORE -->
          <tr>
            <td style="padding: 24px 40px 16px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: ${COLORS.charcoal};">
                💡 Quick Moves to Earn More
              </h2>
              <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px; color: ${COLORS.gray}; line-height: 1.8;">
                <li style="margin-bottom: 6px;"><strong style="color: ${COLORS.charcoal};">Rent while selling</strong> – Generate income while your asset finds a buyer. No conflict, just cash flow.</li>
                <li style="margin-bottom: 6px;"><strong style="color: ${COLORS.charcoal};">Offer weekly + monthly pricing</strong> – Longer rentals mean fewer turnovers and steadier income.</li>
                <li><strong style="color: ${COLORS.charcoal};">Require documentation</strong> – Serious renters won't blink at providing insurance and permits.</li>
              </ul>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 8px 40px;">
              <div style="border-top: 1px solid ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- COMMUNITY WINS -->
          <tr>
            <td style="padding: 24px 40px 16px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: ${COLORS.charcoal};">
                🏆 Community Wins
              </h2>
              <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px; color: ${COLORS.gray}; line-height: 1.8;">
                <li style="margin-bottom: 6px;">A host in Texas closed their first rental within 48 hours of listing.</li>
                <li style="margin-bottom: 6px;">Ghost kitchen owner now earning recurring monthly income from unused morning hours.</li>
                <li>First-time buyer financed a $22k trailer with Affirm—launched their taco business the same week.</li>
              </ul>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 8px 40px;">
              <div style="border-top: 1px solid ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- BLOG CALLOUT -->
          <tr>
            <td style="padding: 24px 40px 16px;">
              <p style="margin: 0; font-size: 14px; color: ${COLORS.gray}; line-height: 1.6;">
                📖 <strong style="color: ${COLORS.charcoal};">New this week on the blog:</strong> 
                <a href="${blogUrl}" style="color: ${COLORS.primary}; text-decoration: underline;">${blogTitle}</a>
              </p>
            </td>
          </tr>
          
          <!-- CTA BUTTONS -->
          <tr>
            <td style="padding: 16px 40px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="https://vendibook.com/search" style="display: inline-block; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); color: ${COLORS.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; min-width: 200px; text-align: center;">
                      Browse Listings
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="https://vendibook.com/list" style="display: inline-block; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); color: ${COLORS.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; min-width: 200px; text-align: center;">
                      Create a Listing
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="https://vendibook.com/tools" style="display: inline-block; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); color: ${COLORS.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; min-width: 200px; text-align: center;">
                      Use Tools
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: ${COLORS.lightGray}; padding: 24px 40px;">
              <p style="margin: 0 0 12px; font-size: 13px; color: ${COLORS.gray}; text-align: center; line-height: 1.5;">
                You're receiving this because you're part of the Vendibook community.
              </p>
              <p style="margin: 0; font-size: 12px; color: ${COLORS.gray}; text-align: center;">
                <a href="https://vendibook.com/settings/notifications" style="color: ${COLORS.gray}; text-decoration: underline;">Manage Preferences</a>
                &nbsp;•&nbsp;
                <a href="https://vendibook.com/contact" style="color: ${COLORS.gray}; text-decoration: underline;">Support</a>
                &nbsp;•&nbsp;
                <a href="${unsubscribeUrl}" style="color: ${COLORS.gray}; text-decoration: underline;">Unsubscribe</a>
              </p>
              <p style="margin: 12px 0 0; font-size: 11px; color: ${COLORS.gray}; text-align: center;">
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resend = new Resend(resendApiKey);
    const data = await req.json() as WeeklyNewsletterRequest;
    const { testEmail, sendToAll } = data;

    const blogTitle = data.blog_1_title || "Sell vs Rent: Why the New Food Business Is Fluid";
    const blogUrl = data.blog_1_url || "https://vendibook.com/blog/sell-vs-rent-food-trailer-truck-ghost-kitchen";

    const subjectLine = "This Week on Vendibook: Fresh Listings, Tools & Insights 🚀";

    // If testEmail is provided, just send to that one address
    if (testEmail && !sendToAll) {
      const unsubscribeUrl = `https://vendibook.com/unsubscribe?email=${encodeURIComponent(testEmail)}`;
      const emailHtml = generateHtmlEmail(unsubscribeUrl, blogTitle, blogUrl);

      const emailResponse = await resend.emails.send({
        from: "Vendibook <hello@updates.vendibook.com>",
        to: [testEmail],
        subject: subjectLine,
        html: emailHtml,
      });

      console.log("[WEEKLY NEWSLETTER] Test email sent:", emailResponse);

      return new Response(
        JSON.stringify({ success: true, data: emailResponse }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send to all subscribers
    if (sendToAll) {
      console.log("[WEEKLY NEWSLETTER] Fetching all subscribers...");

      // Get newsletter subscribers who haven't unsubscribed
      const { data: newsletterSubs, error: subError } = await supabase
        .from("newsletter_subscribers")
        .select("email")
        .is("unsubscribed_at", null);

      if (subError) {
        console.error("[WEEKLY NEWSLETTER] Error fetching newsletter subscribers:", subError);
        throw new Error(`Failed to fetch newsletter subscribers: ${subError.message}`);
      }

      // Get all user emails from profiles
      const { data: userProfiles, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .not("email", "is", null);

      if (profileError) {
        console.error("[WEEKLY NEWSLETTER] Error fetching user profiles:", profileError);
        throw new Error(`Failed to fetch user profiles: ${profileError.message}`);
      }

      // Combine and deduplicate emails
      const allEmails = new Set<string>();
      
      newsletterSubs?.forEach((sub: { email: string }) => {
        if (sub.email) allEmails.add(sub.email.toLowerCase().trim());
      });
      
      userProfiles?.forEach((profile: { email: string }) => {
        if (profile.email) allEmails.add(profile.email.toLowerCase().trim());
      });

      const emailList = Array.from(allEmails);
      console.log(`[WEEKLY NEWSLETTER] Found ${emailList.length} unique emails to send to`);

      if (emailList.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No subscribers found", sent: 0 }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Send in batches of 50 (Resend batch limit is 100)
      const BATCH_SIZE = 50;
      const results: any[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < emailList.length; i += BATCH_SIZE) {
        const batch = emailList.slice(i, i + BATCH_SIZE);
        console.log(`[WEEKLY NEWSLETTER] Sending batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} emails)`);

        // Create batch of emails
        const batchEmails = batch.map(email => ({
          from: "Vendibook <hello@updates.vendibook.com>",
          to: [email],
          subject: subjectLine,
          html: generateHtmlEmail(
            `https://vendibook.com/unsubscribe?email=${encodeURIComponent(email)}`,
            blogTitle,
            blogUrl
          ),
        }));

        try {
          const batchResponse = await resend.batch.send(batchEmails);
          results.push(batchResponse);
          successCount += batch.length;
          console.log(`[WEEKLY NEWSLETTER] Batch sent successfully`);
        } catch (batchError: any) {
          console.error(`[WEEKLY NEWSLETTER] Batch error:`, batchError);
          errorCount += batch.length;
        }

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < emailList.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`[WEEKLY NEWSLETTER] Complete. Success: ${successCount}, Errors: ${errorCount}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Newsletter sent to ${successCount} recipients`,
          sent: successCount,
          errors: errorCount,
          total: emailList.length
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    throw new Error("Either testEmail or sendToAll must be provided");
  } catch (error: any) {
    console.error("[WEEKLY NEWSLETTER] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
