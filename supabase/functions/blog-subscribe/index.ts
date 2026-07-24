// Public subscribe endpoint — saves email to blog_subscribers,
// alerts support@vendibook.com, and sends a confirmation email to the subscriber.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM = "Vendibook <hello@updates.vendibook.com>";
const REPLY_TO = "support@vendibook.com";
const ADMIN_ALERT_TO = ["support@vendibook.com"];
const HOME_URL = "https://vendibook.com";
const BLOG_URL = "https://vendibook.com/blog";
const LOGO_IMG = "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function buildConfirmationHtml(name: string | null) {
  const greeting = name ? `Welcome, ${name.split(" ")[0]}!` : "Welcome to Vendibook!";
  const unsubUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/marketing-unsubscribe`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${greeting}</title></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f4;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
<tr><td align="center" style="padding:32px 32px 16px 32px;"><img src="${LOGO_IMG}" alt="Vendibook" height="128" style="height:128px;width:auto;display:inline-block;border:0;"></td></tr>
<tr><td style="padding:0 32px;">
<p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#ff5124;font-weight:700;">You're in</p>
<h1 style="margin:0 0 16px 0;font-size:28px;line-height:1.2;font-weight:700;color:#0a0a0a;letter-spacing:-0.01em;">${greeting}</h1>
<p style="margin:0 0 20px 0;font-size:16px;line-height:1.65;color:#262626;">Thanks for subscribing. You'll get our best stories, new listings, and insights from the mobile food economy — straight to your inbox.</p>
<p style="margin:0 0 24px 0;font-size:16px;line-height:1.65;color:#262626;">While you're here, here are a few good places to start:</p>
</td></tr>
<tr><td style="padding:0 32px 8px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e7e5e4;border-radius:12px;margin-bottom:12px;">
<tr><td style="padding:18px 20px;">
<p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#0a0a0a;">Read the Vendibook Blog</p>
<p style="margin:0 0 10px 0;font-size:14px;color:#525252;line-height:1.5;">Real stories, financing breakdowns, and how-to guides for food truck owners, hosts, and vendors.</p>
<a href="${BLOG_URL}" style="font-size:14px;color:#ff5124;font-weight:700;text-decoration:none;">Browse articles →</a>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e7e5e4;border-radius:12px;margin-bottom:12px;">
<tr><td style="padding:18px 20px;">
<p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#0a0a0a;">Permit Path</p>
<p style="margin:0 0 10px 0;font-size:14px;color:#525252;line-height:1.5;">Figure out exactly what licenses and permits you need to operate a food truck in your city.</p>
<a href="${HOME_URL}/tools/permit-path" style="font-size:14px;color:#ff5124;font-weight:700;text-decoration:none;">Open Permit Path →</a>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e7e5e4;border-radius:12px;margin-bottom:12px;">
<tr><td style="padding:18px 20px;">
<p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#0a0a0a;">Explore the Marketplace</p>
<p style="margin:0 0 10px 0;font-size:14px;color:#525252;line-height:1.5;">Browse food trucks, trailers, shared kitchens, and vendor spaces for rent or for sale near you.</p>
<a href="${HOME_URL}/search" style="font-size:14px;color:#ff5124;font-weight:700;text-decoration:none;">Search listings →</a>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e7e5e4;border-radius:12px;margin-bottom:8px;">
<tr><td style="padding:18px 20px;">
<p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#0a0a0a;">List Your Asset</p>
<p style="margin:0 0 10px 0;font-size:14px;color:#525252;line-height:1.5;">Own a truck, trailer, or space? List it on Vendibook and start earning.</p>
<a href="${HOME_URL}/listing-wizard" style="font-size:14px;color:#ff5124;font-weight:700;text-decoration:none;">Create a listing →</a>
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:20px 32px 32px 32px;">
<a href="${HOME_URL}" style="display:inline-block;background:#ff5124;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 30px;border-radius:999px;">Visit Vendibook</a>
</td></tr>
<tr><td style="background:#fafaf9;padding:24px 32px;border-top:1px solid #e7e5e4;font-size:12px;line-height:1.6;color:#737373;text-align:center;">
<p style="margin:0 0 6px 0;color:#0a0a0a;font-weight:700;letter-spacing:0.04em;">VENDIBOOK</p>
<p style="margin:0 0 10px 0;">The marketplace for the mobile food economy.</p>
<p style="margin:0 0 6px 0;"><a href="${HOME_URL}" style="color:#525252;text-decoration:underline;">vendibook.com</a> · <a href="${unsubUrl}" style="color:#525252;text-decoration:underline;">Unsubscribe</a></p>
<p style="margin:0;color:#a3a3a3;">Vendibook · 1 S Church St, Tucson, AZ</p>
</td></tr></table></td></tr></table></body></html>`;
}

function buildAdminAlertHtml(email: string, name: string | null, source: string) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;max-width:520px;">
<h2 style="margin:0 0 12px 0;font-size:20px;">New Vendibook subscriber</h2>
<table cellpadding="6" style="border-collapse:collapse;font-size:14px;">
<tr><td style="color:#737373;">Email</td><td><strong>${email}</strong></td></tr>
<tr><td style="color:#737373;">Name</td><td>${name || "—"}</td></tr>
<tr><td style="color:#737373;">Source</td><td>${source}</td></tr>
<tr><td style="color:#737373;">When</td><td>${new Date().toISOString()}</td></tr>
</table></div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const name = body.name ? String(body.name).trim().slice(0, 120) : null;
    const source = body.source ? String(body.source).slice(0, 60) : "subscribe_page";

    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "Please enter a valid email address." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const admin = createClient(supabaseUrl, serviceKey);
    const resend = new Resend(resendKey);
    const userAgent = req.headers.get("user-agent") || null;

    // Insert (idempotent on email — unique index on lower(email))
    const { error: insertError } = await admin.from("blog_subscribers").insert({
      email, name, source, user_agent: userAgent, confirmed: true,
    });

    const isDuplicate = insertError && (insertError.code === "23505" || /duplicate/i.test(insertError.message));
    if (insertError && !isDuplicate) {
      console.error("blog-subscribe insert error:", insertError);
      return new Response(JSON.stringify({ error: "We couldn't save your subscription. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isDuplicate) {
      return new Response(JSON.stringify({ ok: true, alreadySubscribed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Best-effort confirmation + admin alert (don't fail the request if these error)
    try {
      await resend.emails.send({
        from: FROM,
        to: [email],
        subject: "Welcome to Vendibook",
        html: buildConfirmationHtml(name),
        reply_to: REPLY_TO,
        tags: [{ name: "type", value: "subscribe_confirmation" }],
      });
    } catch (e) {
      console.error("confirmation email failed:", e);
    }

    try {
      await resend.emails.send({
        from: FROM,
        to: ADMIN_ALERT_TO,
        subject: `New subscriber: ${email}`,
        html: buildAdminAlertHtml(email, name, source),
        reply_to: email,
        tags: [{ name: "type", value: "subscribe_admin_alert" }],
      });
    } catch (e) {
      console.error("admin alert failed:", e);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("blog-subscribe error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
