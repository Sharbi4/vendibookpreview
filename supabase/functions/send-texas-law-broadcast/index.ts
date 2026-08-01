// One-off broadcast: Texas Mobile Food Vendor Law announcement.
// Mirrors send-blog-broadcast-once. Supports ?test=email@x.com for a single test send.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CAMPAIGN_ID = "2026-06-10-texas-mobile-food-vendor-law";
const SUBJECT = "Texas just changed food truck licensing — here's what it means";
const PREVIEW = "A new statewide mobile food vendor license could make it easier to rent, sell, buy, and operate food trailers across Texas.";
const ARTICLE_URL = "https://vendibook.com/blog/texas-mobile-food-vendor-law-2026";
const HOME_URL = "https://vendibook.com";
const HOW_IT_WORKS_URL = "https://vendibook.com/how-it-works";
const ABOUT_URL = "https://vendibook.com/how-it-works";
const REFERRAL_URL = "https://vendibook.com/referral";
const BLOG_URL = "https://vendibook.com/blog";
const LIST_URL = "https://vendibook.com/list";
const TX_SALE_URL = "https://vendibook.com/search?mode=sale&q=food+truck&lat=31&lng=-100&radius=500&location=Texas";
const TX_RENT_URL = "https://vendibook.com/search?mode=rent&q=food+trailer&lat=31&lng=-100&radius=500&location=Texas";
const LOGO_IMG = "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png";
const FROM = "Vendibook <hello@updates.vendibook.com>";
const REPLY_TO = "support@vendibook.com";

type Listing = {
  id: string;
  title: string;
  mode: string;
  city: string | null;
  state: string | null;
  cover_image_url: string | null;
  price_daily: number | null;
  price_sale: number | null;
};

const utm = (url: string, suffix = "") =>
  `${url}${url.includes("?") ? "&" : "?"}utm_source=email&utm_medium=campaign&utm_campaign=${CAMPAIGN_ID}${suffix ? `_${suffix}` : ""}`;

const fmtPrice = (l: Listing) => {
  if (l.mode === "sale" && l.price_sale) return `$${Number(l.price_sale).toLocaleString()}`;
  if (l.mode === "rent" && l.price_daily) return `$${Number(l.price_daily).toLocaleString()}/day`;
  return "View details";
};
const badge = (l: Listing) =>
  l.mode === "sale"
    ? `<span style="display:inline-block;background:#0a0a0a;color:#fff;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:4px 8px;border-radius:999px;">For Sale</span>`
    : `<span style="display:inline-block;background:#ff5124;color:#fff;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:4px 8px;border-radius:999px;">For Rent</span>`;

function listingCard(l: Listing) {
  const url = utm(`https://vendibook.com/listing/${l.id}`, "featured");
  const loc = [l.city, l.state].filter(Boolean).join(", ") || "Texas";
  const img = l.cover_image_url || "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;overflow:hidden;">
  <tr><td><a href="${url}" style="text-decoration:none;color:inherit;display:block;"><img src="${img}" alt="${l.title.replace(/"/g, "&quot;")}" width="540" style="width:100%;height:auto;max-height:220px;object-fit:cover;display:block;border:0;"></a></td></tr>
  <tr><td style="padding:14px 16px 16px 16px;">
    <div style="margin:0 0 8px 0;">${badge(l)}</div>
    <a href="${url}" style="text-decoration:none;color:#0a0a0a;"><div style="font-size:16px;font-weight:700;line-height:1.3;margin:0 0 4px 0;">${l.title}</div></a>
    <div style="font-size:13px;color:#737373;margin:0 0 10px 0;">${loc} · <span style="color:#0a0a0a;font-weight:600;">${fmtPrice(l)}</span></div>
    <a href="${url}" style="display:inline-block;background:#ff5124;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:9px 18px;border-radius:999px;">View Listing →</a>
  </td></tr>
</table>`;
}

function whyCard(title: string, body: string, ctaText: string, ctaUrl: string) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;">
  <tr><td style="padding:18px 20px;">
    <div style="font-size:15px;font-weight:700;color:#0a0a0a;margin:0 0 6px 0;">${title}</div>
    <div style="font-size:14px;line-height:1.55;color:#404040;margin:0 0 12px 0;">${body}</div>
    <a href="${utm(ctaUrl, "why")}" style="font-size:13px;font-weight:700;color:#ff5124;text-decoration:none;">${ctaText} →</a>
  </td></tr>
</table>`;
}

