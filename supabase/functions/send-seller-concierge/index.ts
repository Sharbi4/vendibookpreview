// Seller concierge email from Brad (Customer Success). Sent through Resend
// on the marketing shell, same pattern as send-listing-fix-nudges.
//
// Admin-gated. Modes: preview_count | preview_html | test | broadcast.
// Broadcast requires body.confirm === SELLER_CONCIERGE_CAMPAIGN_ID and sends
// at most body.limit emails per call (default 20) so it can run hourly.
//
// Audience (computed live): one email per seller with a publicly live
// listing. Variant per seller:
//   featured — a listing on a complimentary feature (featured_source='comp')
//   optimize — the listing with the most fixes from pickListingFixes
//   share    — no fixes left on any listing
//   welcome  — listing published in the last WELCOME_DAYS days: welcome plus
//              up to 3 asks (8+ photos, build year, what's included, …)
// body.onlyUserIds restricts the run to those hosts (e.g. one new seller).
// Order: integrity fixes → verified missed offers → featured → other coaching.
// Contact details are stripped automatically on save (a00_strip_contact_details),
// so there is no "remove your phone/email" ask.
// Integrity routing (never coach or promote a listing that fails checks):
//   placeholder/broken title      → fix_title (only that ask)
//   sale price under $1,000       → skipped pending review
// Missed-offer rescue sellers get the rescue variant instead of coaching.
// Skips unsubscribed/suppressed/unmailable addresses, internal accounts,
// admins, held or suspended accounts, body.excludeUserIds, anyone already
// sent this campaign, anyone who got the listing-fix nudge in the last 14
// days, and anyone sent the complimentary-featured-boost email in 7 days.
// Every send carries Idempotency-Key `${CAMPAIGN_ID}:${user_id}`.

import { readAllRows as pageAll } from "../_shared/readAllRows.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { isMailableAddress } from "../_shared/marketingAudience.ts";
import { isInternalCaller } from "../_shared/internalAuth.ts";
import { pickListingFixes, type FixableListing, type ListingFix } from "../_shared/listingFixes.ts";
import { MARKETING_FROM, MARKETING_REPLY_TO } from "../_shared/marketing-templates/brand.ts";
import { LISTING_FIX_CAMPAIGN_ID } from "../_shared/marketing-templates/listing-fix-nudge.ts";
import {
  SELLER_CONCIERGE_CAMPAIGN_ID,
  buildSellerConciergeHtml,
  buildSellerConciergeText,
  sellerConciergeSubject,
  type ConciergeVariant,
  type RescueDetails,
  type SellerConciergeData,
} from "../_shared/marketing-templates/seller-concierge.ts";
import { unsubToken } from "../_shared/unsubscribeToken.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CAMPAIGN_ID = SELLER_CONCIERGE_CAMPAIGN_ID;
const MAX_FIXES = 3;
const DEFAULT_LIMIT = 20;
const NUDGE_COOLDOWN_DAYS = 14;
const BOOST_EMAIL_COOLDOWN_DAYS = 7;
const MIN_SALE_PRICE = 1000;
const BROKEN_TITLE = /^\s*(that.?s (good|perfect)|use this instead|my food (trailer|truck)|my ghost kitchen|untitled)\b/i;

// Missed offers that expired with no seller response (see
// docs/growth/supply-desk/outreach/offer-rescue-2026-10-05.md).
const RESCUE_LISTINGS: Record<string, string> = {
  "20434a7d-a365-4d4a-ab9b-5cff26815f33": "c649440f-d3df-4f3a-a622-e118767efb4d",
  "33fb896d-2c60-42e7-b3eb-20d2e44ee08e": "efa664df-1f34-421f-90f8-2ebc88e471fd",
};
const TEST_TITLE_PREFIXES = ["Demo%", "QA %", "QA_%", "QA-%", "Test %", "E2E %", "Smoke %", "Sandbox %"];
const INTERNAL_EMAIL = /@(example\.com|vendibook\.com)$/i;
const LISTING_COLUMNS =
  "id, host_id, title, mode, category, description, image_urls, condition, title_status, operational_status, year_built, make, mileage, accepts_offers, price_monthly, price_sale, featured_enabled, featured_source, featured_expires_at, published_at, included_items";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ListingRow = FixableListing & {
  id: string;
  host_id: string | null;
  title: string | null;
  description: string | null;
  published_at: string | null;
  included_items: string | null;
  price_sale: number | null;
  featured_enabled: boolean | null;
  featured_source: string | null;
  featured_expires_at: string | null;
};
type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

