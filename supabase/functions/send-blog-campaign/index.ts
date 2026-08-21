// Admin-gated blog/newsletter campaign sender (Resend).
// Reusable: pass campaign content in the request body; the constants below
// are only defaults for the most recent campaign.
// Modes: "test" (single recipient) | "broadcast" (all registered users)
//        | "preview_count" | "preview_html" (render only, sends nothing).
// Dedup via blog_campaign_sends unique index. Honors email_unsubscribes.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  MK, FONT, esc, mkButton, marketingShell,
  MARKETING_FROM, MARKETING_REPLY_TO, SITE_URL,
} from "../_shared/marketing-templates/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Campaign = {
  campaignId: string;
  subject: string;
  preview: string;
  eyebrow: string;
  headline: string;
  paragraphs: string[];
  ctaLabel: string;
  articleUrl: string;
  heroImage?: string | null;
};

const DEFAULT_CAMPAIGN: Campaign = {
  campaignId: "2026-05-31-new-exit-plan-blog-email",
  subject: "A Food Truck, a Recipe, and a Fresh Start",
  preview: "As AI reshapes work, more people are turning recipes, trucks, trailers, and shared kitchens into a path toward ownership.",
  eyebrow: "From Vendibook",
  headline: "The New Exit Plan: A Food Truck, a Recipe, and a Fresh Start After Layoffs",
  paragraphs: [
    "There is a moment a lot of people are experiencing right now — the meeting invite with no context, the HR call, the carefully worded message about restructuring.",
    "For many, that moment is devastating. For others, it is becoming a turning point — a chance to ask a different question:",
    "<strong>What if I built something of my own?</strong>",
  ],
  ctaLabel: "Keep Reading",
  articleUrl: "https://vendibook.com/blog/new-exit-plan-food-truck-after-layoffs",
  heroImage: "https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/blog/new-exit-plan-food-truck.png",
};

const SUBSCRIBE_URL = `${SITE_URL}/subscribe`;
const FROM = MARKETING_FROM;
const REPLY_TO = MARKETING_REPLY_TO;

function resolveCampaign(body: Record<string, unknown>): Campaign {
  const c = { ...DEFAULT_CAMPAIGN } as Campaign;
  for (const k of Object.keys(DEFAULT_CAMPAIGN) as (keyof Campaign)[]) {
    const v = (body as any)[k];
    if (v !== undefined && v !== null && v !== "") (c as any)[k] = v;
  }
  return c;
}

function buildHtml(c: Campaign, unsubUrl: string) {
  const utm = `?utm_source=email&utm_medium=campaign&utm_campaign=${encodeURIComponent(c.campaignId)}`;
  const hero = c.heroImage
    ? `<tr><td style="padding:8px 24px 0;">
        <img src="${esc(c.heroImage)}" alt="${esc(c.headline)}" width="552" style="width:100%;height:auto;border-radius:12px;display:block;border:0;">
      </td></tr>`
    : "";
  const paras = c.paragraphs
    .map((t) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.65;color:${MK.textSecondary};">${t}</p>`)
    .join("");

  const bodyRows = `
  ${hero}
  <tr><td style="padding:28px 32px 0;">
    <p style="margin:0 0 10px;font-family:${FONT};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${MK.orangeOnWhite};font-weight:700;">${esc(c.eyebrow)}</p>
    <h1 style="margin:0 0 18px;font-family:${FONT};font-size:28px;line-height:1.25;font-weight:700;color:${MK.text};">${esc(c.headline)}</h1>
  </td></tr>
  <tr><td style="padding:0 32px;">${paras}</td></tr>
  <tr><td align="center" style="padding:8px 32px 32px;">
    ${mkButton(c.ctaLabel, `${c.articleUrl}${utm}`)}
  </td></tr>
  <tr><td style="padding:0 32px;"><hr style="border:0;border-top:1px solid ${MK.border};margin:0;"></td></tr>
  <tr><td style="padding:28px 32px 8px;">
    <p style="margin:0 0 12px;font-family:${FONT};font-size:16px;font-weight:700;color:${MK.text};">Stay up to date with Vendibook news</p>
    <p style="margin:0 0 20px;font-family:${FONT};font-size:16px;line-height:1.65;color:${MK.textSecondary};">Get the latest stories, listings, and insights from the mobile food economy delivered to your inbox.</p>
  </td></tr>
  <tr><td align="center" style="padding:0 32px 12px;">${mkButton("Subscribe to Vendibook", `${SUBSCRIBE_URL}${utm}_subscribe`)}</td></tr>
  <tr><td align="center" style="padding:0 32px 32px;">${mkButton("Explore Vendibook", `${SITE_URL}${utm}`, { ghost: true })}</td></tr>`;

  return marketingShell({
    title: c.subject,
    preheader: c.preview,
    bodyRows,
    unsubscribeUrl: unsubUrl,
    baseUrl: SITE_URL,
    footerNote: "You're receiving this because you have a Vendibook account or joined our list.",
  });
}

function buildText(c: Campaign) {
  return `${c.subject}\n\n${c.preview}\n\n${c.headline}\n\n${c.paragraphs.map((p) => p.replace(/<[^>]+>/g, "")).join("\n\n")}\n\nRead the full article: ${c.articleUrl}\nExplore Vendibook: ${SITE_URL}\n\nVendibook — The marketplace for the mobile food economy.\n`;
}

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
    const mode: "test" | "broadcast" | "preview_count" | "preview_html" = body.mode ?? "preview_count";
    const testEmail: string | undefined = body.testEmail;
    const campaign = resolveCampaign(body ?? {});
    const CAMPAIGN_ID = campaign.campaignId;

    if (mode === "preview_html") {
      return new Response(
        JSON.stringify({
          campaignId: CAMPAIGN_ID,
          subject: campaign.subject,
          html: buildHtml(campaign, `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=preview%40vendibook.com`),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
          subject: campaign.subject,
          html: buildHtml(campaign, unsubUrl),
          text: buildText(campaign),
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