function resourceCard(title: string, body: string, url: string) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;">
  <tr><td style="padding:14px 16px;">
    <a href="${utm(url, "resource")}" style="text-decoration:none;color:#0a0a0a;"><div style="font-size:14px;font-weight:700;margin:0 0 4px 0;">${title} →</div></a>
    <div style="font-size:13px;line-height:1.5;color:#525252;">${body}</div>
  </td></tr>
</table>`;
}

function buildHtml(unsubUrl: string, listings: Listing[]) {
  const listingsHtml = listings.length
    ? listings.map(listingCard).join("")
    : `<p style="margin:0;font-size:14px;color:#737373;text-align:center;padding:14px 0;">Browse all Texas food trucks &amp; trailers on Vendibook.</p>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${SUBJECT}</title></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${PREVIEW}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f4;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">

<!-- Header -->
<tr><td align="center" style="padding:32px 32px 4px 32px;">
  <img src="${LOGO_IMG}" alt="Vendibook" height="96" style="height:96px;width:auto;display:inline-block;border:0;">
  <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#737373;margin-top:6px;">Food trucks · trailers · kitchens · lots</div>
</td></tr>

<!-- Hero -->
<tr><td style="padding:24px 32px 0 32px;">
  <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#ff5124;font-weight:700;">Texas · Industry Update</p>
  <h1 style="margin:0 0 14px 0;font-size:26px;line-height:1.2;font-weight:700;color:#0a0a0a;letter-spacing:-0.01em;">Texas Is Changing Mobile Food Vendor Licensing</h1>
  <p style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#404040;">A new statewide licensing system could make it easier for food truck and trailer operators to work across Texas — and create more opportunity for trailer owners, sellers, and fleet operators.</p>
</td></tr>
<tr><td align="center" style="padding:4px 32px 8px 32px;">
  <a href="${utm(ARTICLE_URL)}" style="display:inline-block;background:#ff5124;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:999px;">Read the Full Blog Post →</a>
</td></tr>

<tr><td style="padding:18px 32px 0 32px;"><hr style="border:0;border-top:1px solid #e7e5e4;margin:0;"></td></tr>

<!-- Law preview -->
<tr><td style="padding:22px 32px 0 32px;font-size:15px;line-height:1.65;color:#262626;">
  <h2 style="margin:0 0 12px 0;font-size:18px;font-weight:700;color:#0a0a0a;">What's Changing</h2>
  <p style="margin:0 0 14px 0;">Starting <strong>July 1, 2026</strong>, Texas mobile food vendors will move under a statewide licensing system through the Texas Department of State Health Services.</p>
  <p style="margin:0 0 14px 0;">Instead of separate local health permits in each city, Texas is creating a centralized licensing process for mobile food vending vehicles. This may make it easier for operators to:</p>
  <ul style="margin:0 0 14px 18px;padding:0;color:#404040;">
    <li style="margin:0 0 6px 0;">Work across multiple Texas markets</li>
    <li style="margin:0 0 6px 0;">Rent trailers for events, pop-ups, and seasonal businesses</li>
    <li style="margin:0 0 6px 0;">Build or expand food trailer fleets</li>
    <li style="margin:0 0 6px 0;">Buy or sell trailers with clearer compliance expectations</li>
    <li>Understand which mobile food license applies to their operation</li>
  </ul>
  <p style="margin:0 0 18px 0;font-size:13px;color:#737373;font-style:italic;">Local rules may still apply for parking, fire safety, zoning, property permission, events, and vendor-lot requirements.</p>
</td></tr>

<!-- Why this matters cards -->
<tr><td style="padding:8px 32px 0 32px;">
  <h2 style="margin:0 0 14px 0;font-size:18px;font-weight:700;color:#0a0a0a;">Why This Matters</h2>
  ${whyCard("For Trailer Owners", "If you have a food trailer sitting unused, the new system could increase rental demand from operators testing new markets.", "List Your Trailer", LIST_URL)}
  ${whyCard("For Food Truck Operators", "A statewide license may make it easier to operate across Texas without starting from scratch in every local jurisdiction.", "Learn What Changed", ARTICLE_URL)}
  ${whyCard("For Buyers & Sellers", "Equipment, inspection history, and intended food use matter more than ever. A clear listing helps serious buyers understand what they're purchasing.", "Browse Trucks & Trailers", TX_SALE_URL)}
  ${whyCard("For Fleet Owners", "A more predictable licensing process may make it easier to manage multiple trailers, expand into new markets, and support renters.", "Explore Vendibook", HOME_URL)}
</td></tr>

