// Correction broadcast for the seller financing announcement.
//
// AUDIENCE: exactly the addresses that received the original financing
// announcement (blog_campaign_sends, status = sent, is_test = false). No new
// segment is computed — a correction goes only to people who saw the error.
// Unsubscribed/suppressed addresses and anyone already corrected are skipped,
// so the run is resumable and never double-sends.
//
// Modes: preview_count | preview_html | test | broadcast
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { isMailableAddress } from "../_shared/marketingAudience.ts";
import { isInternalCaller } from "../_shared/internalAuth.ts";
import {
  CORRECTION_SUBJECT,
  FINANCING_CORRECTION_CAMPAIGN_ID,
  ORIGINAL_FINANCING_CAMPAIGN_ID,
  buildFinancingCorrectionHtml,
  buildFinancingCorrectionText,
} from "../_shared/marketing-templates/seller-financing-correction.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ops-token",
};

const FROM = "Vendibook <report@updates.vendibook.com>";
const REPLY_TO = "support@vendibook.com";
const CAMPAIGN_ID = FINANCING_CORRECTION_CAMPAIGN_ID;

const NOTIFICATION = {
  type: "product_update",
  title: "Correction: seller payout timing",
  message:
    "Our financing update stated the wrong payout schedule. Payouts are typically released within 24 hours of delivery confirmation (always our 24–48 hour target), sent via PayPal, ACH, or Venmo depending on your payout account.",
  link: "/dashboard",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Recipient = { email: string; user_id: string | null };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // ---- auth: admin user, trusted backend caller, or ops token ----
    const opsToken = (Deno.env.get("CORRECTION_CAMPAIGN_TOKEN") ?? "").trim();
    const providedOps = (req.headers.get("x-ops-token") ?? "").trim();
    let authorized = isInternalCaller(req) || (!!opsToken && providedOps === opsToken);
    let callerId: string | null = null;

    if (!authorized) {
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
      const { data: isAdmin } = await admin.rpc("has_role", {
        _user_id: callerId,
        _role: "admin",
      });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      authorized = true;
    }

    const body = await req.json().catch(() => ({}));
    const mode: "preview_count" | "preview_html" | "test" | "broadcast" =
      body.mode ?? "preview_count";

    const unsubFor = (email: string) =>
      `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(email)}`;

    if (mode === "preview_html") {
      return json({
        subject: CORRECTION_SUBJECT,
        html: buildFinancingCorrectionHtml(unsubFor("preview@vendibook.com")),
      });
    }

    // ---- audience: everyone who received the original announcement ----
    const [{ data: originalSends, error: sendsError }, { data: unsubs }, { data: suppressed }, { data: alreadyCorrected }] =
      await Promise.all([
        admin
          .from("blog_campaign_sends")
          .select("email, user_id")
          .eq("campaign_id", ORIGINAL_FINANCING_CAMPAIGN_ID)
          .eq("is_test", false)
          .eq("status", "sent"),
        admin.from("email_unsubscribes").select("email"),
        admin.from("suppressed_emails").select("email"),
        admin
          .from("blog_campaign_sends")
          .select("email")
          .eq("campaign_id", CAMPAIGN_ID)
          .eq("is_test", false)
          .eq("status", "sent"),
      ]);

    if (sendsError) {
      return json({ error: `Audience query failed: ${sendsError.message}` }, 500);
    }

    const blocked = new Set<string>();
    for (const r of [...(unsubs ?? []), ...(suppressed ?? [])]) {
      if (r?.email) blocked.add(String(r.email).toLowerCase());
    }
    const corrected = new Set(
      (alreadyCorrected ?? []).map((r: any) => String(r.email ?? "").toLowerCase()),
    );

    let invalidEmail = 0;
    let suppressedCount = 0;
    let alreadySentCount = 0;
    const seen = new Set<string>();
    const recipients: Recipient[] = [];

    for (const r of (originalSends ?? []) as any[]) {
      const email = String(r?.email ?? "").trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      if (!isMailableAddress(email)) {
        invalidEmail++;
        continue;
      }
      if (blocked.has(email)) {
        suppressedCount++;
        continue;
      }
      if (corrected.has(email)) {
        alreadySentCount++;
        continue;
      }
      recipients.push({ email, user_id: r.user_id ?? null });
    }

    const counts = {
      originalRecipients: seen.size,
      mailable: recipients.length,
      invalidEmail,
      suppressed: suppressedCount,
      alreadySent: alreadySentCount,
    };

    if (mode === "preview_count") {
      return json({
        campaignId: CAMPAIGN_ID,
        subject: CORRECTION_SUBJECT,
        eligibleRecipients: recipients.length,
        counts,
        sample: recipients.slice(0, 5).map((r) => r.email),
        consentNote:
          "Correction notice sent only to recipients of the original financing product update. One-click unsubscribe on every message.",
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
          subject: CORRECTION_SUBJECT,
          html: buildFinancingCorrectionHtml(unsubUrl),
          text: buildFinancingCorrectionText(unsubUrl),
          reply_to: REPLY_TO,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "type", value: "correction" },
            { name: "campaign", value: "financing_payout_correction" },
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

    // ---- in-app correction notice for the same sellers ----
    let notificationsCreated = 0;
    if (!isTest) {
      const targetIds = Array.from(
        new Set(recipients.map((r) => r.user_id).filter(Boolean)),
      ) as string[];
      if (targetIds.length) {
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
          if (!notifyError) notificationsCreated = count ?? rows.length;
        }
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
    return json({ error: (e as Error).message }, 500);
  }
});
