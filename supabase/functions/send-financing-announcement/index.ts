// Admin-gated seller product update: buyer financing (Equinox Funding) is live
// on every published for-sale listing.
//
// AUDIENCE: hosts who own at least one PUBLISHED for-sale listing (food truck /
// trailer), excluding QA/demo titles. Deduped by user id, then by email.
// Suppressed, unsubscribed, and already-sent addresses are skipped, so the
// broadcast is resumable and never mails the same seller twice.
//
// Modes: preview_count | preview_html | test | broadcast
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { isMailableAddress } from "../_shared/marketingAudience.ts";
import {
  FINANCING_ANNOUNCEMENT_CAMPAIGN_ID,
  FINANCING_SUBJECT,
  buildFinancingAnnouncementHtml,
  buildFinancingAnnouncementText,
} from "../_shared/marketing-templates/seller-financing-announcement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "Vendibook <report@updates.vendibook.com>";
const REPLY_TO = "support@vendibook.com";
const CAMPAIGN_ID = FINANCING_ANNOUNCEMENT_CAMPAIGN_ID;
const ELIGIBLE_CATEGORIES = ["food_truck", "food_trailer"];
const TEST_TITLE_PREFIXES = ["Demo%", "QA %", "QA_%", "QA-%", "Test %", "E2E %", "Smoke %"];

const NOTIFICATION = {
  type: "product_update",
  title: "Buyers can now finance your listing",
  message:
    "Qualified buyers can apply for equipment financing through Equinox Funding on your published for-sale listings. Nothing to set up, your price is unchanged, and you are paid the full sale price.",
  link: "/financing",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Recipient = { email: string; user_id: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // ---- admin gate ----
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    let callerId: string | null = null;
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

    const body = await req.json().catch(() => ({}));
    const mode: "preview_count" | "preview_html" | "test" | "broadcast" =
      body.mode ?? "preview_count";

    const unsubFor = (email: string) =>
      `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(email)}`;

    if (mode === "preview_html") {
      return json({
        subject: FINANCING_SUBJECT,
        html: buildFinancingAnnouncementHtml(unsubFor("preview@vendibook.com")),
      });
    }

    // ---- segment: hosts of published for-sale listings ----
    let listingQuery = admin
      .from("listings")
      .select("host_id")
      .is("deleted_at", null)
      .eq("mode", "sale")
      .eq("status", "published")
      .in("category", ELIGIBLE_CATEGORIES);
    for (const p of TEST_TITLE_PREFIXES) listingQuery = listingQuery.not("title", "ilike", p);

    const { data: listings, error: listingError } = await listingQuery;
    if (listingError) return json({ error: `Segment query failed: ${listingError.message}` }, 500);

    const hostIds = Array.from(
      new Set((listings ?? []).map((l: any) => l.host_id).filter(Boolean)),
    ) as string[];

    const [{ data: profiles }, { data: unsubs }, { data: suppressed }, { data: alreadySent }] =
      await Promise.all([
        hostIds.length
          ? admin.from("profiles").select("id, email").in("id", hostIds)
          : Promise.resolve({ data: [] as any[] }),
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
    const sentEmails = new Set(
      (alreadySent ?? []).map((r: any) => String(r.email ?? "").toLowerCase()),
    );
    const sentUsers = new Set((alreadySent ?? []).map((r: any) => r.user_id).filter(Boolean));

    let missingEmail = 0;
    let invalidEmail = 0;
    let suppressedCount = 0;
    let alreadySentCount = 0;

    const byUser = new Map<string, Recipient>();
    const seenEmail = new Set<string>();

    for (const p of (profiles ?? []) as any[]) {
      const email = String(p?.email ?? "").trim().toLowerCase();
      if (!email) {
        missingEmail++;
        continue;
      }
      if (!isMailableAddress(email)) {
        invalidEmail++;
        continue;
      }
      if (blocked.has(email)) {
        suppressedCount++;
        continue;
      }
      if (sentEmails.has(email) || sentUsers.has(p.id)) {
        alreadySentCount++;
        continue;
      }
      if (byUser.has(p.id) || seenEmail.has(email)) continue;
      seenEmail.add(email);
      byUser.set(p.id, { email, user_id: p.id });
    }

    const recipients = Array.from(byUser.values());
    const counts = {
      publishedSaleListings: (listings ?? []).length,
      eligibleHosts: hostIds.length,
      mailable: recipients.length,
      missingEmail,
      invalidEmail,
      suppressed: suppressedCount,
      alreadySent: alreadySentCount,
    };

    if (mode === "preview_count") {
      return json({
        campaignId: CAMPAIGN_ID,
        subject: FINANCING_SUBJECT,
        eligibleRecipients: recipients.length,
        counts,
        sample: recipients.slice(0, 5).map((r) => r.email),
        consentNote:
          "Product update sent to account holders with a published for-sale listing. One-click unsubscribe on every message; suppressed and already-sent addresses are skipped.",
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
      queue = [{ email: testEmail, user_id: callerId }];
    } else {
      if (body.confirm !== CAMPAIGN_ID) {
        return json({ error: "Broadcast requires explicit approval confirmation." }, 400);
      }
      if (!queue.length) {
        return json({ ok: true, mode, campaignId: CAMPAIGN_ID, attempted: 0, sent: 0, failed: 0, counts });
      }
    }

    let sent = 0;
    let failed = 0;
    const failures: Array<{ email: string; error: string }> = [];

    for (const r of queue) {
      const unsubUrl = unsubFor(r.email);
      try {
        const { data, error } = await resend.emails.send({
          from: FROM,
          to: [r.email],
          subject: FINANCING_SUBJECT,
          html: buildFinancingAnnouncementHtml(unsubUrl),
          text: buildFinancingAnnouncementText(unsubUrl),
          reply_to: REPLY_TO,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "type", value: "product_update" },
            { name: "campaign", value: "published_sale_financing_equinox" },
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
      await sleep(550); // ~2 req/s Resend limit
    }

    // ---- in-app notifications for every eligible seller (broadcast only) ----
    let notificationsCreated = 0;
    if (!isTest) {
      const targetIds = hostIds;
      const { data: existing } = await admin
        .from("notifications")
        .select("user_id")
        .eq("type", NOTIFICATION.type)
        .eq("title", NOTIFICATION.title)
        .in("user_id", targetIds);
      const already = new Set((existing ?? []).map((n: any) => n.user_id));
      const rows = targetIds
        .filter((id) => !already.has(id))
        .map((id) => ({ user_id: id, ...NOTIFICATION }));
      if (rows.length) {
        const { error: notifyError, count } = await admin
          .from("notifications")
          .insert(rows, { count: "exact" });
        if (notifyError) console.error("notification insert failed:", notifyError.message);
        else notificationsCreated = count ?? rows.length;
      }
    }

    return json({
      ok: true,
      mode,
      campaignId: CAMPAIGN_ID,
      attempted: queue.length,
      sent,
      failed,
      notificationsCreated,
      counts,
      failures: failures.slice(0, 20),
    });
  } catch (e) {
    console.error("send-financing-announcement error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
