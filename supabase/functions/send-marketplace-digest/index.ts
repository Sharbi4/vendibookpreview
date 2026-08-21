// Auto-generated marketplace digest broadcast.
// Pulls latest published listings + city activity, renders branded HTML,
// then creates and sends a Resend Broadcast to the workspace's General audience.
// Triggered by pg_cron every 2 days OR manually by an admin via the dashboard.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildMarketingAudience } from "../_shared/marketingAudience.ts";
import { MK, FONT, esc, mkButton, marketingShell } from "../_shared/marketing-templates/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API = "https://api.resend.com";
const FROM = "Vendibook <hello@updates.vendibook.com>"; // marketing sender convention
const SITE_URL = "https://vendibook.com";

interface Listing {
  id: string;
  title: string;
  cover_image_url: string | null;
  category: string;
  city: string | null;
  state: string | null;
  price_daily: number | null;
  price_sale: number | null;
  mode: string;
  published_at: string | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  food_truck: "Food Truck",
  food_trailer: "Food Trailer",
  ghost_kitchen: "Shared Kitchen",
  vendor_space: "Vendor Space",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function priceLabel(l: Listing): string {
  if (l.mode === "sale" && l.price_sale) return `$${l.price_sale.toLocaleString()}`;
  if (l.price_daily) return `$${l.price_daily}/day`;
  return "View pricing";
}

export function buildHtml(
  listings: Listing[],
  cityCounts: { city: string; count: number }[],
  unsubscribeUrl = "{{{RESEND_UNSUBSCRIBE_URL}}}",
): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const cards = listings
    .slice(0, 6)
    .map((l) => {
      const url = `${SITE_URL}/listing/${l.id}?utm_source=resend&utm_medium=email&utm_campaign=digest`;
      const img = l.cover_image_url || `${SITE_URL}/placeholder.svg`;
      const loc = [l.city, l.state].filter(Boolean).join(", ") || "USA";
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border:1px solid ${MK.border};border-radius:12px;overflow:hidden;background:${MK.surface};">
          <tr><td style="padding:0;">
            <a href="${url}" style="text-decoration:none;color:inherit;display:block;">
              <img src="${escapeHtml(img)}" alt="${escapeHtml(l.title)}" width="600" style="display:block;width:100%;max-width:600px;height:220px;object-fit:cover;" />
              <div style="padding:16px 20px;">
                <div style="font-family:${FONT};font-size:11px;color:${MK.textMuted};text-transform:uppercase;font-weight:700;letter-spacing:1px;margin-bottom:6px;">
                  ${CATEGORY_LABEL[l.category] || l.category} · ${l.mode === "sale" ? "For Sale" : "For Rent"}
                </div>
                <div style="font-family:${FONT};font-size:18px;font-weight:700;color:${MK.text};margin-bottom:4px;line-height:1.3;">${escapeHtml(l.title)}</div>
                <div style="font-family:${FONT};font-size:14px;color:${MK.textSecondary};margin-bottom:8px;">${escapeHtml(loc)}</div>
                <div style="font-family:${FONT};font-size:16px;font-weight:700;color:${MK.orangeOnWhite};">${priceLabel(l)}</div>
              </div>
            </a>
          </td></tr>
        </table>`;
    })
    .join("");

  const cityRows = cityCounts
    .slice(0, 5)
    .map(
      (c) =>
        `<tr><td style="font-family:${FONT};padding:8px 0;border-bottom:1px solid ${MK.border};font-size:14px;color:${MK.text};">${escapeHtml(c.city)}</td><td style="font-family:${FONT};padding:8px 0;border-bottom:1px solid ${MK.border};font-size:14px;color:${MK.textMuted};text-align:right;">${c.count} new</td></tr>`,
    )
    .join("");

  const bodyRows = `
    <tr><td style="padding:8px 28px 20px;text-align:center;">
      <div style="font-family:${FONT};font-size:11px;color:${MK.textMuted};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Vendibook · ${esc(date)}</div>
      <h1 style="font-family:${FONT};font-size:28px;font-weight:700;color:${MK.text};margin:0 0 8px;">What's new this week</h1>
      <p style="font-family:${FONT};font-size:15px;color:${MK.textSecondary};margin:0;">Fresh food trucks, trailers, kitchens, and vendor spaces near you.</p>
    </td></tr>
    <tr><td style="padding:8px 24px 0;">
      <h2 style="font-family:${FONT};font-size:18px;font-weight:700;color:${MK.text};margin:0 0 16px;">Just listed</h2>
      ${cards || `<p style="font-family:${FONT};color:${MK.textSecondary};font-size:14px;">No new listings this cycle — check back soon.</p>`}
    </td></tr>
    ${cityRows ? `<tr><td style="padding:8px 28px 16px;">
      <h2 style="font-family:${FONT};font-size:18px;font-weight:700;color:${MK.text};margin:0 0 12px;">Trending cities</h2>
      <table width="100%" cellpadding="0" cellspacing="0">${cityRows}</table>
    </td></tr>` : ""}
    <tr><td style="padding:8px 28px 32px;text-align:center;">
      ${mkButton("Browse all listings", `${SITE_URL}/search?utm_source=resend&utm_medium=email&utm_campaign=digest`)}
    </td></tr>`;

  return marketingShell({
    title: "What's new on Vendibook",
    preheader: "Fresh food trucks, trailers, kitchens, and vendor spaces near you.",
    bodyRows,
    unsubscribeUrl,
    baseUrl: SITE_URL,
    footerNote: "You're receiving this because you have a Vendibook account or joined our list.",
  });
}

async function resend(path: string, init: RequestInit, key: string) {
  const r = await fetch(`${RESEND_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await r.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep as text */ }
  if (!r.ok) throw new Error(`Resend ${path} ${r.status}: ${text}`);
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;

    // Pull latest published listings (last 14 days, exclude demo)
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: listingsRaw, error: lErr } = await supabase
      .from("listings")
      .select("id,title,cover_image_url,category,city,state,price_daily,price_sale,mode,published_at")
      .eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear")
      .gte("published_at", since)
      .not("title", "ilike", "Demo%")
      .order("published_at", { ascending: false })
      .limit(20);
    if (lErr) throw lErr;
    const listings = (listingsRaw || []) as Listing[];

    // City counts
    const cityMap = new Map<string, number>();
    listings.forEach((l) => {
      if (l.city) cityMap.set(l.city, (cityMap.get(l.city) || 0) + 1);
    });
    const cityCounts = Array.from(cityMap, ([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);

    const html = buildHtml(listings, cityCounts);
    const subject = listings.length
      ? `🚚 ${listings.length} new ${listings.length === 1 ? "listing" : "listings"} on Vendibook`
      : "🚚 What's happening on Vendibook this week";

    if (dryRun) {
      return new Response(JSON.stringify({ subject, html, listingCount: listings.length, cityCounts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- catch-up mode -------------------------------------------------
    // Sends this digest individually to every mailable contact that has NOT
    // already received the given campaignId. Used to top up an audience after
    // a broadcast reached only part of the list. Never double-sends.
    if (body?.mode === "gap") {
      const campaignId = String(body.campaignId ?? `digest-${new Date().toISOString().slice(0, 10)}`);
      const audience = await buildMarketingAudience(supabase, campaignId);
      const limit = Number.isFinite(body?.limit) ? Number(body.limit) : audience.recipients.length;
      const queue = audience.recipients.slice(0, Math.max(0, limit));

      if (body?.previewOnly === true) {
        return new Response(
          JSON.stringify({ success: true, mode: "gap", campaignId, subject, counts: audience.counts, wouldSend: queue.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let sent = 0;
      let failed = 0;
      for (const r of queue) {
        const unsubUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(r.email)}`;
        const personalizedHtml = buildHtml(listings, cityCounts, unsubUrl);
        try {
          const res = await resend(
            "/emails",
            {
              method: "POST",
              body: JSON.stringify({
                from: FROM,
                to: [r.email],
                reply_to: "support@vendibook.com",
                subject,
                html: personalizedHtml,
                headers: {
                  "List-Unsubscribe": `<${unsubUrl}>`,
                  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
              }),
            },
            RESEND_KEY,
          );
          sent++;
          await supabase.from("blog_campaign_sends").insert({
            campaign_id: campaignId,
            user_id: r.user_id,
            email: r.email,
            status: "sent",
            resend_message_id: res?.id ?? null,
            is_test: false,
          });
        } catch (e) {
          failed++;
          await supabase.from("blog_campaign_sends").insert({
            campaign_id: campaignId,
            user_id: r.user_id,
            email: r.email,
            status: "failed",
            error_message: e instanceof Error ? e.message : String(e),
            is_test: false,
          });
        }
        await new Promise((r2) => setTimeout(r2, 550)); // ~2 req/s Resend limit
      }

      return new Response(
        JSON.stringify({ success: true, mode: "gap", campaignId, subject, attempted: queue.length, sent, failed, counts: audience.counts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- broadcast guard -------------------------------------------------
    // The Resend broadcast path mails the entire audience. It must never fire
    // from an accidental or automated call: require an explicit opt-in flag.
    if (body?.confirmBroadcast !== true) {
      return new Response(
        JSON.stringify({
          success: false,
          skipped: "broadcast_not_confirmed",
          message: "Broadcast requires confirmBroadcast: true. Use mode 'gap' for catch-up sends.",
          subject,
          listingCount: listings.length,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve General audience (first one in the account)

    const audiences = await resend("/audiences", { method: "GET" }, RESEND_KEY);
    const general = audiences?.data?.find((a: any) => a.name?.toLowerCase() === "general") || audiences?.data?.[0];
    if (!general?.id) throw new Error("No Resend audience found. Create one in Resend dashboard.");

    // Sync opted-in newsletter subscribers into the audience (skip suppressed/unsubscribed)
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
    const emails = Array.from(
      new Set((subs ?? []).map((r: any) => String(r.email).toLowerCase()).filter((e: string) => e && !blocked.has(e) && !e.endsWith("example.com") && !e.endsWith(".test"))),
    );

    let synced = 0;
    for (const email of emails) {
      try {
        await resend(`/audiences/${general.id}/contacts`, {
          method: "POST",
          body: JSON.stringify({ email, unsubscribed: false }),
        }, RESEND_KEY);
        synced++;
      } catch (_e) {
        // Contact already exists (409) or invalid — skip
      }
    }

    // Create + send broadcast
    const broadcast = await resend(
      "/broadcasts",
      {
        method: "POST",
        body: JSON.stringify({ audience_id: general.id, from: FROM, reply_to: "support@vendibook.com", subject, html, name: `Digest ${new Date().toISOString().split("T")[0]}` }),
      },
      RESEND_KEY,
    );

    await resend(`/broadcasts/${broadcast.id}/send`, { method: "POST", body: JSON.stringify({}) }, RESEND_KEY);

    return new Response(
      JSON.stringify({ success: true, broadcastId: broadcast.id, audienceId: general.id, contactsSynced: synced, audienceSize: emails.length, subject, listingCount: listings.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("digest error:", err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
