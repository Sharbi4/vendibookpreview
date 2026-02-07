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

interface Listing {
  emoji: string;
  title: string;
  category: string;
  type: string;
  price: string;
  description: string;
  url: string;
}

const generateHtmlEmail = (unsubscribeUrl: string, blogTitle: string, blogUrl: string, blogAuthor: string): string => {
  // This Week's New Listings - Real listings with actual links
  const newListings: Listing[] = [
    {
      emoji: "🍽️",
      title: "Commissary Kitchen For Rent",
      category: "Ghost Kitchen",
      type: "For Rent",
      price: "$150 / day",
      description: "A compliant commissary kitchen in Charlotte, NC designed for food trucks and prep-only operations that need flexible, pay-for-what-you-use access.",
      url: "https://vendibook.com/listing/24594068-25df-4bbe-b142-7bad96aacf39",
    },
    {
      emoji: "🍳",
      title: "Commercial Kitchen Rental",
      category: "Ghost Kitchen",
      type: "For Rent",
      price: "$160 / day",
      description: "A fully equipped commercial kitchen in Dallas, Oregon suitable for established brands, caterers, and growing ghost kitchen concepts.",
      url: "https://vendibook.com/listing/ede54357-a79d-4325-bb1f-153c75fd89dc",
    },
    {
      emoji: "🚚",
      title: "Custom-Built 6' x 12' Pop-Up Lemonade Concession Trailer",
      category: "Food Trailer",
      type: "For Sale",
      price: "$5,900",
      description: "A turnkey concession trailer in Charlotte, NC ready for operators looking to own their mobile setup and expand into festivals, events, or permanent vendor locations.",
      url: "https://vendibook.com/listing/a3ead971-38c7-4c0c-8f3f-2b02185c7c2f",
    },
    {
      emoji: "📍",
      title: "Deep Ellum Brewery Lot - 6 Premium Spots",
      category: "Vendor Space",
      type: "For Rent",
      price: "$175 / day",
      description: "Premium vendor spots in Dallas's iconic Deep Ellum district. High foot traffic, brewery crowds, and weekend events make this a prime location.",
      url: "https://vendibook.com/listing/6356eca8-4204-4856-9556-63a4a005df50",
    },
  ];

  const listingsHtml = newListings.map(listing => `
    <tr>
      <td style="padding-bottom: 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.lightGray}; border-radius: 12px; border-left: 4px solid ${COLORS.primary};">
          <tr>
            <td style="padding: 16px 20px;">
              <h3 style="margin: 0 0 6px; font-size: 16px; font-weight: 600; color: ${COLORS.charcoal};">
                ${listing.emoji} ${listing.title}
              </h3>
              <p style="margin: 0 0 8px; font-size: 13px; color: ${COLORS.gray};">
                <strong>Category:</strong> ${listing.category} &nbsp;|&nbsp; <strong>Type:</strong> ${listing.type}
              </p>
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: ${COLORS.primary};">
                Starting at: ${listing.price}
              </p>
              <p style="margin: 0 0 12px; font-size: 13px; color: ${COLORS.gray}; line-height: 1.5;">
                ${listing.description}
              </p>
              <a href="${listing.url}" style="display: inline-block; background: ${COLORS.primary}; color: ${COLORS.white}; text-decoration: none; padding: 8px 20px; border-radius: 6px; font-weight: 600; font-size: 13px;">
                View Listing →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

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
    New ways to book space more flexibly—peak hours, shared slots, and fresh listings to help you launch smarter.
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
                <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="VendiBook" style="height: 80px;" />
              </a>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: ${COLORS.charcoal}; line-height: 1.6;">
                Hi there,
              </p>
              <p style="margin: 0; font-size: 15px; color: ${COLORS.gray}; line-height: 1.6;">
                This week on Vendibook, we've rolled out new ways to book space more flexibly—plus added fresh listings and new resources to help you launch smarter.
              </p>
              <p style="margin: 16px 0 0; font-size: 15px; color: ${COLORS.gray}; line-height: 1.6;">
                If you're building or scaling a food business, here's what's new 👇
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- NEW THIS WEEK - Peak Hours Feature -->
          <tr>
            <td style="padding: 24px 40px 16px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: ${COLORS.charcoal};">
                🚀 New This Week
              </h2>
              <h3 style="margin: 0 0 12px; font-size: 17px; font-weight: 600; color: ${COLORS.charcoal};">
                Peak Hours & Shared Space Slots
              </h3>
              <p style="margin: 0 0 12px; font-size: 14px; color: ${COLORS.gray}; line-height: 1.6;">
                You can now find listings that offer:
              </p>
              <ul style="margin: 0 0 16px; padding: 0 0 0 20px; font-size: 14px; color: ${COLORS.gray}; line-height: 1.8;">
                <li>Peak-hour access (morning, evening, or weekend blocks)</li>
                <li>Defined time slots within shared kitchens or vendor spaces</li>
                <li>Flexible access without committing to full-time rent</li>
              </ul>
              <p style="margin: 0 0 16px; font-size: 14px; color: ${COLORS.gray}; line-height: 1.6;">
                Perfect for testing demand, prep-only operations, pop-ups, and seasonal concepts.
              </p>
              <a href="https://vendibook.com/search?category=shared-kitchen" style="display: inline-block; background: ${COLORS.primary}; color: ${COLORS.white}; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                Explore Flexible Spaces →
              </a>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 8px 40px;">
              <div style="border-top: 1px solid ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- NEW LISTINGS THIS WEEK -->
          <tr>
            <td style="padding: 24px 40px 8px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 700; color: ${COLORS.charcoal};">
                🆕 New Listings This Week
              </h2>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                ${listingsHtml}
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 16px 40px;">
              <div style="border-top: 1px solid ${COLORS.border};"></div>
            </td>
          </tr>
          
          <!-- BLOG CALLOUT - Featured -->
          <tr>
            <td style="padding: 24px 40px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: ${COLORS.charcoal};">
                📖 This Week on the Vendibook Blog
              </h2>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, rgba(255,109,31,0.1) 0%, rgba(255,109,31,0.05) 100%); border-radius: 12px; border: 1px solid rgba(255,109,31,0.2);">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: ${COLORS.charcoal}; line-height: 1.3;">
                      ${blogTitle}
                    </h3>
                    <p style="margin: 0 0 12px; font-size: 13px; color: ${COLORS.gray};">
                      By ${blogAuthor}
                    </p>
                    <p style="margin: 0 0 16px; font-size: 14px; color: ${COLORS.gray}; line-height: 1.6;">
                      Opening a restaurant without testing is one of the most expensive mistakes food entrepreneurs make. This article breaks down the real costs, the hidden risks, and how smart operators validate their concept before signing long-term leases or investing heavily in buildouts.
                    </p>
                    <a href="${blogUrl}" style="display: inline-block; background: ${COLORS.primary}; color: ${COLORS.white}; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                      Read the Blog Post →
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
          
          <!-- WHY VENDIBOOK -->
          <tr>
            <td style="padding: 24px 40px 16px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; color: ${COLORS.charcoal};">
                Why Vendibook
              </h2>
              <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px; color: ${COLORS.gray}; line-height: 1.8;">
                <li style="margin-bottom: 6px;">Rent kitchens and food trucks by the day, week, or month</li>
                <li style="margin-bottom: 6px;">Test concepts before making long-term commitments</li>
                <li style="margin-bottom: 6px;">Verified listings and secure bookings</li>
                <li>Built for real food businesses—not classifieds</li>
              </ul>
            </td>
          </tr>
          
          <!-- CTA SECTION -->
          <tr>
            <td style="padding: 24px 40px 32px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: ${COLORS.charcoal}; text-align: center;">
                Ready to move forward?
              </h2>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="https://vendibook.com/search" style="display: inline-block; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); color: ${COLORS.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; min-width: 220px; text-align: center;">
                      Browse All Listings
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="https://vendibook.com/list" style="display: inline-block; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); color: ${COLORS.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; min-width: 220px; text-align: center;">
                      List Your Kitchen or Space
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="https://vendibook.com/help" style="display: inline-block; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); color: ${COLORS.white}; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; min-width: 220px; text-align: center;">
                      Get Matched to the Right Fit
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Sign-off -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0; font-size: 14px; color: ${COLORS.gray}; line-height: 1.6;">
                See you next week,<br/>
                <strong style="color: ${COLORS.charcoal};">The Vendibook Team</strong><br/>
                <a href="https://vendibook.com" style="color: ${COLORS.primary}; text-decoration: none;">Vendibook.com</a>
              </p>
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

    const blogTitle = data.blog_1_title || "The $250,000 Gamble: Why Testing Your Restaurant Concept Is Non-Negotiable";
    const blogUrl = data.blog_1_url || "https://vendibook.com/blog/restaurant-proof-of-concept-shared-kitchens";
    const blogAuthor = "Brock De Santis | Commissary Specialist & Industry Consultant";

    const subjectLine = "The $250k Gamble: Why Smart Chefs Test Concepts in Shared Kitchens First 🍳";

    // If testEmail is provided, just send to that one address
    if (testEmail && !sendToAll) {
      const unsubscribeUrl = `https://vendibook.com/unsubscribe?email=${encodeURIComponent(testEmail)}`;
      const emailHtml = generateHtmlEmail(unsubscribeUrl, blogTitle, blogUrl, blogAuthor);

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
            blogUrl,
            blogAuthor
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
