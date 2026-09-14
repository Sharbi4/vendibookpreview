// Vendibook "Feature your listing" seller conversion campaign (2026-09).
//
// Admin-gated. Modes: preview_count | preview_html | test | broadcast.
// Broadcast requires an explicit confirmation string so previewing and test
// sends can never mail the audience by accident.
//
// Audience: distinct sellers owning >= 1 publicly live listing that is NOT
// currently actively Featured (mirrors src/lib/featured.ts isListingFeatured:
// featured_enabled AND featured_expires_at in the future).
// deno-lint-ignore-file no-explicit-any

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { isMailableAddress } from "../_shared/marketingAudience.ts";
import { isInternalCaller } from "../_shared/internalAuth.ts";
import { MARKETING_FROM, MARKETING_REPLY_TO } from "../_shared/marketing-templates/brand.ts";
import {
  FEATURE_CAMPAIGN_ID,
  FEATURE_SUBJECT,
  buildFeatureYourListingHtml,
  buildFeatureYourListingText,
  type CampaignListing,
} from "../_shared/marketing-templates/feature-your-listing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ops-token",
};

const CAMPAIGN_ID = FEATURE_CAMPAIGN_ID;
const BOOST_SLUG = "boost-featured-30";
const TEST_TITLE_PREFIXES = ["Demo%", "QA %", "QA_%", "QA-%", "Test %", "E2E %", "Smoke %"];
const LISTING_COLUMNS =
  "id, host_id, title, cover_image_url, city, state, mode, category, price_sale, price_daily, price_weekly, featured_enabled, featured_expires_at, published_at";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    const mode: "preview_count" | "preview_html" | "test" | "broadcast" =
      body.mode ?? "preview_count";

    const unsubFor = (email: string) =>
      `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(email)}`;

    // ---- price straight from the monetization catalog (never hardcoded) ----
    const { data: product } = await admin
      .from("monetization_products")
      .select("price_cents, duration_days")
      .eq("slug", BOOST_SLUG)
      .maybeSingle();
    const priceCents = Number(product?.price_cents ?? 4900);
    const priceLabel = `$${(priceCents / 100).toLocaleString("en-US", {
      minimumFractionDigits: priceCents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;

    // ---- eligible listings: publicly live AND not actively featured ----
    const nowIso = new Date().toISOString();
    const allListings: any[] = [];
    const PAGE = 1000;
    for (let from = 0; from < 100000; from += PAGE) {
      let q = admin
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "published")
        .eq("moderation_status", "clear")
        .is("deleted_at", null)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .range(from, from + PAGE - 1);
      for (const p of TEST_TITLE_PREFIXES) q = q.not("title", "ilike", p);
      const { data: page, error } = await q;
      if (error) return json({ error: `Listing query failed: ${error.message}` }, 500);
      allListings.push(...(page ?? []));
      if (!page || page.length < PAGE) break;
    }

    // Same rule as src/lib/featured.ts isListingFeatured().
    const isActivelyFeatured = (l: any) =>
      !!l.featured_enabled && !!l.featured_expires_at &&
      new Date(l.featured_expires_at).getTime() > Date.now();

    const activeFeatured = allListings.filter(isActivelyFeatured).length;
    const eligibleListings = allListings.filter((l) => !isActivelyFeatured(l) && l.host_id);

    // Most recently published eligible listing first, per seller.
    const bySeller = new Map<string, CampaignListing[]>();
    for (const l of eligibleListings) {
      const arr = bySeller.get(l.host_id) ?? [];
      arr.push(l as CampaignListing);
      bySeller.set(l.host_id, arr);
    }

    if (mode === "preview_html") {
      const sample = (bySeller.values().next().value ?? []) as CampaignListing[];
      return json({
        subject: FEATURE_SUBJECT,
        priceLabel,
        html: buildFeatureYourListingHtml({
          firstName: body.previewFirstName ?? "Sam",
          primary: sample[0] ?? null,
          others: sample.slice(1, 3),
          unsubscribeUrl: unsubFor("preview@vendibook.com"),
          priceLabel,
        }),
      });
    }

    const hostIds = Array.from(bySeller.keys());

    // ---- recipients ----
    const profiles: any[] = [];
    for (let i = 0; i < hostIds.length; i += 200) {
      const { data, error } = await admin
        .from("profiles")
        .select("id, email, first_name")
        .in("id", hostIds.slice(i, i + 200));
      if (error) return json({ error: `Profile query failed: ${error.message}` }, 500);
      profiles.push(...(data ?? []));
    }

    const [{ data: unsubs }, { data: suppressed }, { data: alreadySent }] = await Promise.all([
      admin.from("email_unsubscribes").select("email"),
      admin.from("suppressed_emails").select("email"),
      admin
        .from("blog_campaign_sends")
        .select("email, user_id")
        .eq("campaign_id", CAMPAIGN_ID)
        .eq("is_test", false)
        .eq("status", "sent"),
    ]);

    const blocked = new Set<string>();
    for (const r of [...(unsubs ?? []), ...(suppressed ?? [])]) {
      if (r?.email) blocked.add(String(r.email).toLowerCase());
    }
    const sentEmails = new Set((alreadySent ?? []).map((r: any) => String(r.email ?? "").toLowerCase()));
    const sentUsers = new Set((alreadySent ?? []).map((r: any) => r.user_id).filter(Boolean));

    let missingEmail = 0, invalidEmail = 0, suppressedCount = 0, alreadySentCount = 0;
    const seenEmail = new Set<string>();
    type Recipient = {
      email: string; user_id: string; first_name: string | null; listings: CampaignListing[];
    };
    const recipients: Recipient[] = [];

    for (const p of profiles) {
      const email = String(p?.email ?? "").trim().toLowerCase();
      if (!email) { missingEmail++; continue; }
      if (!isMailableAddress(email)) { invalidEmail++; continue; }
      if (blocked.has(email)) { suppressedCount++; continue; }
      if (sentEmails.has(email) || sentUsers.has(p.id)) { alreadySentCount++; continue; }
      if (seenEmail.has(email)) continue; // one email per seller, even with many listings
      seenEmail.add(email);
      recipients.push({
        email,
        user_id: p.id,
        first_name: p.first_name ?? null,
        listings: (bySeller.get(p.id) ?? []).slice(0, 3),
      });
    }

    const counts = {
      publishedListings: allListings.length,
      activeFeaturedExcluded: activeFeatured,
      eligibleListings: eligibleListings.length,
      eligibleSellers: hostIds.length,
      mailableSellers: recipients.length,
      missingEmail, invalidEmail, suppressed: suppressedCount, alreadySent: alreadySentCount,
    };

    if (mode === "preview_count") {
      return json({
        campaignId: CAMPAIGN_ID,
        subject: FEATURE_SUBJECT,
        priceLabel,
        eligibleRecipients: recipients.length,
        counts,
        sample: recipients.slice(0, 5).map((r) => r.email),
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY not configured" }, 500);
    const resend = new Resend(resendKey);

    const isTest = mode === "test";
    let queue: Recipient[] = recipients;

    if (isTest) {
      const testEmail = String(body.testEmail ?? "").trim().toLowerCase();
      if (!isMailableAddress(testEmail)) return json({ error: "Valid testEmail required" }, 400);
      const sample = (recipients[0]?.listings ?? (bySeller.values().next().value ?? [])) as CampaignListing[];
      queue = [{
        email: testEmail,
        user_id: callerId ?? "00000000-0000-0000-0000-000000000000",
        first_name: body.previewFirstName ?? null,
        listings: sample.slice(0, 3),
      }];
    } else {
      if (body.confirm !== CAMPAIGN_ID) {
        return json({ error: "Broadcast requires explicit approval confirmation." }, 400);
      }
      if (!queue.length) {
        return json({ ok: true, mode, campaignId: CAMPAIGN_ID, attempted: 0, sent: 0, failed: 0, counts });
      }
    }

    let sent = 0, failed = 0;
    const failures: Array<{ email: string; error: string }> = [];

    for (const r of queue) {
      const unsubscribeUrl = unsubFor(r.email);
      const payload = {
        firstName: r.first_name,
        primary: r.listings[0] ?? null,
        others: r.listings.slice(1, 3),
        unsubscribeUrl,
        priceLabel,
      };
      try {
        const { data, error } = await resend.emails.send({
          from: MARKETING_FROM,
          to: [r.email],
          subject: isTest ? `[TEST] ${FEATURE_SUBJECT}` : FEATURE_SUBJECT,
          html: buildFeatureYourListingHtml(payload),
          text: buildFeatureYourListingText(payload),
          reply_to: MARKETING_REPLY_TO,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "type", value: "marketing" },
            { name: "campaign", value: "feature_your_listing_2026_09" },
          ],
        });
        if (error) throw new Error(error.message);
        sent++;
        await admin.from("blog_campaign_sends").insert({
          campaign_id: CAMPAIGN_ID,
          user_id: r.user_id,
          email: r.email,
          status: "sent",
          resend_message_id: data?.id ?? null,
          is_test: isTest,
        });
      } catch (e) {
        failed++;
        const message = (e as Error).message;
        failures.push({ email: r.email, error: message });
        await admin.from("blog_campaign_sends").insert({
          campaign_id: CAMPAIGN_ID,
          user_id: r.user_id,
          email: r.email,
          status: "failed",
          error_message: message,
          is_test: isTest,
        });
      }
      await sleep(550);
    }

    return json({
      ok: true, mode, campaignId: CAMPAIGN_ID,
      attempted: queue.length, sent, failed, counts,
      failures: failures.slice(0, 20),
    });
  } catch (e) {
    console.error("send-feature-your-listing error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