const VARIANT_RANK: Record<ConciergeVariant, number> = {
  fix_title: 0, rescue: 1, welcome: 2, featured: 3, optimize: 4, share: 5,
};
const WELCOME_DAYS = 7;

/** Welcome asks: the shared fixes plus year and inclusions, photos first. */
function welcomeFixes(l: ListingRow): ListingFix[] {
  const out = pickListingFixes(l);
  if (!l.year_built && !out.some((f) => f.key === "truck_basics")) {
    out.push({ key: "year", text: "Add the build year. Buyers compare and filter on it." } as ListingFix);
  }
  if (!String(l.included_items ?? "").trim()) {
    out.push({ key: "included", text: "List what's included in the price (equipment, generator, permits, wraps)." } as ListingFix);
  }
  const order = ["photos", "year", "truck_basics", "included", "trust_fields", "description", "offers"];
  return out.sort((a, b) => (order.indexOf(a.key) + 99) % 99 - (order.indexOf(b.key) + 99) % 99).slice(0, MAX_FIXES);
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
    const limit = Math.max(1, Math.min(Number(body.limit) || DEFAULT_LIMIT, 100));
    const excludeUserIds = new Set<string>(Array.isArray(body.excludeUserIds) ? body.excludeUserIds.map(String) : []);
    const onlyUserIds = Array.isArray(body.onlyUserIds) && body.onlyUserIds.length
      ? new Set<string>(body.onlyUserIds.map(String)) : null;
    const unsubFor = (email: string) =>
      `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`;
    const now = Date.now();

    // ---- live listings ----
    const listings = await pageAll<ListingRow>((from, to) => {
      let q = admin
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "published")
        .eq("moderation_status", "clear")
        .is("deleted_at", null)
        .not("published_at", "is", null)
        .order("id").range(from, to);
      for (const p of TEST_TITLE_PREFIXES) q = q.not("title", "ilike", p);
      return q as unknown as PageResult<ListingRow>;
    });

    // Historical targets are an allowlist, not evidence of current offer state.
    type Offer = { id: string; listing_id: string; seller_id: string; buyer_id: string;
      offer_amount: number; created_at: string; expires_at: string | null;
      responded_at: string | null; status: string };
    const offers = await pageAll<Offer>((from, to) => admin.from("offers")
      .select("id, listing_id, seller_id, buyer_id, offer_amount, created_at, expires_at, responded_at, status")
      .in("listing_id", Object.values(RESCUE_LISTINGS))
      .order("created_at", { ascending: false }).order("id").range(from, to));
    const latestOffer = new Map<string, Offer>();
    for (const offer of offers) if (!latestOffer.has(offer.listing_id)) latestOffer.set(offer.listing_id, offer);
    const rescues = new Map<string, RescueDetails>();
    for (const l of listings) {
      const offer = latestOffer.get(l.id);
      if (!offer || !l.host_id || RESCUE_LISTINGS[l.host_id] !== l.id || l.mode !== "sale" ||
          offer.seller_id !== l.host_id || offer.buyer_id === l.host_id || offer.responded_at ||
          offer.status !== "expired" || !offer.expires_at || !Number.isFinite(Date.parse(offer.expires_at)) ||
          Date.parse(offer.expires_at) > now || !Number.isFinite(Date.parse(offer.created_at)) ||
          !(offer.offer_amount > 0)) continue;
      rescues.set(l.id, {
        offerAmount: offer.offer_amount, askingPrice: Number(l.price_sale),
        offerDateLabel: new Date(offer.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
        stale: now - Date.parse(offer.created_at) > 60 * 24 * 60 * 60 * 1000,
      });
    }

    // ---- one candidate per seller ----
    type Candidate = { listing: ListingRow; variant: ConciergeVariant; fixes: ReturnType<typeof pickListingFixes>; offersOff: boolean };
    const bySeller = new Map<string, Candidate>();
    const isCompFeatured = (l: ListingRow) =>
      !!l.featured_enabled && l.featured_source === "comp" &&
      !!l.featured_expires_at && new Date(l.featured_expires_at).getTime() > now;
    for (const l of listings) {
      if (!l.host_id) continue;
      if (onlyUserIds && !onlyUserIds.has(l.host_id)) continue;
      if (l.mode === "sale" && Number(l.price_sale ?? 0) < MIN_SALE_PRICE) continue; // price/category under review
      const brokenTitle = BROKEN_TITLE.test(String(l.title ?? "")) || String(l.title ?? "").trim().length < 8;
      const isNew = !!l.published_at && now - Date.parse(l.published_at) <= WELCOME_DAYS * 24 * 60 * 60 * 1000;
      const fixes = isNew ? welcomeFixes(l) : pickListingFixes(l).slice(0, MAX_FIXES);
      const variant: ConciergeVariant =
        brokenTitle ? "fix_title"
        : rescues.has(l.id) ? "rescue"
        : isNew ? "welcome"
        : isCompFeatured(l) ? "featured"
        : fixes.length ? "optimize" : "share";
      const onlyAsk = variant === "rescue" || variant === "fix_title";
      const cand: Candidate = {
        listing: l, variant, fixes: onlyAsk ? [] : fixes,
        offersOff: fixes.some((f) => f.key === "offers"),
      };
      const prev = bySeller.get(l.host_id);
      const better = !prev ||
        VARIANT_RANK[variant] < VARIANT_RANK[prev.variant] ||
        (variant === prev.variant && fixes.length > prev.fixes.length);
      if (better) bySeller.set(l.host_id, cand);
    }

    const hostIds = Array.from(bySeller.keys());
    type ProfileRow = { id: string; email: string | null; first_name: string | null; full_name: string | null; avatar_url: string | null; account_suspended: boolean | null };
    const profiles: ProfileRow[] = [];
    for (let i = 0; i < hostIds.length; i += 200) {
      profiles.push(...await pageAll<ProfileRow>((from, to) => admin
        .from("profiles")
        .select("id, email, first_name, full_name, avatar_url, account_suspended")
        .in("id", hostIds.slice(i, i + 200)).order("id").range(from, to)));
    }

    const nudgeSince = new Date(now - NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const boostSince = new Date(now - BOOST_EMAIL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const [unsubs, suppressed, alreadySent, recentNudges, admins, holds, boostEmails] = await Promise.all([
      pageAll((from, to) => admin.from("email_unsubscribes").select("email").order("id").range(from, to)),
      pageAll((from, to) => admin.from("suppressed_emails").select("email").order("id").range(from, to)),
      pageAll((from, to) => admin.from("blog_campaign_sends").select("email, user_id")
        .eq("campaign_id", CAMPAIGN_ID).eq("is_test", false).eq("status", "sent").order("id").range(from, to)),
      pageAll((from, to) => admin.from("blog_campaign_sends").select("email, user_id")
        .eq("campaign_id", LISTING_FIX_CAMPAIGN_ID).eq("is_test", false).eq("status", "sent")
        .gte("created_at", nudgeSince).order("id").range(from, to)),
      pageAll((from, to) => admin.from("user_roles").select("user_id").eq("role", "admin").order("id").range(from, to)),
      pageAll((from, to) => admin.from("message_sending_holds").select("user_id").order("user_id").range(from, to)),
      pageAll((from, to) => admin.from("email_send_log").select("recipient_email")
        .eq("template_name", "complimentary-featured-boost").gte("created_at", boostSince).order("id").range(from, to)),
    ]);
    const blocked = new Set<string>();
    for (const r of [...(unsubs ?? []), ...(suppressed ?? [])]) {
      if (r?.email) blocked.add(String(r.email).toLowerCase());
    }
    const priorRows = [...(alreadySent ?? []), ...(recentNudges ?? [])] as { email: string | null; user_id: string | null }[];
    const priorEmails = new Set(priorRows.map((r) => String(r.email ?? "").toLowerCase()));
    const priorUsers = new Set(priorRows.map((r) => r.user_id).filter(Boolean));
    const adminIds = new Set(((admins ?? []) as { user_id: string }[]).map((r) => r.user_id));
    const heldIds = new Set(((holds ?? []) as { user_id: string }[]).map((r) => r.user_id));
    const boostEmailed = new Set(((boostEmails ?? []) as { recipient_email: string | null }[])
      .map((r) => String(r.recipient_email ?? "").toLowerCase()));

    const firstNameOf = (p: ProfileRow): string | null => {
      const raw = (p.first_name ?? "").trim() || (p.full_name ?? "").trim().split(/\s+/)[0] || "";
      if (!/^[A-Za-z][A-Za-z'\-]{1,}$/.test(raw)) return null;
      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    };
    const featuredUntil = (iso: string | null) =>
      iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }) : null;

    type Recipient = { email: string; user_id: string; offersOff: boolean; data: SellerConciergeData };
    const recipients: Recipient[] = [];
    let skipped = 0;
    for (const p of profiles) {
      const email = String(p?.email ?? "").trim().toLowerCase();
      if (
        !isMailableAddress(email) || INTERNAL_EMAIL.test(email) || blocked.has(email) ||
        priorEmails.has(email) || priorUsers.has(p.id) || adminIds.has(p.id) || excludeUserIds.has(p.id) ||
        heldIds.has(p.id) || p.account_suspended === true || boostEmailed.has(email)
      ) {
        skipped++;
        continue;
      }
      const c = bySeller.get(p.id)!;
      recipients.push({
        email,
        user_id: p.id,
        offersOff: c.offersOff,
        data: {
          firstName: firstNameOf(p),
          listingId: c.listing.id,
          listingTitle: String(c.listing.title ?? "your listing").trim(),
          variant: c.variant,
          fixes: c.fixes,
          featuredUntil: c.variant === "featured" ? featuredUntil(c.listing.featured_expires_at) : null,
          needsProfilePhoto: !p.avatar_url,
          rescue: c.variant === "rescue" ? rescues.get(c.listing.id) : null,
          unsubscribeUrl: unsubFor(email),
        },
      });
    }
    recipients.sort((a, b) =>
      VARIANT_RANK[a.data.variant] - VARIANT_RANK[b.data.variant] ||
      Number(b.offersOff) - Number(a.offersOff));

    if (mode === "preview_count") {
      const byVariant: Record<string, number> = {};
      for (const r of recipients) byVariant[r.data.variant] = (byVariant[r.data.variant] ?? 0) + 1;
      return json({
        campaignId: CAMPAIGN_ID,
        eligibleRecipients: recipients.length,
        byVariant,
        offersOff: recipients.filter((r) => r.offersOff).length,
        skipped,
        nextBatch: recipients.slice(0, limit).map((r) => ({
          listing_id: r.data.listingId, title: r.data.listingTitle, variant: r.data.variant,
          fixes: r.data.fixes.map((f) => f.key),
        })),
      });
    }
    if (mode === "preview_html") {
      const want = body.variant as ConciergeVariant | undefined;
      const sample = (want ? recipients.find((r) => r.data.variant === want) : recipients[0])?.data;
      if (!sample) return json({ error: "No eligible recipients" }, 404);
      return json({ subject: sellerConciergeSubject(sample), html: buildSellerConciergeHtml(sample) });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY not configured" }, 500);
    // Direct API call: the esm resend@2 SDK cannot set Idempotency-Key, and a
    // retry or an overlapping hourly run must never mail a seller twice.
    const sendEmail = async (payload: Record<string, unknown>, idempotencyKey: string) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out?.message || `Resend HTTP ${res.status}`);
      return out as { id?: string };
    };

    const isTest = mode === "test";
    let queue: Recipient[] = recipients.slice(0, limit);
    if (isTest) {
      const testEmail = String(body.testEmail ?? "").trim().toLowerCase();
      if (!isMailableAddress(testEmail)) return json({ error: "Valid testEmail required" }, 400);
      const want = body.variant as ConciergeVariant | undefined;
      const sample = want ? recipients.find((r) => r.data.variant === want) : recipients[0];
      if (!sample) return json({ error: "No eligible recipients to sample" }, 404);
      queue = [{
        ...sample,
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
      const subject = sellerConciergeSubject(r.data);
      try {
        const data = await sendEmail({
          from: MARKETING_FROM,
          to: [r.email],
          subject: isTest ? `[TEST] ${subject}` : subject,
          html: buildSellerConciergeHtml(r.data),
          text: buildSellerConciergeText(r.data),
          reply_to: MARKETING_REPLY_TO,
          headers: {
            "List-Unsubscribe": `<${r.data.unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "type", value: "marketing" },
            { name: "campaign", value: "seller_concierge_2026_10" },
            { name: "variant", value: r.data.variant },
          ],
        }, `${CAMPAIGN_ID}:${isTest ? `test:${r.email}:${Date.now()}` : r.user_id}`);
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

    return json({
      ok: true, mode, campaignId: CAMPAIGN_ID, attempted: queue.length, sent, failed,
      remaining: isTest ? recipients.length : Math.max(0, recipients.length - queue.length),
      failures: failures.slice(0, 20),
    });
  } catch (e) {
    console.error("send-seller-concierge error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
