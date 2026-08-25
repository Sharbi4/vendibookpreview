// Weekly Vendibook digest — MANUAL SEND ONLY.
//
// There is no automatic send path. Every action requires an authenticated
// admin user JWT; apikey-only callers (stale schedulers, pg_cron, scripts)
// are rejected before any email work happens. Production send additionally
// requires a weekly_digests row in 'approved' status, claimed atomically so
// the same digest can never be sent twice.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { MK, FONT, esc, mkButton, marketingShell } from "../_shared/marketing-templates/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API = "https://api.resend.com";
const FROM = "Vendibook <hello@updates.vendibook.com>";
const REPLY_TO = "support@vendibook.com";
const SITE_URL = "https://vendibook.com";

interface DigestRow {
  id: string;
  week_key: string;
  subject: string;
  preview_text: string;
  article_title: string;
  article_excerpt: string;
  article_image_url: string;
  article_url: string;
  whats_new: { title: string; body: string }[];
  featured_listing_ids: string[];
  status: string;
}

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
}

const CATEGORY_LABEL: Record<string, string> = {
  food_truck: "Food Truck",
  food_trailer: "Food Trailer",
  ghost_kitchen: "Shared Kitchen",
  vendor_space: "Vendor Space",
};

function priceLabel(l: Listing): string {
  if (l.mode === "sale" && l.price_sale) return `$${l.price_sale.toLocaleString()}`;
  if (l.price_daily) return `$${l.price_daily}/day`;
  return "View pricing";
}

function utm(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=email&utm_medium=digest&utm_campaign=weekly_digest`;
}

function absUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ── Email renderer ──────────────────────────────────────────────────────
export function buildDigestHtml(
  digest: DigestRow,
  listings: Listing[],
  unsubscribeUrl: string,
  opts: { test?: boolean } = {},
): string {
  const weekLabel = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const articleBlock = digest.article_title
    ? `
    <tr><td style="padding:8px 24px 0;">
      ${digest.article_image_url ? `<a href="${esc(utm(absUrl(digest.article_url)))}" style="text-decoration:none;"><img src="${esc(digest.article_image_url)}" alt="${esc(digest.article_title)}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border-radius:12px;border:1px solid ${MK.border};" /></a>` : ""}
      <div style="padding:18px 4px 0;">
        <div style="font-family:${FONT};font-size:11px;color:${MK.orangeOnWhite};text-transform:uppercase;font-weight:700;letter-spacing:1.5px;margin-bottom:6px;">Featured article</div>
        <div style="font-family:${FONT};font-size:20px;font-weight:700;color:${MK.text};line-height:1.3;margin-bottom:8px;">${esc(digest.article_title)}</div>
        ${digest.article_excerpt ? `<p style="font-family:${FONT};font-size:14px;color:${MK.textSecondary};line-height:1.6;margin:0 0 16px;">${esc(digest.article_excerpt)}</p>` : ""}
        ${digest.article_url ? mkButton("Read the article", utm(absUrl(digest.article_url))) : ""}
      </div>
    </td></tr>`
    : "";

  const items = Array.isArray(digest.whats_new) ? digest.whats_new.slice(0, 4) : [];
  const whatsNewBlock = items.length
    ? `
    <tr><td style="padding:28px 28px 0;">
      <h2 style="font-family:${FONT};font-size:18px;font-weight:700;color:${MK.text};margin:0 0 12px;">What's new on Vendibook</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${MK.border};border-radius:12px;background:${MK.surfaceMuted};">
        ${items
          .map(
            (it, i) => `
        <tr><td style="padding:14px 18px;${i > 0 ? `border-top:1px solid ${MK.border};` : ""}">
          <div style="font-family:${FONT};font-size:14px;font-weight:700;color:${MK.text};margin-bottom:2px;">${esc(it.title)}</div>
          ${it.body ? `<div style="font-family:${FONT};font-size:13px;color:${MK.textSecondary};line-height:1.55;">${esc(it.body)}</div>` : ""}
        </td></tr>`,
          )
          .join("")}
      </table>
    </td></tr>`
    : "";

  const listingCards = listings
    .slice(0, 3)
    .map((l) => {
      const url = utm(`${SITE_URL}/listing/${l.id}`);
      const img = l.cover_image_url || `${SITE_URL}/placeholder.svg`;
      const loc = [l.city, l.state].filter(Boolean).join(", ") || "USA";
      return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;border:1px solid ${MK.border};border-radius:12px;overflow:hidden;background:${MK.surface};">
        <tr><td style="padding:0;">
          <a href="${url}" style="text-decoration:none;color:inherit;display:block;">
            <img src="${esc(img)}" alt="${esc(l.title)}" width="552" style="display:block;width:100%;max-width:552px;height:200px;object-fit:cover;" />
            <div style="padding:14px 18px;">
              <div style="font-family:${FONT};font-size:11px;color:${MK.textMuted};text-transform:uppercase;font-weight:700;letter-spacing:1px;margin-bottom:4px;">
                ${CATEGORY_LABEL[l.category] || l.category} · ${l.mode === "sale" ? "For Sale" : "For Rent"}
              </div>
              <div style="font-family:${FONT};font-size:16px;font-weight:700;color:${MK.text};margin-bottom:2px;line-height:1.3;">${esc(l.title)}</div>
              <div style="font-family:${FONT};font-size:13px;color:${MK.textSecondary};margin-bottom:6px;">${esc(loc)}</div>
              <div style="font-family:${FONT};font-size:15px;font-weight:700;color:${MK.orangeOnWhite};">${priceLabel(l)}</div>
            </div>
          </a>
        </td></tr>
      </table>`;
    })
    .join("");

  const listingsBlock = listings.length
    ? `
    <tr><td style="padding:28px 24px 0;">
      <h2 style="font-family:${FONT};font-size:18px;font-weight:700;color:${MK.text};margin:0 0 14px;">Featured equipment</h2>
      ${listingCards}
    </td></tr>`
    : "";

  const bodyRows = `
    ${opts.test ? `<tr><td style="padding:12px 28px 0;text-align:center;"><div style="display:inline-block;font-family:${FONT};font-size:12px;font-weight:700;color:#8a4b00;background:#fff3e0;border:1px solid #f2c078;border-radius:999px;padding:6px 14px;">TEST SEND — not the live digest</div></td></tr>` : ""}
    <tr><td style="padding:16px 28px 20px;text-align:center;">
      <div style="font-family:${FONT};font-size:11px;color:${MK.textMuted};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Vendibook · ${esc(weekLabel)}</div>
      <h1 style="font-family:${FONT};font-size:26px;font-weight:700;color:${MK.text};margin:0 0 8px;">This week on Vendibook</h1>
      ${digest.preview_text ? `<p style="font-family:${FONT};font-size:15px;color:${MK.textSecondary};margin:0;line-height:1.6;">${esc(digest.preview_text)}</p>` : ""}
    </td></tr>
    ${articleBlock}
    ${whatsNewBlock}
    ${listingsBlock}
    <tr><td style="padding:28px 28px 36px;text-align:center;">
      ${mkButton("Browse food trucks & trailers", utm(`${SITE_URL}/browse`))}
    </td></tr>`;

  return marketingShell({
    title: digest.subject || "This week on Vendibook",
    preheader: digest.preview_text || "The latest from the Vendibook marketplace.",
    bodyRows,
    unsubscribeUrl,
    baseUrl: SITE_URL,
    footerNote: "You're receiving this because you have a Vendibook account or joined our list.",
  });
}