<!-- Featured listings -->
<tr><td style="padding:18px 32px 0 32px;">
  <h2 style="margin:0 0 6px 0;font-size:18px;font-weight:700;color:#0a0a0a;">Featured Texas Food Trucks &amp; Trailers</h2>
  <p style="margin:0 0 16px 0;font-size:14px;color:#737373;">Real listings active on Vendibook right now.</p>
  ${listingsHtml}
</td></tr>

<!-- Continue reading -->
<tr><td style="padding:18px 32px 0 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;border-radius:12px;">
    <tr><td style="padding:24px 22px;color:#ffffff;text-align:center;">
      <div style="font-size:18px;font-weight:700;margin:0 0 8px 0;">Want the full breakdown?</div>
      <div style="font-size:14px;line-height:1.55;color:#d4d4d4;margin:0 0 16px 0;">We cover what the new Texas law means for rentals, fleet owners, buyers, sellers, new vendors, and current operators.</div>
      <a href="${utm(ARTICLE_URL, "midcta")}" style="display:inline-block;background:#ff5124;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:999px;">Continue Reading the Blog →</a>
    </td></tr>
  </table>
</td></tr>

<!-- Resources -->
<tr><td style="padding:24px 32px 0 32px;">
  <h2 style="margin:0 0 14px 0;font-size:18px;font-weight:700;color:#0a0a0a;">Helpful Vendibook Resources</h2>
  ${resourceCard("How Vendibook Works", "Learn how renting, buying, selling, and listing work on Vendibook.", HOW_IT_WORKS_URL)}
  ${resourceCard("Refer a Friend", "Know someone with a food truck, trailer, kitchen, lot, or vendor opportunity? Share Vendibook and help grow the mobile food economy.", REFERRAL_URL)}
  ${resourceCard("Learn More About Vendibook", "How Vendibook connects food truck owners, trailer owners, vendors, kitchens, lots, and event opportunities.", ABOUT_URL)}
  ${resourceCard("More Food Truck Resources", "Guides, tips, and industry updates for food truck and trailer owners.", BLOG_URL)}
</td></tr>

<!-- List your trailer -->
<tr><td style="padding:22px 32px 0 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;">
    <tr><td style="padding:22px;text-align:center;">
      <div style="font-size:17px;font-weight:700;color:#0a0a0a;margin:0 0 8px 0;">Have a food truck or trailer sitting unused?</div>
      <div style="font-size:14px;line-height:1.55;color:#525252;margin:0 0 16px 0;">Vendibook helps owners turn idle equipment into real income by connecting them with renters, buyers, and food entrepreneurs.</div>
      <a href="${utm(LIST_URL, "list")}" style="display:inline-block;background:#ff5124;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:999px;">List Your Food Truck or Trailer →</a>
    </td></tr>
  </table>
</td></tr>

<!-- Disclaimer -->
<tr><td style="padding:20px 32px 8px 32px;">
  <p style="margin:0;font-size:11px;line-height:1.5;color:#a3a3a3;text-align:center;font-style:italic;">This email is for general informational purposes only and is not legal advice. Please review official Texas DSHS guidance before operating.</p>
</td></tr>

<!-- Footer -->
<tr><td style="background:#fafaf9;padding:24px 32px;border-top:1px solid #e7e5e4;font-size:12px;line-height:1.6;color:#737373;text-align:center;">
  <p style="margin:0 0 6px 0;color:#0a0a0a;font-weight:700;letter-spacing:0.04em;">VENDIBOOK</p>
  <p style="margin:0 0 10px 0;">The marketplace for the mobile food economy.<br>Food trucks, trailers, shared kitchens, ghost kitchens, and vendor spaces.</p>
  <p style="margin:0 0 6px 0;">
    <a href="${HOME_URL}" style="color:#525252;text-decoration:underline;">vendibook.com</a> ·
    <a href="${BLOG_URL}" style="color:#525252;text-decoration:underline;">Blog</a> ·
    <a href="${REFERRAL_URL}" style="color:#525252;text-decoration:underline;">Refer</a> ·
    <a href="${unsubUrl}" style="color:#525252;text-decoration:underline;">Unsubscribe</a>
  </p>
  <p style="margin:0;color:#a3a3a3;">Vendibook · 1 S Church St, Tucson, AZ</p>
</td></tr>

