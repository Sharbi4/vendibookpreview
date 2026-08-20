// Admin-gated one-time blog campaign sender (Resend).
// Modes: "test" (single recipient) | "broadcast" (all registered users).
// Dedup via blog_campaign_sends unique index. Honors email_unsubscribes.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CAMPAIGN_ID = "2026-05-31-new-exit-plan-blog-email";
const SUBJECT = "A Food Truck, a Recipe, and a Fresh Start";
const PREVIEW = "As AI reshapes work, more people are turning recipes, trucks, trailers, and shared kitchens into a path toward ownership.";
const ARTICLE_URL = "https://vendibook.com/blog/new-exit-plan-food-truck-after-layoffs";
const HOME_URL = "https://vendibook.com";
const SUBSCRIBE_URL = "https://vendibook.com/subscribe";
const HERO_IMG = "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/blog/new-exit-plan-food-truck.png";
const LOGO_IMG = "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png?v=2026-08";
const FROM = "Vendibook <hello@updates.vendibook.com>";
const REPLY_TO = "support@vendibook.com";

function buildHtml(unsubUrl: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${PREVIEW}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f4;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
      <tr><td align="center" style="padding:32px 32px 12px 32px;">
        <img src="${LOGO_IMG}" alt="Vendibook" height="128" style="height:128px;width:auto;display:inline-block;border:0;">
      </td></tr>
      <tr><td style="padding:8px 24px 0 24px;">
        <img src="${HERO_IMG}" alt="The New Exit Plan" width="552" style="width:100%;height:auto;border-radius:12px;display:block;border:0;">
      </td></tr>
      <tr><td style="padding:28px 32px 0 32px;">
        <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#ff5124;font-weight:700;">From Vendibook</p>
        <h1 style="margin:0 0 18px 0;font-size:28px;line-height:1.2;font-weight:700;color:#0a0a0a;letter-spacing:-0.01em;">The New Exit Plan: A Food Truck, a Recipe, and a Fresh Start After Layoffs</h1>
      </td></tr>
      <tr><td style="padding:8px 32px 0 32px;font-size:16px;line-height:1.65;color:#262626;">
        <p style="margin:0 0 16px 0;">There is a moment a lot of people are experiencing right now — the meeting invite with no context, the HR call, the carefully worded message about restructuring.</p>
        <p style="margin:0 0 16px 0;">For many, that moment is devastating. For others, it is becoming a turning point — a chance to ask a different question:</p>
        <p style="margin:0 0 24px 0;font-style:italic;color:#0a0a0a;"><strong>What if I built something of my own?</strong></p>
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 32px 32px;">
        <a href="${ARTICLE_URL}?utm_source=email&utm_medium=campaign&utm_campaign=${CAMPAIGN_ID}" style="display:inline-block;background:#ff5124;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:999px;letter-spacing:0.01em;">Keep Reading →</a>
      </td></tr>
      <tr><td style="padding:0 32px;"><hr style="border:0;border-top:1px solid #e7e5e4;margin:0;"></td></tr>
      <tr><td style="padding:28px 32px 8px 32px;font-size:16px;line-height:1.65;color:#262626;">
        <p style="margin:0 0 12px 0;font-weight:600;color:#0a0a0a;">Stay up to date with Vendibook news</p>
        <p style="margin:0 0 20px 0;">Get the latest stories, listings, and insights from the mobile food economy delivered to your inbox.</p>
      </td></tr>
      <tr><td align="center" style="padding:0 32px 28px 32px;">
        <a href="${SUBSCRIBE_URL}?utm_source=email&utm_medium=campaign&utm_campaign=${CAMPAIGN_ID}_subscribe" style="display:inline-block;background:#ff5124;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 30px;border-radius:999px;">Subscribe to Vendibook</a>
      </td></tr>
      <tr><td align="center" style="padding:0 32px 36px 32px;">
        <a href="${HOME_URL}?utm_source=email&utm_medium=campaign&utm_campaign=${CAMPAIGN_ID}" style="display:inline-block;background:#ffffff;color:#0a0a0a;text-decoration:none;font-weight:700;font-size:14px;padding:11px 26px;border-radius:999px;border:1.5px solid #0a0a0a;">Explore Vendibook</a>
      </td></tr>
      <tr><td style="background:#fafaf9;padding:24px 32px;border-top:1px solid #e7e5e4;font-size:12px;line-height:1.6;color:#737373;text-align:center;">
        <p style="margin:0 0 6px 0;color:#0a0a0a;font-weight:700;letter-spacing:0.04em;">VENDIBOOK</p>
        <p style="margin:0 0 10px 0;">The marketplace for the mobile food economy.<br>Food trucks, trailers, shared kitchens, ghost kitchens, and vendor spaces.</p>
        <p style="margin:0 0 6px 0;"><a href="${HOME_URL}" style="color:#525252;text-decoration:underline;">vendibook.com</a> · <a href="${unsubUrl}" style="color:#525252;text-decoration:underline;">Unsubscribe</a></p>
        <p style="margin:0;color:#a3a3a3;">Vendibook · 1 S Church St, Tucson, AZ</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const TEXT = `${SUBJECT}

${PREVIEW}

The New Exit Plan: A Food Truck, a Recipe, and a Fresh Start After Layoffs

There is a moment a lot of people are experiencing right now.

The meeting invite with no context. The HR call. The carefully worded message about restructuring, realignment, or workforce reduction.

For many people, that moment is devastating. But for others, it is becoming a turning point.

Instead of going back into another uncertain job market, some workers are asking a different question:

What if I built something of my own?

For many, that answer looks like a food truck, a trailer, a catering concept, a shared kitchen, or a family recipe that finally gets a business plan.

In our latest Vendibook article, we look at how layoffs, AI, and the changing workforce are pushing more people toward mobile food entrepreneurship — and why food remains one of the most human, community-rooted businesses someone can build.

Read the full article: ${ARTICLE_URL}
Explore Vendibook: ${HOME_URL}

Vendibook — The marketplace for the mobile food economy.
`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Admin gate via caller JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userRes } = await userClient.auth.getUser();
    const callerId = userRes?.user?.id;
    if (!callerId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const mode: "test" | "broadcast" | "preview_count" = body.mode ?? "preview_count";
    const testEmail: string | undefined = body.testEmail;

    const resend = new Resend(resendKey);

    // Build recipient list
    let recipients: { email: string; user_id: string | null }[] = [];

    if (mode === "test") {
      if (!testEmail || !isValidEmail(testEmail)) {
        return new Response(JSON.stringify({ error: "Valid testEmail required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      recipients = [{ email: testEmail, user_id: null }];
    } else {
      // Pull all auth users (paginate)
      const allUsers: { id: string; email: string | null }[] = [];
      let page = 1;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        const users = data?.users ?? [];
        if (!users.length) break;
        allUsers.push(...users.map((u) => ({ id: u.id, email: u.email ?? null })));
        if (users.length < 1000) break;
        page++;
        if (page > 50) break;
      }

      const { data: unsubs } = await admin.from("email_unsubscribes").select("email");
      const unsubSet = new Set((unsubs ?? []).map((u: any) => u.email.toLowerCase()));

      const { data: sent } = await admin
        .from("blog_campaign_sends")
        .select("email")
        .eq("campaign_id", CAMPAIGN_ID)
        .eq("status", "sent")
        .eq("is_test", false);
      const sentSet = new Set((sent ?? []).map((r: any) => r.email.toLowerCase()));

      const seen = new Set<string>();
      for (const u of allUsers) {
        const e = (u.email ?? "").trim().toLowerCase();
        if (!e || !isValidEmail(e)) continue;
        if (unsubSet.has(e) || sentSet.has(e) || seen.has(e)) continue;
        seen.add(e);
        recipients.push({ email: e, user_id: u.id });
      }
    }

    if (mode === "preview_count") {
      return new Response(JSON.stringify({ campaignId: CAMPAIGN_ID, eligibleRecipients: recipients.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    let failCount = 0;

    for (const r of recipients) {
      const unsubUrl = `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(r.email)}`;
      try {
        const { data, error } = await resend.emails.send({
          from: FROM,
          to: [r.email],
          subject: SUBJECT,
          html: buildHtml(unsubUrl),
          text: TEXT,
          reply_to: REPLY_TO,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "type", value: "blog_campaign" },
            { name: "campaign", value: CAMPAIGN_ID },
          ],
        });

        if (error) {
          failCount++;
          await admin.from("blog_campaign_sends").insert({
            campaign_id: CAMPAIGN_ID, user_id: r.user_id, email: r.email,
            status: "failed", error_message: error.message, is_test: mode === "test",
          });
        } else {
          sentCount++;
          await admin.from("blog_campaign_sends").insert({
            campaign_id: CAMPAIGN_ID, user_id: r.user_id, email: r.email,
            status: "sent", resend_message_id: data?.id ?? null, is_test: mode === "test",
          });
        }
      } catch (e) {
        failCount++;
        await admin.from("blog_campaign_sends").insert({
          campaign_id: CAMPAIGN_ID, user_id: r.user_id, email: r.email,
          status: "failed", error_message: (e as Error).message, is_test: mode === "test",
        });
      }
      await sleep(550); // ~2 req/s Resend limit
    }

    return new Response(JSON.stringify({
      ok: true, mode, campaignId: CAMPAIGN_ID,
      attempted: recipients.length, sent: sentCount, failed: failCount,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-blog-campaign error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
