// "Rent it while you sell it" campaign from Brad (Customer Success). Sent
// through Resend on the marketing shell, same pattern as send-seller-concierge.
//
// Admin-gated. Modes: preview_count | preview_html | test | broadcast.
// Broadcast requires body.confirm === RENT_WHILE_YOU_SELL_CAMPAIGN_ID and
// sends at most body.limit emails per call (default 20) so it can run hourly.
//
// Audience (computed live), one email per host:
//   monthly_rate        — a live rental with no monthly rate
//   rent_while_you_sell — a live sale food truck/trailer, published 30+ days,
//                         with no linked rental, MIN_VIEWS+ views in the last
//                         30 days, no offer ever and no conversation in 30 days
//                         (so "views but no offers yet" is literally true).
//                         The host's most-viewed qualifying listing is used.
// body.states (e.g. ["TX"]) restricts a wave; recipients are ordered by
// WAVE_ORDER (TX, GA, FL, AZ) then the rest. body.onlyUserIds /
// body.excludeUserIds as in send-seller-concierge.
// Skips unsubscribed/suppressed/unmailable addresses, internal accounts,
// admins, held or suspended accounts, anyone already sent this campaign, and
// anyone sent a seller-concierge or listing-fix email in the last
// COOLDOWN_DAYS days. Sale listings under $1,000 or with broken titles are
// left to the concierge integrity flow.
// Every send carries Idempotency-Key `${CAMPAIGN_ID}:${user_id}`.

import { readAllRows as pageAll } from "../_shared/readAllRows.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { isMailableAddress } from "../_shared/marketingAudience.ts";
import { isInternalCaller } from "../_shared/internalAuth.ts";
import { MARKETING_FROM, MARKETING_REPLY_TO } from "../_shared/marketing-templates/brand.ts";
import { LISTING_FIX_CAMPAIGN_ID } from "../_shared/marketing-templates/listing-fix-nudge.ts";
import { SELLER_CONCIERGE_CAMPAIGN_ID } from "../_shared/marketing-templates/seller-concierge.ts";
import {
  RENT_WHILE_YOU_SELL_CAMPAIGN_ID,
  buildRentCampaignHtml,
  buildRentCampaignText,
  rentCampaignSubject,
  type RentCampaignData,
  type RentCampaignVariant,
} from "../_shared/marketing-templates/rent-while-you-sell.ts";
import { unsubToken } from "../_shared/unsubscribeToken.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CAMPAIGN_ID = RENT_WHILE_YOU_SELL_CAMPAIGN_ID;
const DEFAULT_LIMIT = 20;
const COOLDOWN_DAYS = 3;
const LIVE_DAYS = 30;
const MIN_VIEWS = 10;
const MIN_SALE_PRICE = 1000;
const WAVE_ORDER = ["TX", "GA", "FL", "AZ"];
const CONVERTIBLE = ["food_truck", "food_trailer"];
const BROKEN_TITLE = /^\s*(that.?s (good|perfect)|use this instead|my food (trailer|truck)|my ghost kitchen|untitled)\b/i;
const TEST_TITLE_PREFIXES = ["Demo%", "QA %", "QA_%", "QA-%", "Test %", "E2E %", "Smoke %", "Sandbox %"];
const INTERNAL_EMAIL = /@(example\.com|vendibook\.com)$/i;
const DAY = 24 * 60 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ListingRow = {
  id: string; host_id: string | null; title: string | null; mode: string | null; category: string | null;
  state: string | null; price_sale: number | null; price_daily: number | null; price_weekly: number | null;
  price_monthly: number | null; published_at: string | null;
};
type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

const VARIANT_RANK: Record<RentCampaignVariant, number> = { monthly_rate: 0, rent_while_you_sell: 1 };

