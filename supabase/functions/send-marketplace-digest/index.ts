// Auto-generated marketplace digest broadcast.
// Pulls latest published listings + city activity, renders branded HTML,
// then creates and sends a Resend Broadcast to the workspace's General audience.
// Triggered by pg_cron every 2 days OR manually by an admin via the dashboard.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API = "https://api.resend.com";
const FROM = "Vendibook <hello@updates.vendibook.com>";
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

function buildHtml(listings: Listing[], cityCounts: { city: string; count: number }[]): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const cards = listings
    .slice(0, 6)
    .map((l) => {
      const url = `${SITE_URL}/listing/${l.id}?utm_source=resend&utm_medium=email&utm_campaign=digest`;
      const img = l.cover_image_url || `${SITE_URL}/placeholder.svg`;
      const loc = [l.city, l.state].filter(Boolean).join(", ") || "USA";
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;">
          <tr>
            <td style="padding:0;">
              <a href="${url}" style="text-decoration:none;color:inherit;display:block;">
                <img src="${escapeHtml(img)}" alt="${escapeHtml(l.title)}" width="600" style="display:block;width:100%;max-width:600px;height:220px;object-fit:cover;" />
                <div style="padding:16px 20px;">
                  <div style="font-size:11px;color:#10b981;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-bottom:6px;">
                    ${CATEGORY_LABEL[l.category] || l.category} · ${l.mode === "sale" ? "For Sale" : "For Rent"}
                  </div>
                  <div style="font-size:18px;font-weight:600;color:#0f172a;margin-bottom:4px;line-height:1.3;">${escapeHtml(l.title)}</div>
                  <div style="font-size:14px;color:#64748b;margin-bottom:8px;">${escapeHtml(loc)}</div>
                  <div style="font-size:16px;font-weight:700;color:#0f172a;">${priceLabel(l)}</div>
                </div>
              </a>
            </td>
          </tr>
        </table>`;
    })
    .join("");

  const cityRows = cityCounts
    .slice(0, 5)
    .map(
      (c) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;">${escapeHtml(c.city)}</td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;text-align:right;">${c.count} new</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>What's new on Vendibook</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 16px;text-align:center;border-bottom:1px solid #f1f5f9;">
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Vendibook · ${date}</div>
          <h1 style="font-size:28px;font-weight:700;color:#0f172a;margin:0 0 8px;">What's new this week 🚚</h1>
          <p style="font-size:15px;color:#64748b;margin:0;">Fresh food trucks, trailers & vendor spaces near you.</p>
        </td></tr>
        <tr><td style="padding:24px 24px 8px;">
          <h2 style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 16px;">Just listed</h2>
          ${cards || '<p style="color:#64748b;font-size:14px;">No new listings this cycle — check back soon.</p>'}
        </td></tr>
        ${cityRows ? `<tr><td style="padding:8px 32px 24px;">
          <h2 style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 12px;">Trending cities</h2>
          <table width="100%" cellpadding="0" cellspacing="0">${cityRows}</table>
        </td></tr>` : ""}
        <tr><td style="padding:24px 32px 32px;text-align:center;background:#0f172a;">
          <a href="${SITE_URL}/search?utm_source=resend&utm_medium=email&utm_campaign=digest" style="display:inline-block;background:#10b981;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Browse all listings →</a>
          <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;">Vendibook · The marketplace for mobile food businesses</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
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

    // Resolve General audience (first one in the account)
    const audiences = await resend("/audiences", { method: "GET" }, RESEND_KEY);
    const general = audiences?.data?.find((a: any) => a.name?.toLowerCase() === "general") || audiences?.data?.[0];
    if (!general?.id) throw new Error("No Resend audience found. Create one in Resend dashboard.");

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
      JSON.stringify({ success: true, broadcastId: broadcast.id, audienceId: general.id, subject, listingCount: listings.length }),
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