// ── Resend helper ───────────────────────────────────────────────────────
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ── Audience (existing subscriber logic, unchanged) ─────────────────────
async function getAudienceEmails(supabase: any): Promise<string[]> {
  const { data: subs } = await supabase.from("newsletter_subscribers").select("email").is("unsubscribed_at", null);
  const { data: suppressed } = await supabase.from("suppressed_emails").select("email");
  const { data: unsubbed } = await supabase.from("email_unsubscribes").select("email");
  const blocked = new Set([
    ...(suppressed ?? []).map((r: any) => String(r.email).toLowerCase()),
    ...(unsubbed ?? []).map((r: any) => String(r.email).toLowerCase()),
  ]);
  return Array.from(
    new Set(
      (subs ?? [])
        .map((r: any) => String(r.email).toLowerCase())
        .filter((e: string) => e && !blocked.has(e) && !e.endsWith("example.com") && !e.endsWith(".test")),
    ),
  );
}

async function loadListings(supabase: any, ids: string[]): Promise<Listing[]> {
  if (!ids?.length) return [];
  const { data } = await supabase
    .from("listings")
    .select("id,title,cover_image_url,category,city,state,price_daily,price_sale,mode")
    .in("id", ids.slice(0, 3))
    .eq("status", "published")
    .is("deleted_at", null);
  const rows = (data || []) as Listing[];
  // Preserve admin-chosen order
  return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as Listing[];
}

// ── Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // HARD GATE: a live admin user JWT is required for every action. Stale
    // schedulers and apikey-only calls (pg_cron used an apikey header, not a
    // user token) die here before any email work happens.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ success: false, error: "Authentication required. Digests are manual-send only." }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ success: false, error: "Authentication required. Digests are manual-send only." }, 401);

    const { data: isAdmin } = await supabase.rpc("is_admin", { user_id: user.id });
    if (!isAdmin) return json({ success: false, error: "Admin access required." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    // Legacy callers (dryRun / gap / confirmBroadcast) are retired.
    if (!["audience", "render", "test", "send"].includes(action)) {
      return json({ success: false, error: "Unknown action. Weekly digests are manual-send only — there is no automated path." }, 400);
    }

    // -- audience count ---------------------------------------------------
    if (action === "audience") {
      const emails = await getAudienceEmails(supabase);
      return json({ success: true, count: emails.length });
    }

    // Everything below operates on one digest row.
    const digestId = String(body?.digestId || "");
    if (!digestId) return json({ success: false, error: "digestId is required." }, 400);
    const { data: digest, error: dErr } = await supabase.from("weekly_digests").select("*").eq("id", digestId).maybeSingle();
    if (dErr || !digest) return json({ success: false, error: "Digest not found." }, 404);
    const d = digest as DigestRow;

    if (action === "render" || action === "test") {
      if (d.status === "sent") return json({ success: false, error: "This digest was already sent and cannot be re-rendered for sending." }, 409);
      const listings = await loadListings(supabase, d.featured_listing_ids);

      if (action === "render") {
        const html = buildDigestHtml(d, listings, `${SITE_URL}/unsubscribe`);
        return json({ success: true, subject: d.subject, html, listingCount: listings.length });
      }

      // -- test send: single recipient, never marks the digest as sent ------
      const testEmail = String(body?.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) return json({ success: false, error: "Enter a valid test email address." }, 400);
      const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_KEY) throw new Error("RESEND_API_KEY not configured");

      const unsubUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(testEmail)}`;
      const html = buildDigestHtml(d, listings, unsubUrl, { test: true });
      const res = await resend("/emails", {
        method: "POST",
        body: JSON.stringify({
          from: FROM,
          to: [testEmail],
          reply_to: REPLY_TO,
          subject: `[TEST] ${d.subject || "Weekly digest"}`,
          html,
          headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        }),
      }, RESEND_KEY);
      await supabase.from("blog_campaign_sends").insert({
        campaign_id: `digest-test-${d.week_key}`,
        user_id: user.id,
        email: testEmail,
        status: "sent",
        resend_message_id: res?.id ?? null,
        is_test: true,
      });
      return json({ success: true, sentTo: testEmail });
    }

    // -- production send ----------------------------------------------------
    // Requires Approved state. The status flip is atomic: only the first
    // caller can move approved -> sent, so the same digest cannot double-send.
    const { data: claimed } = await supabase
      .from("weekly_digests")
      .update({ status: "sent", sent_at: new Date().toISOString(), sent_by: user.id })
      .eq("id", digestId)
      .eq("status", "approved")
      .select("id")
      .maybeSingle();

    if (!claimed) {
      return json({
        success: false,
        error: d.status === "sent"
          ? "This digest was already sent."
          : "Digest must be Approved before sending. Open the digest, review it, and click Approve first.",
      }, 409);
    }

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) throw new Error("RESEND_API_KEY not configured");

    const listings = await loadListings(supabase, d.featured_listing_ids);
    const html = buildDigestHtml(d, listings, "{{{RESEND_UNSUBSCRIBE_URL}}}");

    // Sync opted-in subscribers into the Resend audience (existing logic).
    const audiences = await resend("/audiences", { method: "GET" }, RESEND_KEY);
    const general = audiences?.data?.find((a: any) => a.name?.toLowerCase() === "general") || audiences?.data?.[0];
    if (!general?.id) throw new Error("No Resend audience found.");

    const emails = await getAudienceEmails(supabase);
    for (const email of emails) {
      try {
        await resend(`/audiences/${general.id}/contacts`, { method: "POST", body: JSON.stringify({ email, unsubscribed: false }) }, RESEND_KEY);
      } catch (_e) { /* contact exists or invalid — skip */ }
    }

    const broadcast = await resend("/broadcasts", {
      method: "POST",
      body: JSON.stringify({
        audience_id: general.id,
        from: FROM,
        reply_to: REPLY_TO,
        subject: d.subject || "This week on Vendibook",
        html,
        name: `Weekly Digest ${d.week_key}`,
      }),
    }, RESEND_KEY);
    await resend(`/broadcasts/${broadcast.id}/send`, { method: "POST", body: JSON.stringify({}) }, RESEND_KEY);

    await supabase
      .from("weekly_digests")
      .update({ broadcast_id: broadcast.id, recipient_count: emails.length })
      .eq("id", digestId);

    return json({ success: true, broadcastId: broadcast.id, recipientCount: emails.length, weekKey: d.week_key });
  } catch (err) {
    console.error("weekly digest error:", err);
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