const unitWordOf = (category: string | null) =>
  category === "food_truck" ? "food truck" : category === "food_trailer" ? "food trailer" : "kitchen";

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
    const states = Array.isArray(body.states) && body.states.length
      ? new Set<string>(body.states.map((s: unknown) => String(s).trim().toUpperCase())) : null;
    const unsubFor = (email: string) =>
      `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`;
    const now = Date.now();
    const since30 = new Date(now - LIVE_DAYS * DAY).toISOString();

    // ---- live listings (sale and rent) ----
    const listings = await pageAll<ListingRow>((from, to) => {
      let q = admin
        .from("listings")
        .select("id, host_id, title, mode, category, state, price_sale, price_daily, price_weekly, price_monthly, published_at")
        .eq("status", "published")
        .eq("moderation_status", "clear")
        .is("deleted_at", null)
        .not("published_at", "is", null)
        .order("id").range(from, to);
      for (const p of TEST_TITLE_PREFIXES) q = q.not("title", "ilike", p);
      return q as unknown as PageResult<ListingRow>;
    });
    const linked = await pageAll<{ source_listing_id: string | null }>((from, to) => admin
      .from("listings").select("source_listing_id")
      .not("source_listing_id", "is", null).is("deleted_at", null)
      .order("id").range(from, to));
    const hasRental = new Set(linked.map((r) => r.source_listing_id).filter(Boolean));

    const saleCands = listings.filter((l) =>
      l.mode === "sale" && CONVERTIBLE.includes(String(l.category)) && !hasRental.has(l.id) &&
      Number(l.price_sale ?? 0) >= MIN_SALE_PRICE && !!l.published_at &&
      Date.parse(l.published_at) <= now - LIVE_DAYS * DAY &&
      !BROKEN_TITLE.test(String(l.title ?? "")) && String(l.title ?? "").trim().length >= 8);
    const saleIds = saleCands.map((l) => l.id);

    const views = new Map<string, number>();
    const withOffers = new Set<string>();
    const withRecentConvs = new Set<string>();
    for (let i = 0; i < saleIds.length; i += 200) {
      const ids = saleIds.slice(i, i + 200);
      const [v, o, c] = await Promise.all([
        pageAll<{ listing_id: string }>((from, to) => admin.from("listing_views").select("listing_id")
          .in("listing_id", ids).gte("viewed_at", since30).order("id").range(from, to)),
        pageAll<{ listing_id: string }>((from, to) => admin.from("offers").select("listing_id")
          .in("listing_id", ids).order("id").range(from, to)),
        pageAll<{ listing_id: string }>((from, to) => admin.from("conversations").select("listing_id")
          .in("listing_id", ids).gte("created_at", since30).order("id").range(from, to)),
      ]);
      for (const r of v) views.set(r.listing_id, (views.get(r.listing_id) ?? 0) + 1);
      for (const r of o) withOffers.add(r.listing_id);
      for (const r of c) withRecentConvs.add(r.listing_id);
    }

    // Monthly comps: live monthly rates of rentals in the same group.
    const compGroup = (category: string | null) => (category === "ghost_kitchen" ? "kitchen" : "mobile");
    const comps = new Map<string, number[]>();
    for (const l of listings) {
      if (l.mode !== "rent" || !(Number(l.price_monthly) > 0)) continue;
      const g = compGroup(l.category);
      comps.set(g, [...(comps.get(g) ?? []), Number(l.price_monthly)]);
    }
    const compRange = (category: string | null) => {
      const xs = comps.get(compGroup(category)) ?? [];
      return xs.length >= 2 ? { min: Math.min(...xs), max: Math.max(...xs) } : null;
    };

    // ---- one candidate per host ----
    type Candidate = { listing: ListingRow; variant: RentCampaignVariant; views30: number };
    const byHost = new Map<string, Candidate>();
    const consider = (cand: Candidate) => {
      const host = cand.listing.host_id!;
      const prev = byHost.get(host);
      if (!prev || VARIANT_RANK[cand.variant] < VARIANT_RANK[prev.variant] ||
          (cand.variant === prev.variant && cand.views30 > prev.views30)) byHost.set(host, cand);
    };
    for (const l of listings) {
      if (!l.host_id || (onlyUserIds && !onlyUserIds.has(l.host_id))) continue;
      if (states && !states.has(String(l.state ?? "").toUpperCase())) continue;
      if (l.mode === "rent" && !(Number(l.price_monthly) > 0)) consider({ listing: l, variant: "monthly_rate", views30: 0 });
    }
    for (const l of saleCands) {
      if (!l.host_id || (onlyUserIds && !onlyUserIds.has(l.host_id))) continue;
      if (states && !states.has(String(l.state ?? "").toUpperCase())) continue;
      const v = views.get(l.id) ?? 0;
      if (v < MIN_VIEWS || withOffers.has(l.id) || withRecentConvs.has(l.id)) continue;
      consider({ listing: l, variant: "rent_while_you_sell", views30: v });
    }

    const hostIds = Array.from(byHost.keys());
    type ProfileRow = { id: string; email: string | null; first_name: string | null; full_name: string | null; account_suspended: boolean | null };
    const profiles: ProfileRow[] = [];
    for (let i = 0; i < hostIds.length; i += 200) {
      profiles.push(...await pageAll<ProfileRow>((from, to) => admin
        .from("profiles")
        .select("id, email, first_name, full_name, account_suspended")
        .in("id", hostIds.slice(i, i + 200)).order("id").range(from, to)));
    }

    const cooldownSince = new Date(now - COOLDOWN_DAYS * DAY).toISOString();
    const [unsubs, suppressed, alreadySent, recentOther, admins, holds] = await Promise.all([
      pageAll((from, to) => admin.from("email_unsubscribes").select("email").order("id").range(from, to)),
      pageAll((from, to) => admin.from("suppressed_emails").select("email").order("id").range(from, to)),
      pageAll((from, to) => admin.from("blog_campaign_sends").select("email, user_id")
        .eq("campaign_id", CAMPAIGN_ID).eq("is_test", false).eq("status", "sent").order("id").range(from, to)),
      pageAll((from, to) => admin.from("blog_campaign_sends").select("email, user_id")
        .in("campaign_id", [SELLER_CONCIERGE_CAMPAIGN_ID, LISTING_FIX_CAMPAIGN_ID]).eq("is_test", false).eq("status", "sent")
        .gte("created_at", cooldownSince).order("id").range(from, to)),
      pageAll((from, to) => admin.from("user_roles").select("user_id").eq("role", "admin").order("id").range(from, to)),
      pageAll((from, to) => admin.from("message_sending_holds").select("user_id").order("user_id").range(from, to)),
    ]);
    const blocked = new Set<string>();
    for (const r of [...(unsubs ?? []), ...(suppressed ?? [])]) {
      if (r?.email) blocked.add(String(r.email).toLowerCase());
    }
    const priorRows = [...(alreadySent ?? []), ...(recentOther ?? [])] as { email: string | null; user_id: string | null }[];
    const priorEmails = new Set(priorRows.map((r) => String(r.email ?? "").toLowerCase()));
    const priorUsers = new Set(priorRows.map((r) => r.user_id).filter(Boolean));
    const adminIds = new Set(((admins ?? []) as { user_id: string }[]).map((r) => r.user_id));
    const heldIds = new Set(((holds ?? []) as { user_id: string }[]).map((r) => r.user_id));

    const firstNameOf = (p: ProfileRow): string | null => {
      const raw = (p.first_name ?? "").trim() || (p.full_name ?? "").trim().split(/\s+/)[0] || "";
      if (!/^[A-Za-z][A-Za-z'-]{1,}$/.test(raw)) return null;
      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    };

    type Recipient = { email: string; user_id: string; state: string; views30: number; data: RentCampaignData };
    const recipients: Recipient[] = [];
    let skipped = 0;
    for (const p of profiles) {
      const email = String(p?.email ?? "").trim().toLowerCase();
      if (
        !isMailableAddress(email) || INTERNAL_EMAIL.test(email) || blocked.has(email) ||
        priorEmails.has(email) || priorUsers.has(p.id) || adminIds.has(p.id) || excludeUserIds.has(p.id) ||
        heldIds.has(p.id) || p.account_suspended === true
      ) {
        skipped++;
        continue;
      }
      const c = byHost.get(p.id)!;
      const l = c.listing;
      recipients.push({
        email,
        user_id: p.id,
        state: String(l.state ?? "").toUpperCase(),
        // Internal ordering only; never rendered in the email.
        views30: c.views30,
        data: {
          firstName: firstNameOf(p),
          variant: c.variant,
          listingId: l.id,
          listingTitle: String(l.title ?? "").trim(),
          unitWord: unitWordOf(l.category),
          dailyRate: c.variant === "monthly_rate" ? Number(l.price_daily) || null : null,
          weeklyRate: c.variant === "monthly_rate" ? Number(l.price_weekly) || null : null,
          monthlyComps: c.variant === "monthly_rate" ? compRange(l.category) : null,
          unsubscribeUrl: unsubFor(email),
        },
      });
    }
    const waveRank = (s: string) => (WAVE_ORDER.indexOf(s) + 1 || WAVE_ORDER.length + 1);
    recipients.sort((a, b) =>
      VARIANT_RANK[a.data.variant] - VARIANT_RANK[b.data.variant] ||
      waveRank(a.state) - waveRank(b.state) ||
      b.views30 - a.views30);

    if (mode === "preview_count") {
      const byVariant: Record<string, number> = {};
      const byState: Record<string, number> = {};
      for (const r of recipients) {
        byVariant[r.data.variant] = (byVariant[r.data.variant] ?? 0) + 1;
        if (r.data.variant === "rent_while_you_sell") byState[r.state || "?"] = (byState[r.state || "?"] ?? 0) + 1;
      }
      return json({
        campaignId: CAMPAIGN_ID,
        eligibleRecipients: recipients.length,
        byVariant,
        byState,
        skipped,
        nextBatch: recipients.slice(0, limit).map((r) => ({
          listing_id: r.data.listingId, title: r.data.listingTitle, variant: r.data.variant,
          state: r.state, views30: r.views30,
        })),
      });
    }
    const pick = (want?: RentCampaignVariant, listingId?: string) =>
      recipients.find((r) => (!want || r.data.variant === want) && (!listingId || r.data.listingId === listingId));
    if (mode === "preview_html") {
      const sample = pick(body.variant, body.listingId)?.data;
      if (!sample) return json({ error: "No eligible recipients" }, 404);
      return json({ subject: rentCampaignSubject(sample), html: buildRentCampaignHtml(sample), text: buildRentCampaignText(sample) });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY not configured" }, 500);
    // Direct API call so every send carries an Idempotency-Key.
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
      const sample = pick(body.variant, body.listingId);
      if (!sample) return json({ error: "No eligible recipients to sample" }, 404);
      queue = [{
        ...sample,
        email: testEmail,
        user_id: callerId ?? "00000000-0000-0000-0000-000000000000",
        data: { ...sample.data, unsubscribeUrl: unsubFor(testEmail) },
      }];
    } else if (mode !== "broadcast" || body.confirm !== CAMPAIGN_ID) {
      return json({ error: "Broadcast requires explicit approval confirmation." }, 400);
    }

    let sent = 0, failed = 0;
    const failures: Array<{ email: string; error: string }> = [];
    for (const r of queue) {
      const subject = rentCampaignSubject(r.data);
      try {
        const data = await sendEmail({
          from: MARKETING_FROM,
          to: [r.email],
          subject: isTest ? `[TEST] ${subject}` : subject,
          html: buildRentCampaignHtml(r.data),
          text: buildRentCampaignText(r.data),
          reply_to: MARKETING_REPLY_TO,
          headers: {
            "List-Unsubscribe": `<${r.data.unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "type", value: "marketing" },
            { name: "campaign", value: "rent_while_you_sell_2026_10" },
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
    console.error("send-rent-while-you-sell error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