</table></td></tr></table></body></html>`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const resend = new Resend(resendKey);

    const url = new URL(req.url);
    const testEmail = url.searchParams.get("test")?.trim().toLowerCase() || null;

    // Pull featured TX listings (sale + rent, mix)
    const { data: txListings } = await admin
      .from("listings")
      .select("id,title,mode,city,state,cover_image_url,price_daily,price_sale,published_at")
      .eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear")
      .ilike("state", "TX")
      .not("cover_image_url", "is", null)
      .not("title", "ilike", "DEMO%")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(40);

    const filtered = (txListings ?? []).filter((l: any) => {
      const t = (l.title || "").toLowerCase();
      return t.includes("truck") || t.includes("trailer") || t.includes("food") || t.includes("cart");
    });
    // Interleave sale + rent for variety
    const sale = filtered.filter((l: any) => l.mode === "sale").slice(0, 4);
    const rent = filtered.filter((l: any) => l.mode === "rent").slice(0, 4);
    const featured: Listing[] = [];
    for (let i = 0; i < 6; i++) {
      if (i % 2 === 0 && sale.length) featured.push(sale.shift());
      else if (rent.length) featured.push(rent.shift());
      else if (sale.length) featured.push(sale.shift());
    }

    // Test mode: send to single address, skip dedup
    if (testEmail) {
      if (!isValidEmail(testEmail)) throw new Error("Invalid test email");
      const unsubUrl = `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(testEmail)}`;
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: [testEmail],
        subject: `[TEST] ${SUBJECT}`,
        html: buildHtml(unsubUrl, featured),
        reply_to: REPLY_TO,
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [
          { name: "type", value: "blog_campaign" },
          { name: "campaign", value: CAMPAIGN_ID },
          { name: "mode", value: "test" },
        ],
      });
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ ok: true, test: true, to: testEmail, id: data?.id, featuredCount: featured.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Broadcast: all auth users
    const allUsers: { id: string; email: string | null }[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      const users = data?.users ?? [];
      if (!users.length) break;
      allUsers.push(...users.map((u) => ({ id: u.id, email: u.email ?? null })));
      if (users.length < 1000) break;
      page++;
      if (page > 50) break;
    }

    const { data: unsubs } = await admin.from("email_unsubscribes").select("email");
    const unsubSet = new Set((unsubs ?? []).map((u: any) => u.email.toLowerCase()));

    const { data: suppressed } = await admin.from("suppressed_emails").select("email");
    const supSet = new Set((suppressed ?? []).map((u: any) => u.email.toLowerCase()));

    const { data: newsletterUnsubs } = await admin
      .from("newsletter_subscribers")
      .select("email")
      .not("unsubscribed_at", "is", null);
    for (const r of newsletterUnsubs ?? []) unsubSet.add((r as any).email.toLowerCase());

    const { data: sent } = await admin
      .from("blog_campaign_sends")
      .select("email")
      .eq("campaign_id", CAMPAIGN_ID)
      .eq("status", "sent")
      .eq("is_test", false);
    const sentSet = new Set((sent ?? []).map((r: any) => r.email.toLowerCase()));

    const recipients: { email: string; user_id: string }[] = [];
    const seen = new Set<string>();
    for (const u of allUsers) {
      const e = (u.email ?? "").trim().toLowerCase();
      if (!e || !isValidEmail(e)) continue;
      if (unsubSet.has(e) || supSet.has(e) || sentSet.has(e) || seen.has(e)) continue;
      seen.add(e);
      recipients.push({ email: e, user_id: u.id });
    }

    let sentCount = 0, failCount = 0;
    for (const r of recipients) {
      const unsubUrl = `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(r.email)}`;
      try {
        const { data, error } = await resend.emails.send({
          from: FROM,
          to: [r.email],
          subject: SUBJECT,
          html: buildHtml(unsubUrl, featured),
          reply_to: REPLY_TO,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "type", value: "blog_campaign" },
            { name: "campaign", value: CAMPAIGN_ID },
          ],
        });
        if (error) {
          failCount++;
          await admin.from("blog_campaign_sends").insert({
            campaign_id: CAMPAIGN_ID, user_id: r.user_id, email: r.email,
            status: "failed", error_message: error.message, is_test: false,
          });
        } else {
          sentCount++;
          await admin.from("blog_campaign_sends").insert({
            campaign_id: CAMPAIGN_ID, user_id: r.user_id, email: r.email,
            status: "sent", resend_message_id: data?.id ?? null, is_test: false,
          });
        }
      } catch (e) {
        failCount++;
        await admin.from("blog_campaign_sends").insert({
          campaign_id: CAMPAIGN_ID, user_id: r.user_id, email: r.email,
          status: "failed", error_message: (e as Error).message, is_test: false,
        });
      }
      await sleep(550);
    }

    return new Response(JSON.stringify({
      ok: true, campaignId: CAMPAIGN_ID,
      attempted: recipients.length, sent: sentCount, failed: failCount, featuredCount: featured.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-texas-law-broadcast error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
