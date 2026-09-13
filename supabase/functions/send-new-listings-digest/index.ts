// Vendibook "New Listings Digest" — TEST / RENDER / AUDIENCE ONLY.
//
// This function intentionally has NO mass-send path. It can count the
// eligible audience, render the HTML, and send exactly one test email.
// A production broadcast must be added deliberately later.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  MK,
  FONT,
  esc,
  mkButton,
  marketingShell,
  MARKETING_FROM,
  MARKETING_REPLY_TO,
  SITE_URL,
} from "../_shared/marketing-templates/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-digest-test-secret",
};

const CAMPAIGN = "new_listings_digest_sep2026";
const EQUINOX_LOGO =
  "https://vendibook.com/__l5e/assets-v1/6d0ed30b-6291-4215-9a78-2e010ebc96bc/equinox-funding-logo.png";

const SUBJECT = "New on Vendibook: fresh trucks, trailers & rentals";
const PREHEADER = "Just listed for sale, new rentals to book, and financing options for qualified buyers.";

interface Listing {
  id: string;
  title: string;
  cover_image_url: string | null;
  category: string;
  city: string | null;
  state: string | null;
  price_daily: number | null;
  price_weekly: number | null;
  price_sale: number | null;
  mode: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  food_truck: "Food Truck",
  food_trailer: "Food Trailer",
  ghost_kitchen: "Commercial Kitchen",
  vendor_space: "Vendor Space",
  vendor_lot: "Vendor Lot",
};

function money(n: number): string {
  return `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function priceLabel(l: Listing): string {
  if (l.mode === "sale") return l.price_sale ? money(l.price_sale) : "View pricing";
  if (l.price_daily) return `${money(l.price_daily)}/day`;
  if (l.price_weekly) return `${money(l.price_weekly)}/week`;
  return "View pricing";
}

function utm(path: string, content: string): string {
  const url = path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=email&utm_medium=newsletter&utm_campaign=${CAMPAIGN}&utm_content=${content}`;
}

// ── Blocks ──────────────────────────────────────────────────────────────
function sectionHeading(eyebrow: string, title: string, sub?: string): string {
  return `
  <div style="margin:0 0 16px;">
    <div style="font-family:${FONT};font-size:11px;color:${MK.orangeOnWhite};text-transform:uppercase;font-weight:700;letter-spacing:1.5px;margin-bottom:6px;">${esc(eyebrow)}</div>
    <h2 style="font-family:${FONT};font-size:20px;font-weight:700;color:${MK.text};margin:0 0 ${sub ? "6px" : "0"};line-height:1.3;">${esc(title)}</h2>
    ${sub ? `<p style="font-family:${FONT};font-size:14px;color:${MK.textSecondary};line-height:1.6;margin:0;">${esc(sub)}</p>` : ""}
  </div>`;
}

