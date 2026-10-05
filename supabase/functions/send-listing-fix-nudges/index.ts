// Seller nudge: "N real buyers viewed your listing but nobody reached out —
// here are the 2-3 changes that would fix it." Sent through Resend.
//
// Admin-gated. Modes: preview_count | preview_html | test | broadcast.
// Broadcast requires body.confirm === LISTING_FIX_CAMPAIGN_ID so previews and
// test sends can never mail sellers by accident.
//
// Audience (computed live, never hardcoded): publicly live listings with
// MIN_REAL_VIEWS+ real buyer view sessions in the last 30 days (bots, known
// scrapers and the seller's own views excluded via realListingViews), zero
// buyer contacts in the same window (conversations, offers, booking requests,
// listing leads), and at least one concrete fix from pickListingFixes. One
// email per seller (their most-viewed qualifying listing), skipping
// unsubscribed/suppressed addresses and anyone already sent this campaign.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { isMailableAddress } from "../_shared/marketingAudience.ts";
import { isInternalCaller } from "../_shared/internalAuth.ts";
import { isRealListingView } from "../_shared/realListingViews.ts";
import { pickListingFixes, type FixableListing, type ListingFix } from "../_shared/listingFixes.ts";
import { MARKETING_FROM, MARKETING_REPLY_TO } from "../_shared/marketing-templates/brand.ts";
import {
  LISTING_FIX_CAMPAIGN_ID,
  buildListingFixNudgeHtml,
  buildListingFixNudgeText,
  listingFixSubject,
  type ListingFixNudgeData,
} from "../_shared/marketing-templates/listing-fix-nudge.ts";
import { unsubToken } from "../_shared/unsubscribeToken.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CAMPAIGN_ID = LISTING_FIX_CAMPAIGN_ID;
const MIN_REAL_VIEWS = 10;
const MAX_FIXES = 3;
const TEST_TITLE_PREFIXES = ["Demo%", "QA %", "QA_%", "QA-%", "Test %", "E2E %", "Smoke %", "Sandbox %"];
const LISTING_COLUMNS =
  "id, host_id, title, mode, category, description, image_urls, condition, title_status, operational_status, year_built, make, mileage, accepts_offers, price_monthly";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ListingRow = FixableListing & { id: string; host_id: string | null };
