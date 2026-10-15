// Atlas "speak with a person" follow-up (owner, 2026-10-15).
// A member or guest asks Atlas for a person. This records an admin support
// ticket (Admin → Support + an in-app notification for every admin) and
// emails support@vendibook.com through Resend, with the follow-up due within
// 2 business hours (Mon–Fri 8 AM–8 PM ET, _shared/followUpWindow.ts).
// Guests must give a phone or email. Rate limited per IP and per contact.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCaller } from "../_shared/callerGuard.ts";
import { checkRateLimit, clientIp } from "../_shared/rateLimit.ts";
import { invokeTransactionalEmail } from "../_shared/invokeTransactionalEmail.ts";
import { followUpDueAt, formatEt, inFollowUpHours } from "../_shared/followUpWindow.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_TO = "support@vendibook.com";
const FROM = "Vendibook Atlas <atlas@updates.vendibook.com>";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const caller = await getCaller(req);

    const name = text(body.name, 80);
    const phoneRaw = text(body.phone, 30);
    const phone = phoneRaw.replace(/[^\d+]/g, "").length >= 10 ? phoneRaw : "";
    const typedEmail = text(body.email, 120).toLowerCase();
    const email = EMAIL_RE.test(typedEmail) ? typedEmail : (caller?.email ?? "");
    const topic = text(body.topic, 120) || "Speak with the Vendibook team";
    const summary = text(body.summary, 1500);
    const preferred = body.preferred_contact === "email" ? "email" : body.preferred_contact === "phone" ? "phone" : "";
    const listingId = typeof body.listing_id === "string" && UUID_RE.test(body.listing_id) ? body.listing_id : null;
    const pageUrl = text(body.page_url, 300);

    if (!name) return json({ error: "Ask for their name first." }, 400);
    if (!phone && !email) return json({ error: "Ask for a phone number or email so the team can reach them." }, 400);

    const ip = clientIp(req);
    const contactKey = (email || phone.replace(/[^\d]/g, "")).toLowerCase();
    const [ipOk, contactOk] = await Promise.all([
      checkRateLimit("atlas_follow_up_ip", ip, 5, 60),
      checkRateLimit("atlas_follow_up_contact", contactKey, 3, 24 * 60),
    ]);
    if (!ipOk || !contactOk) {
      return json({ error: "A follow-up is already on the way. The team will reach out at the time they were given." }, 429);
    }

    const now = new Date();
    const due = followUpDueAt(now);
    const dueLabel = formatEt(due);
    const openNow = inFollowUpHours(now);

    const svc = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });

    const contactLines = [
      `Name: ${name}`,
      phone && `Phone: ${phone}`,
      email && `Email: ${email}`,
      preferred && `Prefers: ${preferred}`,
      caller ? `Member: ${caller.id}` : "Guest (not signed in)",
    ].filter(Boolean) as string[];
    const description = [
      `Follow up by ${dueLabel} (2 business hours, Mon–Fri 8 AM–8 PM ET).`,
      "",
      summary || "(No summary given.)",
      "",
      ...contactLines,
      listingId && `Listing: https://vendibook.com/listing/${listingId}`,
      pageUrl && `Page: ${pageUrl}`,
    ].filter((l) => l !== null && l !== undefined && l !== false).join("\n");

    const { data: ticket, error: insertErr } = await svc
      .from("support_tickets")
      .insert({
        user_id: caller?.id ?? null,
        feature_area: "other",
        category: "callback_request",
        priority: "high",
        title: `Atlas follow-up: ${name} — ${topic}`.slice(0, 200),
        description: description.slice(0, 5000),
        reply_email: email || null,
        related_listing_id: listingId,
        page_url: pageUrl || null,
        request_id: `atlas-${crypto.randomUUID()}`,
      })
      .select("id, reference_code")
      .single();
    if (insertErr || !ticket) throw new Error(`ticket insert failed: ${insertErr?.message ?? "unknown"}`);

    const adminLink = `/admin/support?ticket=${ticket.id}`;

    // In-app message for every admin.
    try {
      const { data: admins } = await svc.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        await svc.from("notifications").insert(
          admins.map((a: { user_id: string }) => ({
            user_id: a.user_id,
            type: "support_ticket",
            title: `📞 Follow up by ${dueLabel} — ${ticket.reference_code}`,
            message: `${name}: ${topic}`.slice(0, 200),
            link: adminLink,
          })),
        );
      }
    } catch (e) {
      console.error("[atlas-follow-up] admin notification failed", e);
    }

    // Email to support@ through Resend; Lovable's email service is the fallback.
    const subject = `Follow up by ${dueLabel}: ${name} (${ticket.reference_code})`;
    const rows = [
      ["Follow up by", dueLabel],
      ["Topic", topic],
      ...contactLines.map((l) => l.split(/: (.*)/s).slice(0, 2) as [string, string]),
      listingId ? ["Listing", `https://vendibook.com/listing/${listingId}`] : null,
      pageUrl ? ["Page", pageUrl] : null,
    ].filter(Boolean) as [string, string][];
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f1d1b">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#FF5124">Atlas · speak with a person</p>
<h2 style="margin:0 0 12px">Follow up by ${esc(dueLabel)}</h2>
<p style="white-space:pre-wrap;margin:0 0 16px">${esc(summary || "(No summary given.)")}</p>
<table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#6b6560">${esc(k)}</td><td><b>${esc(v ?? "")}</b></td></tr>`).join("")}</table>
<p style="margin:20px 0 0"><a href="https://vendibook.com${adminLink}" style="background:#FF5124;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Open ticket ${esc(ticket.reference_code)}</a></p>
</div>`;
    const plain = `Follow up by ${dueLabel}\n\n${summary || "(No summary given.)"}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nhttps://vendibook.com${adminLink}`;

    let emailed = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `atlas-follow-up-${ticket.id}`,
          },
          body: JSON.stringify({
            from: FROM,
            to: [SUPPORT_TO],
            subject,
            html,
            text: plain,
            ...(email ? { reply_to: email } : {}),
            tags: [{ name: "type", value: "atlas_follow_up" }],
          }),
        });
        emailed = res.ok;
        if (!res.ok) console.error("[atlas-follow-up] Resend", res.status, await res.text());
      } catch (e) {
        console.error("[atlas-follow-up] Resend failed", e);
      }
    } else {
      console.error("[atlas-follow-up] RESEND_API_KEY not configured");
    }
    if (!emailed) {
      try {
        await invokeTransactionalEmail({
          templateName: "generic-notice",
          recipientEmail: SUPPORT_TO,
          idempotencyKey: `atlas-follow-up-admin-${ticket.id}`,
          templateData: {
            subject,
            kicker: "Atlas · speak with a person",
            heading: `Follow up by ${dueLabel}`,
            paragraphs: [summary || "(No summary given.)"],
            details: rows.map(([label, value]) => ({ label, value })),
            ctaLabel: `Open ticket ${ticket.reference_code}`,
            ctaUrl: `https://vendibook.com${adminLink}`,
          },
        });
        emailed = true;
      } catch (e) {
        console.error("[atlas-follow-up] fallback email failed", e);
      }
    }

    return json({
      reference_code: ticket.reference_code,
      follow_up_by: dueLabel,
      follow_up_by_iso: due.toISOString(),
      team_open_now: openNow,
      emailed,
    });
  } catch (e) {
    console.error("[atlas-follow-up] error", e);
    return json({ error: "Could not set up the follow-up." }, 500);
  }
});
