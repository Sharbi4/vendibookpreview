// One-off agent-triggered TEST sender for the New Exit Plan blog campaign.
// Hardcoded to a single test recipient; no auth required.
// Safe by design: cannot broadcast or send to arbitrary addresses.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_RECIPIENT = "support@vendibook.com";
const CAMPAIGN_ID = "2026-05-31-new-exit-plan-blog-email";
const SUBJECT = "[TEST] A Food Truck, a Recipe, and a Fresh Start";
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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${SUBJECT}</title></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${PREVIEW}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f4;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
<tr><td align="center" style="padding:32px 32px 12px 32px;"><img src="${LOGO_IMG}" alt="Vendibook" height="128" style="height:128px;width:auto;display:inline-block;border:0;"></td></tr>
<tr><td style="padding:8px 24px 0 24px;"><img src="${HERO_IMG}" alt="The New Exit Plan" width="552" style="width:100%;height:auto;border-radius:12px;display:block;border:0;"></td></tr>
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
</td></tr></table></td></tr></table></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const resend = new Resend(resendKey);

    const unsubUrl = `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(TEST_RECIPIENT)}`;
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [TEST_RECIPIENT],
      subject: SUBJECT,
      html: buildHtml(unsubUrl),
      reply_to: REPLY_TO,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [
        { name: "type", value: "blog_campaign_test" },
        { name: "campaign", value: CAMPAIGN_ID },
      ],
    });

    if (error) {
      await admin.from("blog_campaign_sends").insert({
        campaign_id: CAMPAIGN_ID, user_id: null, email: TEST_RECIPIENT,
        status: "failed", error_message: error.message, is_test: true,
      });
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("blog_campaign_sends").insert({
      campaign_id: CAMPAIGN_ID, user_id: null, email: TEST_RECIPIENT,
      status: "sent", resend_message_id: data?.id ?? null, is_test: true,
    });

    return new Response(JSON.stringify({ ok: true, to: TEST_RECIPIENT, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-blog-test-once error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