type ViewRow = { listing_id: string; session_id: string | null; viewer_id: string | null; user_agent: string | null };
type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function pageAll<T>(build: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const out: T[] = [];
  const PAGE = 1000;
  for (let from = 0; from < 200000; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // ---- auth: service-role/internal caller, or an admin end-user JWT ----
    let callerId: string | null = null;
    if (!isInternalCaller(req)) {
      const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
      if (!token) return json({ error: "Unauthorized" }, 401);
      const { data: userRes } = await admin.auth.getUser(token);
      callerId = userRes?.user?.id ?? null;
      if (!callerId) {
        const fallback = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: alt } = await fallback.auth.getUser();
        callerId = alt?.user?.id ?? null;
      }
      if (!callerId) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const mode: "preview_count" | "preview_html" | "test" | "broadcast" = body.mode ?? "preview_count";
    const unsubFor = (email: string) =>
      `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // ---- live listings ----
    const listings = await pageAll<ListingRow>((from, to) => {
      let q = admin
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "published")
        .eq("moderation_status", "clear")
        .is("deleted_at", null)
        .not("published_at", "is", null)
        .range(from, to);
      for (const p of TEST_TITLE_PREFIXES) q = q.not("title", "ilike", p);
      return q as unknown as PageResult<ListingRow>;
    });
    const byId = new Map(listings.map((l) => [l.id, l]));

    // ---- real buyer view sessions per listing (30d) ----
    const views = await pageAll<ViewRow>((from, to) =>
      admin
        .from("listing_views")
        .select("listing_id, session_id, viewer_id, user_agent")
        .gte("viewed_at", since)
        .range(from, to) as unknown as PageResult<ViewRow>);
    const sessions = new Map<string, Set<string>>();
    for (const v of views) {
      const l = byId.get(v.listing_id);
      if (!l?.host_id || !v.session_id || !isRealListingView(v, l.host_id)) continue;
      const set = sessions.get(v.listing_id) ?? new Set<string>();
      set.add(v.session_id);
      sessions.set(v.listing_id, set);
    }

    // ---- buyer contacts (30d) ----
    const contacted = new Set<string>();
    for (const table of ["conversations", "offers", "booking_requests", "listing_leads"]) {
      const rows = await pageAll<{ listing_id: string | null }>((from, to) =>
        admin.from(table).select("listing_id").gte("created_at", since).range(from, to) as unknown as PageResult<{ listing_id: string | null }>);
      for (const r of rows) if (r.listing_id) contacted.add(r.listing_id);
    }

    // ---- candidates: one per seller, most-viewed qualifying listing ----
    type Candidate = { listing: ListingRow; views: number; fixes: ListingFix[] };
    const bySeller = new Map<string, Candidate>();
    for (const [listingId, set] of sessions) {
      if (set.size < MIN_REAL_VIEWS || contacted.has(listingId)) continue;
      const listing = byId.get(listingId);
      if (!listing?.host_id) continue;
      const fixes = pickListingFixes(listing).slice(0, MAX_FIXES);
      if (!fixes.length) continue;
      const prev = bySeller.get(listing.host_id);
      if (!prev || set.size > prev.views) bySeller.set(listing.host_id, { listing, views: set.size, fixes });
    }

    const hostIds = Array.from(bySeller.keys());
    type ProfileRow = { id: string; email: string | null; first_name: string | null };
    const profiles: ProfileRow[] = [];
    for (let i = 0; i < hostIds.length; i += 200) {
      const { data, error } = await admin
        .from("profiles")
        .select("id, email, first_name")
        .in("id", hostIds.slice(i, i + 200));
      if (error) return json({ error: `Profile query failed: ${error.message}` }, 500);
      profiles.push(...((data ?? []) as ProfileRow[]));
    }

    const [{ data: unsubs }, { data: suppressed }, { data: alreadySent }] = await Promise.all([
      admin.from("email_unsubscribes").select("email"),
      admin.from("suppressed_emails").select("email"),
      admin.from("blog_campaign_sends").select("email, user_id")
        .eq("campaign_id", CAMPAIGN_ID).eq("is_test", false).eq("status", "sent"),
    ]);
    const blocked = new Set<string>();
    for (const r of [...(unsubs ?? []), ...(suppressed ?? [])]) {
      if (r?.email) blocked.add(String(r.email).toLowerCase());
    }
    const sendRows = (alreadySent ?? []) as { email: string | null; user_id: string | null }[];
    const sentEmails = new Set(sendRows.map((r) => String(r.email ?? "").toLowerCase()));
    const sentUsers = new Set(sendRows.map((r) => r.user_id).filter(Boolean));

    type Recipient = { email: string; user_id: string; data: ListingFixNudgeData };
    const recipients: Recipient[] = [];
    let skipped = 0;
    for (const p of profiles) {
      const email = String(p?.email ?? "").trim().toLowerCase();
      if (!isMailableAddress(email) || blocked.has(email) || sentEmails.has(email) || sentUsers.has(p.id)) {
        skipped++;
        continue;
      }
      const c = bySeller.get(p.id)!;
      recipients.push({
        email,
        user_id: p.id,
        data: {
          firstName: p.first_name ?? null,
          listingId: c.listing.id,
          listingTitle: String(c.listing.title ?? "your listing").trim(),
          views: c.views,
          fixes: c.fixes,
          unsubscribeUrl: unsubFor(email),
        },
      });
    }
    recipients.sort((a, b) => b.data.views - a.data.views);

    if (mode === "preview_count") {
      return json({
        campaignId: CAMPAIGN_ID,
        eligibleRecipients: recipients.length,
        skipped,
        sample: recipients.slice(0, 20).map((r) => ({
          listing_id: r.data.listingId,
          title: r.data.listingTitle,
          views: r.data.views,
          fixes: r.data.fixes.map((f) => f.key),
        })),
      });
    }
    if (mode === "preview_html") {
      const sample = recipients[0]?.data;
      if (!sample) return json({ error: "No eligible recipients" }, 404);
      return json({ subject: listingFixSubject(sample), html: buildListingFixNudgeHtml(sample) });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY not configured" }, 500);
    const resend = new Resend(resendKey);

    const isTest = mode === "test";
    let queue: Recipient[] = recipients;
    if (isTest) {
      const testEmail = String(body.testEmail ?? "").trim().toLowerCase();
      if (!isMailableAddress(testEmail)) return json({ error: "Valid testEmail required" }, 400);
      const sample = recipients[0];
      if (!sample) return json({ error: "No eligible recipients to sample" }, 404);
      queue = [{
        email: testEmail,
        user_id: callerId ?? "00000000-0000-0000-0000-000000000000",
        data: { ...sample.data, unsubscribeUrl: unsubFor(testEmail) },
      }];
    } else if (body.confirm !== CAMPAIGN_ID) {
      return json({ error: "Broadcast requires explicit approval confirmation." }, 400);
    }

    let sent = 0, failed = 0;
    const failures: Array<{ email: string; error: string }> = [];
    for (const r of queue) {
      const subject = listingFixSubject(r.data);
      try {
        const { data, error } = await resend.emails.send({
          from: MARKETING_FROM,
          to: [r.email],
          subject: isTest ? `[TEST] ${subject}` : subject,
          html: buildListingFixNudgeHtml(r.data),
          text: buildListingFixNudgeText(r.data),
          reply_to: MARKETING_REPLY_TO,
          headers: {
            "List-Unsubscribe": `<${r.data.unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "type", value: "marketing" },
            { name: "campaign", value: "listing_fix_nudge_2026_10" },
          ],
        });
        if (error) throw new Error(error.message);
        sent++;
        await admin.from("blog_campaign_sends").insert({
          campaign_id: CAMPAIGN_ID, user_id: r.user_id, email: r.email,
          status: "sent", resend_message_id: data?.id ?? null, is_test: isTest,
        });
      } catch (e) {
        failed++;
        const message = (e as Error).message;
        failures.push({ email: r.email, error: message });
        await admin.from("blog_campaign_sends").insert({
          campaign_id: CAMPAIGN_ID, user_id: r.user_id, email: r.email,
          status: "failed", error_message: message, is_test: isTest,
        });
      }
      await sleep(550);
    }

    return json({ ok: true, mode, campaignId: CAMPAIGN_ID, attempted: queue.length, sent, failed, failures: failures.slice(0, 20) });
  } catch (e) {
    console.error("send-listing-fix-nudges error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
