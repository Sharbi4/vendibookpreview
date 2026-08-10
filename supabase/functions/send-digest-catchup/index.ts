// Catch-up sender: mails an already-composed campaign to the people a previous
// broadcast missed. It NEVER sends to an address recorded in
// blog_campaign_sends for the same campaign_id, so it is safe to re-run.
//
// Modes:
//   preview  -> returns counts only, sends nothing
//   send     -> sends to remaining recipients (optional `limit`)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildMarketingAudience } from "../_shared/marketingAudience.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API = "https://api.resend.com";
const FROM = "Vendibook <hello@updates.vendibook.com>";
const REPLY_TO = "support@vendibook.com";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function resendCall(path: string, init: RequestInit, key: string) {
  const r = await fetch(`${RESEND_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Resend ${path} ${r.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) throw new Error("RESEND_API_KEY not configured");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const mode: "preview" | "send" = body?.mode === "send" ? "send" : "preview";
    const campaignId = String(body?.campaignId ?? "").trim();
    if (!campaignId) return json({ error: "campaignId is required" }, 400);

    const audience = await buildMarketingAudience(supabase, campaignId);
    const limit = Number.isFinite(body?.limit) ? Number(body.limit) : audience.recipients.length;
    const queue = audience.recipients.slice(0, Math.max(0, limit));

    if (mode === "preview") {
      return json({
        success: true,
        mode,
        campaignId,
        counts: audience.counts,
        wouldSend: queue.length,
        sample: queue.slice(0, 5).map((r) => r.email),
      });
    }

    // Content: either passed in directly, or composed by another function's
    // dryRun (so the catch-up mails the exact same creative as the broadcast).
    let subject = String(body?.subject ?? "").trim();
    let html = String(body?.html ?? "");
    if (body?.composeFrom) {
      const composed = await supabase.functions.invoke(String(body.composeFrom), {
        body: { dryRun: true },
      });
      if (composed.error) throw new Error(`compose failed: ${composed.error.message}`);
      subject = subject || String(composed.data?.subject ?? "");
      html = html || String(composed.data?.html ?? "");
    }
    if (!subject || !html) return json({ error: "subject and html are required for send mode" }, 400);
    if (body?.confirm !== campaignId) {
      return json({ error: "Send requires confirm to equal campaignId." }, 400);
    }


    let sent = 0;
    let failed = 0;
    for (const r of queue) {
      const unsubUrl = `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(r.email)}`;
      const personalized = html.includes("</body>")
        ? html.replace(
            "</body>",
            `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:0 16px 32px;"><tr><td align="center"><p style="font-size:12px;color:#94a3b8;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">You're receiving this because you have a Vendibook account or joined our list. <a href="${unsubUrl}" style="color:#64748b;">Unsubscribe</a></p></td></tr></table></body>`,
          )
        : `${html}<p style="font-size:12px;color:#94a3b8;text-align:center;">You're receiving this because you have a Vendibook account or joined our list. <a href="${unsubUrl}">Unsubscribe</a></p>`;

      try {
        const res = await resendCall(
          "/emails",
          {
            method: "POST",
            body: JSON.stringify({
              from: FROM,
              to: [r.email],
              reply_to: REPLY_TO,
              subject,
              html: personalized,
              headers: {
                "List-Unsubscribe": `<${unsubUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
              tags: [{ name: "type", value: "catchup" }],
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
      await new Promise((res2) => setTimeout(res2, 550)); // ~2 req/s Resend limit
    }

    return json({ success: true, mode, campaignId, attempted: queue.length, sent, failed, counts: audience.counts });
  } catch (err) {
    console.error("send-digest-catchup error:", err);
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
