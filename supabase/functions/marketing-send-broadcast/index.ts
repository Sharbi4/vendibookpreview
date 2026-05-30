// marketing-send-broadcast — Sends "The Vendibook Report" to all opted-in users.
// Only runs when send.status === 'test_approved'. Renders per-recipient so
// feedback links carry the recipient email (for 1-click rating attribution).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { renderVendibookReport, DEFAULT_TOOLS } from "../_shared/marketing-templates/vendibook-report.ts";
import {
  FROM_EMAIL, FROM_NAME, REPLY_TO_EMAIL, LOGO_DARK_URL, LOGO_LIGHT_URL,
  MAILING_ADDRESS, VENDIBOOK_BASE_URL, FEEDBACK_REDIRECT_URL, UNSUBSCRIBE_URL_BASE,
} from "../_shared/marketing-templates/constants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function dateLabel(d = new Date()): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function sendOne(apiKey: string, to: string, subject: string, html: string, issueNumber: number, sendDay: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
        reply_to: REPLY_TO_EMAIL,
        headers: {
          "List-Unsubscribe": `<${UNSUBSCRIBE_URL_BASE}?e=${encodeURIComponent(to)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [
          { name: "type", value: "marketing" },
          { name: "edition", value: String(issueNumber) },
          { name: "send_day", value: sendDay },
        ],
      }),
    });
    if (r.status === 429) { await sleep(800 * (attempt + 1)); continue; }
    const j = await r.json();
    if (!r.ok) return { ok: false, error: j?.message || `HTTP ${r.status}` };
    return { ok: true, id: j.id };
  }
  return { ok: false, error: "Rate limited after retries" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { sendId } = await req.json();
    if (!sendId) throw new Error("sendId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const { data: send } = await supabase.from("email_sends").select("*").eq("id", sendId).maybeSingle();
    if (!send) throw new Error("Send not found");
    if (send.status !== "test_approved") throw new Error("Send not approved (status: " + send.status + ")");

    await supabase.from("email_sends").update({ status: "sending" }).eq("id", sendId);

    // Build recipient list from auth.users via profiles or directly from auth admin API
    const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersErr) throw usersErr;

    const { data: unsubs } = await supabase.from("email_unsubscribes").select("email");
    const unsubSet = new Set((unsubs ?? []).map(u => u.email.toLowerCase()));

    const recipients = (users ?? [])
      .map(u => u.email)
      .filter((e): e is string => !!e && !unsubSet.has(e.toLowerCase()));

    const sendDay = new Date().getDay() === 2 ? "tuesday" : new Date().getDay() === 6 ? "saturday" : "manual";
    const subject = send.subject_line;
    const payload = send.composed_payload ?? {};
    const tools = payload.tools && payload.tools.length === 3 ? payload.tools : DEFAULT_TOOLS.slice(0, 3);

    let sentCount = 0, failedCount = 0;
    const eventsToInsert: any[] = [];

    for (const to of recipients) {
      const html = renderVendibookReport({
        issueNumber: send.issue_number,
        dateLabel: dateLabel(),
        heroHeadline: send.hero_headline,
        saleListings: payload.saleListings ?? [],
        featuredRental: payload.featuredRental ?? null,
        referralRotation: (send.referral_rotation ?? "purchase") as any,
        tools,
        insightTitle: payload.insight?.title ?? "",
        insightPullQuote: payload.insight?.pullQuote ?? "",
        insightBody: payload.insight?.body ?? "",
        recipientEmail: to,
        sendId: send.id,
        unsubscribeUrl: `${UNSUBSCRIBE_URL_BASE}?e=${encodeURIComponent(to)}`,
        feedbackBaseUrl: FEEDBACK_REDIRECT_URL,
        logoLightUrl: LOGO_LIGHT_URL,
        logoDarkUrl: LOGO_DARK_URL,
        baseUrl: VENDIBOOK_BASE_URL,
        mailingAddress: MAILING_ADDRESS,
      });
      const r = await sendOne(RESEND_API_KEY, to, subject, html, send.issue_number, sendDay);
      if (r.ok) {
        sentCount++;
        eventsToInsert.push({ send_id: sendId, recipient_email: to, event_type: "sent", metadata: { resend_id: r.id } });
      } else {
        failedCount++;
        eventsToInsert.push({ send_id: sendId, recipient_email: to, event_type: "deferred", metadata: { error: r.error } });
      }
      // throttle ~10/s to stay under Resend's default limit
      await sleep(100);
    }

    // Bulk insert events in chunks of 200
    for (let i = 0; i < eventsToInsert.length; i += 200) {
      await supabase.from("email_events").insert(eventsToInsert.slice(i, i + 200));
    }

    await supabase.from("email_sends").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      recipient_count: sentCount,
      send_day: sendDay,
    }).eq("id", sendId);

    return new Response(JSON.stringify({ ok: true, sentCount, failedCount, total: recipients.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-send-broadcast error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
