// Dimension backfill campaign (Resend).
//
// Audience: owners of PUBLISHED FOR-SALE food_truck / food_trailer listings
// that are missing required Length and/or Height. Width is optional and never
// triggers the campaign. Mirrors `requiresSaleDimensions` in
// src/lib/listings/stages.ts so the recipient set cannot drift.
//
// Modes: preview_count | preview_html | test | broadcast
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "Vendibook <report@updates.vendibook.com>";
const REPLY_TO = "support@vendibook.com";
const SUBJECT = "Add your listing dimensions to help buyers";
const CAMPAIGN_ID = "dimension-backfill-v1";
const SITE = "https://vendibook.com";

const DIMENSION_CATEGORIES = ["food_truck", "food_trailer"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Target {
  email: string;
  userId: string | null;
  firstName: string;
  titles: string[];
}

function buildHtml(t: Target, unsubUrl: string, ctaUrl: string) {
  const multi = t.titles.length > 1;
  const line = multi
    ? `You have <strong>${t.titles.length} listings</strong> missing required Length and/or Height. Adding them takes about a minute each and updates your listings automatically.`
    : `Your listing <strong>${esc(t.titles[0] ?? "")}</strong> is missing required Length and/or Height. Adding it takes about a minute and will update your listing automatically.`;
  return `<!doctype html><html><body style="margin:0;background:#08080a;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;color:#f5f5f4;">
    <img src="${SITE}/images/vendibook-logo.png" alt="Vendibook" width="150" style="display:block;margin-bottom:28px;" />
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;color:#ffffff;">Add your listing dimensions to help buyers</h1>
    <p style="font-size:15px;line-height:1.6;color:#d6d3d1;margin:0 0 14px;">Hi ${esc(t.firstName || "there")},</p>
    <p style="font-size:15px;line-height:1.6;color:#d6d3d1;margin:0 0 14px;">We’ve added clearer trailer/truck dimensions to Vendibook listings so buyers can quickly evaluate fit, transport and delivery.</p>
    <p style="font-size:15px;line-height:1.6;color:#d6d3d1;margin:0 0 24px;">${line}</p>
    <a href="${ctaUrl}" style="display:inline-block;background:#f97316;color:#0b0b0c;font-weight:600;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:14px;">Add dimensions</a>
    <p style="font-size:15px;line-height:1.6;color:#d6d3d1;margin:28px 0 0;">Thanks,<br/>Vendibook</p>
    <p style="font-size:12px;color:#78716c;margin:28px 0 0;">Vendibook · 1 S Church St, Tucson, AZ · <a href="${unsubUrl}" style="color:#a8a29e;">Unsubscribe</a></p>
  </div></body></html>`;
}

function buildText(t: Target, unsubUrl: string, ctaUrl: string) {
  const line = t.titles.length > 1
    ? `You have ${t.titles.length} listings missing required Length and/or Height.`
    : `Your listing ${t.titles[0] ?? ""} is missing required Length and/or Height.`;
  return `Hi ${t.firstName || "there"},

We've added clearer trailer/truck dimensions to Vendibook listings so buyers can quickly evaluate fit, transport and delivery.

${line} Adding it takes about a minute and will update your listing automatically.

Add dimensions: ${ctaUrl}

Thanks,
Vendibook

Unsubscribe: ${unsubUrl}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const opsToken = Deno.env.get("DIMENSION_CAMPAIGN_TOKEN");
    const providedOps = req.headers.get("x-ops-token")?.trim();
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();

    let authorized = !!opsToken && !!providedOps && providedOps === opsToken;
    if (!authorized) {
      if (!token) return json({ error: "Unauthorized" }, 401);
      authorized = token === serviceKey;
      if (!authorized) {
        const { data: userRes } = await admin.auth.getUser(token);
        const callerId = userRes?.user?.id ?? null;
        if (!callerId) return json({ error: "Unauthorized" }, 401);
        const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
        authorized = !!isAdmin;
      }
    }
    if (!authorized) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const mode: string = body.mode ?? "preview_count";

    // ---- audience ----
    const { data: listings, error } = await admin
      .from("listings")
      .select("id, title, host_id, length_inches, height_inches")
      .eq("status", "published")
      .eq("mode", "sale")
      .in("category", DIMENSION_CATEGORIES)
      .is("deleted_at", null)
      .not("published_at", "is", null);
    if (error) throw error;

    const affected = (listings ?? []).filter((l: any) => {
      const title = String(l.title ?? "");
      if (/^demo/i.test(title) || /^test/i.test(title)) return false;
      return !(l.length_inches > 0) || !(l.height_inches > 0);
    });

    const hostIds = Array.from(new Set(affected.map((l: any) => l.host_id).filter(Boolean)));
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", hostIds);
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const targets = new Map<string, Target>();
    for (const l of affected) {
      const p: any = byId.get(l.host_id);
      const email = String(p?.email ?? "").trim().toLowerCase();
      if (!isValidEmail(email)) continue;
      const existing = targets.get(email);
      if (existing) existing.titles.push(l.title);
      else
        targets.set(email, {
          email,
          userId: l.host_id,
          firstName: String(p?.full_name ?? "").split(" ")[0] ?? "",
          titles: [l.title],
        });
    }
    const queueAll = Array.from(targets.values());

    const unsubFor = (email: string) =>
      `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(email)}`;
    const ctaFor = (t: Target) =>
      `${SITE}/host/listings`;

    if (mode === "preview_count") {
      return json({
        campaignId: CAMPAIGN_ID,
        affectedListings: affected.length,
        uniqueSellers: queueAll.length,
        recipients: queueAll.map((t) => ({ email: t.email, name: t.firstName, listings: t.titles })),
      });
    }

    if (mode === "preview_html") {
      const sample = queueAll[0];
      if (!sample) return json({ error: "No affected sellers" }, 404);
      return json({ subject: SUBJECT, html: buildHtml(sample, unsubFor(sample.email), ctaFor(sample)) });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY not configured" }, 500);
    const resend = new Resend(resendKey);

    let queue = queueAll;
    const isTest = mode === "test";
    if (isTest) {
      const testEmail = String(body.testEmail ?? "").trim().toLowerCase();
      if (!isValidEmail(testEmail)) return json({ error: "Valid testEmail required" }, 400);
      const sample = queueAll[0];
      queue = [
        {
          email: testEmail,
          userId: null,
          firstName: body.firstName ?? sample?.firstName ?? "there",
          titles: body.titles ?? (sample ? [sample.titles[0]] : ["Your listing"]),
        },
      ];
    } else if (mode === "broadcast") {
      if (body.confirm !== CAMPAIGN_ID) {
        return json({ error: "Broadcast requires explicit approval confirmation." }, 400);
      }
    } else {
      return json({ error: "Unknown mode" }, 400);
    }

    const results: Array<{ email: string; id?: string; error?: string }> = [];
    for (const t of queue) {
      const unsubUrl = unsubFor(t.email);
      const ctaUrl = ctaFor(t);
      try {
        const { data, error: sendErr } = await resend.emails.send({
          from: FROM,
          to: [t.email],
          subject: isTest ? `[TEST] ${SUBJECT}` : SUBJECT,
          html: buildHtml(t, unsubUrl, ctaUrl),
          text: buildText(t, unsubUrl, ctaUrl),
          reply_to: REPLY_TO,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "type", value: "listing_ops" },
            { name: "campaign", value: CAMPAIGN_ID },
          ],
        });
        if (sendErr) throw new Error(sendErr.message);
        results.push({ email: t.email, id: data?.id });
      } catch (e) {
        results.push({ email: t.email, error: (e as Error).message });
      }
    }

    return json({
      ok: true,
      mode,
      attempted: queue.length,
      sent: results.filter((r) => r.id).length,
      failed: results.filter((r) => r.error).length,
      results,
      affectedListings: affected.length,
      uniqueSellers: queueAll.length,
    });
  } catch (e) {
    console.error("send-dimension-prompt error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