function listingCard(l: Listing, content: string, ctaLabel: string): string {
  const url = utm(`/listing/${l.id}`, content);
  const img = l.cover_image_url || `${SITE_URL}/placeholder.svg`;
  const loc = [l.city, l.state].filter(Boolean).join(", ") || "United States";
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;border:1px solid ${MK.border};border-radius:14px;overflow:hidden;background:${MK.surface};">
    <tr><td style="padding:0;">
      <a href="${esc(url)}" style="text-decoration:none;display:block;">
        <img src="${esc(img)}" alt="${esc(l.title)}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;" />
      </a>
    </td></tr>
    <tr><td style="padding:16px 18px 18px;">
      <div style="font-family:${FONT};font-size:11px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:${MK.textMuted};margin-bottom:6px;">${esc(CATEGORY_LABEL[l.category] || "Listing")} · ${esc(loc)}</div>
      <div style="font-family:${FONT};font-size:17px;font-weight:700;color:${MK.text};line-height:1.35;margin-bottom:4px;">${esc(l.title)}</div>
      <div style="font-family:${FONT};font-size:16px;font-weight:700;color:${MK.orangeOnWhite};margin-bottom:14px;">${esc(priceLabel(l))}</div>
      ${mkButton(ctaLabel, url)}
    </td></tr>
  </table>`;
}

export function buildDigestHtml(opts: {
  forSale: Listing[];
  rentals: Listing[];
  unsubscribeUrl: string;
  test?: boolean;
}): string {
  const { forSale, rentals, unsubscribeUrl } = opts;

  const hero = `
  <tr><td style="padding:16px 28px 4px;text-align:center;">
    <div style="font-family:${FONT};font-size:11px;color:${MK.orangeOnWhite};text-transform:uppercase;font-weight:700;letter-spacing:1.6px;margin-bottom:10px;">New on Vendibook</div>
    <h1 style="font-family:${FONT};font-size:27px;line-height:1.25;font-weight:700;color:${MK.text};margin:0 0 10px;">Fresh trucks, trailers &amp; rentals worth a look</h1>
    <p style="font-family:${FONT};font-size:15px;line-height:1.65;color:${MK.textSecondary};margin:0 auto 18px;max-width:430px;">A quick roundup of what just went live on the marketplace — units for sale, kitchens and trailers to rent, and financing options for qualified buyers.</p>
    ${mkButton("Browse the marketplace", utm("/search", "hero"))}
  </td></tr>
  <tr><td style="padding:22px 28px 0;"><div style="height:1px;background:${MK.border};"></div></td></tr>`;

  const saleSection = forSale.length
    ? `
  <tr><td style="padding:26px 28px 0;">
    ${sectionHeading("Just listed for sale", "Featured units", "Recently published for-sale trucks and trailers from real sellers.")}
    ${forSale.map((l) => listingCard(l, "featured_sale", "View listing")).join("")}
    <div style="text-align:center;padding:4px 0 0;">
      <a href="${esc(utm("/search?mode=sale", "featured_sale_all"))}" style="font-family:${FONT};font-size:14px;font-weight:700;color:${MK.orangeOnWhite};text-decoration:none;">See all for-sale listings →</a>
    </div>
  </td></tr>`
    : "";

  const rentalSection = rentals.length
    ? `
  <tr><td style="padding:30px 28px 0;">
    ${sectionHeading("Available to rent", "New rentals", "Book a trailer, truck, or commercial kitchen without a long-term commitment.")}
    ${rentals.map((l) => listingCard(l, "featured_rental", "Check availability")).join("")}
    <div style="text-align:center;padding:4px 0 0;">
      <a href="${esc(utm("/rentals", "featured_rental_all"))}" style="font-family:${FONT};font-size:14px;font-weight:700;color:${MK.orangeOnWhite};text-decoration:none;">Browse all rentals →</a>
    </div>
  </td></tr>`
    : "";

  const financing = `
  <tr><td style="padding:30px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${MK.border};border-radius:14px;background:${MK.surfaceMuted};">
      <tr><td style="padding:22px 20px;text-align:center;">
        <div style="font-family:${FONT};font-size:11px;color:${MK.orangeOnWhite};text-transform:uppercase;font-weight:700;letter-spacing:1.5px;margin-bottom:12px;">Financing</div>
        <img src="${EQUINOX_LOGO}" alt="Equinox Funding" width="170" style="display:inline-block;width:170px;max-width:170px;height:auto;border:0;margin:0 0 14px;" />
        <div style="font-family:${FONT};font-size:19px;font-weight:700;color:${MK.text};line-height:1.35;margin-bottom:8px;">Found the right truck? Financing may help you make it yours.</div>
        <p style="font-family:${FONT};font-size:14px;line-height:1.65;color:${MK.textSecondary};margin:0 auto 16px;max-width:420px;">Equipment financing is available to eligible buyers through our partner Equinox Funding. Quick online application, and many decisions come back within 24–48 hours.</p>
        ${mkButton("Explore financing options", utm("/financing", "financing"))}
        <p style="font-family:${FONT};font-size:11px;line-height:1.6;color:${MK.textMuted};margin:14px auto 0;max-width:440px;">Financing is provided by Equinox Funding, not Vendibook. Applications are subject to underwriting and approval; terms, rates, and availability vary. Approval is not guaranteed.</p>
      </td></tr>
    </table>
  </td></tr>`;

  const shortcuts = [
    { label: "Food Trucks", href: utm("/search?category=food_truck", "shortcut_trucks") },
    { label: "Food Trailers", href: utm("/search?category=food_trailer", "shortcut_trailers") },
    { label: "Rentals", href: utm("/rentals", "shortcut_rentals") },
    { label: "Financing", href: utm("/financing", "shortcut_financing") },
  ];

  const browse = `
  <tr><td style="padding:30px 28px 0;">
    ${sectionHeading("Keep looking", "Browse by what you need")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${MK.border};border-radius:14px;background:${MK.surface};">
      ${shortcuts
        .map(
          (s, i) => `
      <tr><td style="padding:15px 18px;${i > 0 ? `border-top:1px solid ${MK.border};` : ""}">
        <a href="${esc(s.href)}" style="font-family:${FONT};font-size:15px;font-weight:700;color:${MK.text};text-decoration:none;display:block;">${esc(s.label)} <span style="color:${MK.orangeOnWhite};">→</span></a>
      </td></tr>`,
        )
        .join("")}
    </table>
  </td></tr>`;

  const articleUrl = utm("/blog/mobile-food-permit-guide-by-state", "article");
  const article = `
  <tr><td style="padding:30px 28px 0;">
    ${sectionHeading("From the Vendibook blog", "Mobile Food Vendor Permits: How to Find the Requirements in Your State")}
    <a href="${esc(articleUrl)}" style="text-decoration:none;display:block;">
      <img src="${SITE_URL}/images/blog/food-truck-editorial-hero.jpg" alt="Mobile food vendor permits guide" width="552" style="display:block;width:100%;max-width:552px;height:auto;border-radius:12px;border:1px solid ${MK.border};margin-bottom:14px;" />
    </a>
    <p style="font-family:${FONT};font-size:14px;color:${MK.textSecondary};line-height:1.65;margin:0 0 14px;">Mobile food permitting is layered and local. Here is how to find the requirements that actually apply to your truck, trailer, or cart — without guessing.</p>
    ${mkButton("Read the guide", articleUrl, { ghost: true })}
  </td></tr>`;

  const finalCta = `
  <tr><td style="padding:32px 28px 34px;text-align:center;">
    <div style="font-family:${FONT};font-size:18px;font-weight:700;color:${MK.text};margin-bottom:10px;">New listings go live every week.</div>
    <p style="font-family:${FONT};font-size:14px;color:${MK.textSecondary};line-height:1.6;margin:0 0 16px;">Search by city, category, or budget and save the ones you like.</p>
    ${mkButton("Start searching", utm("/search", "footer_cta"))}
  </td></tr>`;

  return marketingShell({
    title: SUBJECT,
    preheader: PREHEADER,
    unsubscribeUrl,
    bodyRows: `${hero}${saleSection}${rentalSection}${financing}${browse}${article}${finalCta}`,
    footerNote: opts.test ? "Internal test send — not sent to subscribers." : undefined,
  });
}

// ── Data ────────────────────────────────────────────────────────────────
const LISTING_COLS =
  "id,title,cover_image_url,category,city,state,price_daily,price_weekly,price_sale,mode,published_at";

async function loadForSale(supabase: any): Promise<Listing[]> {
  const { data } = await supabase
    .from("listings")
    .select(LISTING_COLS)
    .eq("status", "published")
    .eq("mode", "sale")
    .is("deleted_at", null)
    .not("cover_image_url", "is", null)
    .gt("price_sale", 0)
    .order("published_at", { ascending: false })
    .limit(12);
  return ((data || []) as Listing[])
    .filter((l) => !/^demo/i.test(l.title || ""))
    .slice(0, 3);
}

async function loadRentals(supabase: any): Promise<Listing[]> {
  const { data } = await supabase
    .from("listings")
    .select(LISTING_COLS)
    .eq("status", "published")
    .eq("mode", "rent")
    .is("deleted_at", null)
    .not("cover_image_url", "is", null)
    .order("published_at", { ascending: false })
    .limit(12);
  return ((data || []) as Listing[])
    .filter((l) => !/^demo/i.test(l.title || ""))
    .slice(0, 2);
}

/** Same consent rules as the weekly digest audience. */
async function getAudienceEmails(supabase: any): Promise<string[]> {
  const { data: subs } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .is("unsubscribed_at", null);
  const { data: suppressed } = await supabase.from("suppressed_emails").select("email");
  const { data: unsubbed } = await supabase.from("email_unsubscribes").select("email");
  const blocked = new Set([
    ...(suppressed ?? []).map((r: any) => String(r.email).toLowerCase()),
    ...(unsubbed ?? []).map((r: any) => String(r.email).toLowerCase()),
  ]);
  return Array.from(
    new Set(
      (subs ?? [])
        .map((r: any) => String(r.email || "").toLowerCase())
        .filter((e: string) => e && !blocked.has(e) && !e.endsWith("example.com") && !e.endsWith(".test")),
    ),
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ success: false, error: "Authentication required." }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    let actorId: string | null = null;
    const opsSecret = Deno.env.get("DIGEST_TEST_SECRET") || "";
    const headerSecret = req.headers.get("x-digest-test-secret") || "";
    const opsAuthorized = !!opsSecret && headerSecret === opsSecret;
    if (!opsAuthorized && token !== serviceKey) {
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      const user = userData?.user;
      if (userErr || !user) return json({ success: false, error: "Authentication required." }, 401);
      const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id });
      if (!isAdmin) return json({ success: false, error: "Admin access required." }, 403);
      actorId = user.id;
    }


    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    if (!["audience", "render", "test"].includes(action)) {
      return json(
        { success: false, error: "Unknown action. This digest supports audience, render, and test only." },
        400,
      );
    }

    if (action === "audience") {
      const emails = await getAudienceEmails(supabase);
      return json({ success: true, count: emails.length });
    }

    const [forSale, rentals] = await Promise.all([loadForSale(supabase), loadRentals(supabase)]);

    if (action === "render") {
      return json({
        success: true,
        subject: SUBJECT,
        preheader: PREHEADER,
        html: buildDigestHtml({ forSale, rentals, unsubscribeUrl: `${SITE_URL}/unsubscribe` }),
        forSale: forSale.map((l) => ({ id: l.id, title: l.title })),
        rentals: rentals.map((l) => ({ id: l.id, title: l.title })),
      });
    }

    // -- single test send --------------------------------------------------
    const testEmail = String(body?.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return json({ success: false, error: "Enter a valid test email address." }, 400);
    }
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) throw new Error("RESEND_API_KEY not configured");

    const unsubUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(testEmail)}`;
    const html = buildDigestHtml({ forSale, rentals, unsubscribeUrl: unsubUrl, test: true });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: MARKETING_FROM,
        to: [testEmail],
        reply_to: MARKETING_REPLY_TO,
        subject: `[TEST] ${SUBJECT}`,
        html,
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Resend rejected test send", res.status);
      return json({ success: false, error: payload?.message || "Resend rejected the send." }, res.status);
    }

    await supabase.from("blog_campaign_sends").insert({
      campaign_id: `${CAMPAIGN}-test`,
      user_id: actorId,
      email: testEmail,
      status: "sent",
      resend_message_id: payload?.id ?? null,
      is_test: true,
    });

    return json({
      success: true,
      sentTo: testEmail,
      messageId: payload?.id ?? null,
      subject: `[TEST] ${SUBJECT}`,
      preheader: PREHEADER,
      forSale: forSale.map((l) => ({ id: l.id, title: l.title })),
      rentals: rentals.map((l) => ({ id: l.id, title: l.title })),
    });
  } catch (e) {
    console.error("send-new-listings-digest failed", (e as Error).message);
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
