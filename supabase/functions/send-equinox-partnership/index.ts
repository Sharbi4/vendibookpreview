// Admin-gated Vendibook x Equinox Funding partnership campaign (Resend).
// Modes: preview_count | preview_html | test | broadcast.
//
// AUDIENCE: confirmed newsletter subscribers plus registered account holders.
// Every message includes a one-click List-Unsubscribe header and footer link,
// and blog_campaign_sends dedupes recipients so re-running the broadcast only
// mails people who have not received this campaign yet.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildMarketingAudience } from "../_shared/marketingAudience.ts";
import {
  EQUINOX_CAMPAIGN_ID,
  SUBJECTS,
  buildEquinoxHtml,
  buildEquinoxText,
  type EquinoxVariant,
} from "../_shared/marketing-templates/equinox-partnership.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "Vendibook <report@updates.vendibook.com>";
const REPLY_TO = "support@vendibook.com";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

type Recipient = { email: string; user_id: string | null; variant: EquinoxVariant };

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
    // Verify the caller's JWT with the service-role client so the gate keeps
    // working under the asymmetric signing-key setup.
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
      const variant: EquinoxVariant = body.variant === "seller" ? "seller" : "buyer";
      return json({
        variant,
        subject: SUBJECTS[variant],
        html: buildEquinoxHtml(variant, unsubFor("preview@vendibook.com")),
      });
    }

    // ---- build audience ----
    // Confirmed newsletter list + registered account holders. Suppressed,
    // unsubscribed and already-sent addresses are excluded, so re-running this
    // campaign only tops up the people who have not received it yet.
    const includeRegisteredUsers = body.includeRegisteredUsers !== false;
    const audience = await buildMarketingAudience(admin, EQUINOX_CAMPAIGN_ID, {
      includeRegisteredUsers,
    });

    const baseEmails = audience.recipients.map((m) => m.email).filter(isValidEmail);

    // Segment: sellers = recipient owns at least one for-sale listing.
    const sellerEmails = new Set<string>();
    const emailToUser = new Map<string, string>();
    for (const m of audience.recipients) {
      if (m.user_id) emailToUser.set(m.email, m.user_id);
    }
    if (baseEmails.length) {
      const ids = Array.from(new Set(emailToUser.values()));
      if (ids.length) {
        const { data: saleListings } = await admin
          .from("listings")
          .select("host_id")
          .in("host_id", ids)
          .eq("mode", "sale");
        const sellerIds = new Set((saleListings ?? []).map((l: any) => l.host_id));
        for (const [e, id] of emailToUser) if (sellerIds.has(id)) sellerEmails.add(e);
      }
    }

    const recipients: Recipient[] = baseEmails.map((e) => ({
      email: e,
      user_id: emailToUser.get(e) ?? null,
      variant: sellerEmails.has(e) ? "seller" : "buyer",
    }));

    const counts = {
      total: recipients.length,
      seller: recipients.filter((r) => r.variant === "seller").length,
      buyer: recipients.filter((r) => r.variant === "buyer").length,
      newsletter: audience.counts.newsletter,
      registered: audience.counts.registered,
      suppressed: audience.counts.blocked,
      alreadySent: audience.counts.alreadySent,
    };

    if (mode === "preview_count") {
      return json({
        campaignId: EQUINOX_CAMPAIGN_ID,
        eligibleRecipients: counts.total,
        counts,
        consentNote:
          "Audience is the confirmed newsletter list plus registered account holders. Every message carries a one-click unsubscribe, and addresses already sent this campaign are skipped.",
      });
    }


    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY not configured" }, 500);
    const resend = new Resend(resendKey);

    let queue: Recipient[] = recipients;
    const isTest = mode === "test";

    if (isTest) {
      const testEmail = String(body.testEmail ?? "").trim().toLowerCase();
      if (!isValidEmail(testEmail)) return json({ error: "Valid testEmail required" }, 400);
      const variant: EquinoxVariant = body.variant === "seller" ? "seller" : "buyer";
      queue = [{ email: testEmail, user_id: callerId, variant }];
    } else {
      if (body.confirm !== EQUINOX_CAMPAIGN_ID) {
        return json({ error: "Broadcast requires explicit approval confirmation." }, 400);
      }
      if (!queue.length) return json({ ok: true, mode, attempted: 0, sent: 0, failed: 0 });
    }

    let sent = 0;
    let failed = 0;
    for (const r of queue) {
      const unsubUrl = unsubFor(r.email);
      try {
        const { data, error } = await resend.emails.send({
          from: FROM,
          to: [r.email],
          subject: SUBJECTS[r.variant],
          html: buildEquinoxHtml(r.variant, unsubUrl),
          text: buildEquinoxText(r.variant, unsubUrl),
          reply_to: REPLY_TO,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "type", value: "partnership_campaign" },
            { name: "campaign", value: EQUINOX_CAMPAIGN_ID },
            { name: "variant", value: r.variant },
          ],
        });
        if (error) throw new Error(error.message);
        sent++;
        await admin.from("blog_campaign_sends").insert({
          campaign_id: EQUINOX_CAMPAIGN_ID,
          user_id: r.user_id,
          email: r.email,
          status: "sent",
          resend_message_id: data?.id ?? null,
          is_test: isTest,
        });
      } catch (e) {
        failed++;
        await admin.from("blog_campaign_sends").insert({
          campaign_id: EQUINOX_CAMPAIGN_ID,
          user_id: r.user_id,
          email: r.email,
          status: "failed",
          error_message: (e as Error).message,
          is_test: isTest,
        });
      }
      await sleep(550); // ~2 req/s Resend limit
    }

    return json({ ok: true, mode, campaignId: EQUINOX_CAMPAIGN_ID, attempted: queue.length, sent, failed });
  } catch (e) {
    console.error("send-equinox-partnership error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
