// Callback requests from the Contact page (and the kitchen white-glove popup
// and legacy voice tools). Every request is saved as an Admin → Support ticket
// first, then admins get an in-app notification and an email through
// adminAlertEmails(). Until 2026-10-26 this function only emailed
// support@vendibook.com, which has been suppressed since 2026-08-04, so
// callback requests were silently lost.
//
// Promise: a callback within 2 business hours (Mon–Fri 8 AM–8 PM ET,
// _shared/followUpWindow.ts). Rate limited per IP and per contact.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { invokeTransactionalEmail } from "../_shared/invokeTransactionalEmail.ts";
import { getCaller } from "../_shared/callerGuard.ts";
import { checkRateLimit, clientIp } from "../_shared/rateLimit.ts";
import { followUpDueAt, formatEt, inFollowUpHours } from "../_shared/followUpWindow.ts";
import { adminAlertEmails, adminNoticeKey } from "../_shared/adminRecipients.ts";
import { normalizeNanpToE164 } from "../_shared/smsConsent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTACT_WAYS: Record<string, string> = { phone: "Call", text: "Text from (866) 690-6227", email: "Email" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const caller = await getCaller(req);

    const name = text(body.name, 80);
    const phoneRaw = text(body.phone, 30);
    const phoneE164 = normalizeNanpToE164(phoneRaw);
    const phone = phoneRaw.replace(/[^\d]/g, "").length >= 10 ? phoneRaw : "";
    const typedEmail = text(body.email, 120).toLowerCase();
    const email = EMAIL_RE.test(typedEmail) ? typedEmail : "";
    const hasAccount = body.has_account === true ? "Yes" : body.has_account === false ? "No" : "";
    // Legacy callers send preferredTime / scheduledDate / scheduledTime.
    const bestTime = text(body.best_time, 120) || [text(body.scheduledDate, 20), text(body.scheduledTime, 20)].filter(Boolean).join(" ")
      || (text(body.preferredTime, 60) === "asap" ? "As soon as possible" : text(body.preferredTime, 60));
    const contactWay = String(body.preferred_contact ?? body.preferredContact ?? "phone");
    let preferred = CONTACT_WAYS[contactWay] ? contactWay : "phone";
    const comments = text(body.comments, 1500);
    const business = text(body.restaurantName, 120);
    const source = text(body.source, 60) || "contact-page";
    const pageUrl = text(body.page_url, 300);

    if (!name) return json({ error: "Please tell us your name." }, 400);
    if (!phone && !email) return json({ error: "Please add a phone number or email so we can reach you." }, 400);
    // If the visitor left the phone blank but gave an email (e.g. the kitchen
    // white-glove popup, where phone is optional), reach them by email
    // instead of rejecting the request.
    if (!phone && email) preferred = "email";
    if (preferred !== "email" && !phone) return json({ error: "Please add the best number to reach you." }, 400);
    if (preferred === "email" && !email && !caller?.email) return json({ error: "Please add your email address." }, 400);

    const ip = clientIp(req);
    const contactKey = (phoneE164 || email).toLowerCase();
    const [ipOk, contactOk] = await Promise.all([
      checkRateLimit("callback_request_ip", ip, 6, 60),
      checkRateLimit("callback_request_contact", contactKey, 3, 24 * 60),
    ]);
    if (!ipOk || !contactOk) {
      return json({ error: "We already have your request and the team will reach out soon. For something urgent, call or text (866) 690-6227." }, 429);
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
      phone && `Best number: ${phone}`,
      email && `Email: ${email}`,
      hasAccount && `Has a Vendibook account: ${hasAccount}`,
      caller ? `Signed-in member: ${caller.id}${caller.email ? ` (${caller.email})` : ""}` : "Guest (not signed in)",
      `Reach them by: ${CONTACT_WAYS[preferred]}`,
      bestTime && `Best time: ${bestTime}`,
      business && `Business: ${business}`,
      `Source: ${source}`,
    ].filter(Boolean) as string[];
    const description = [
      `Call back by ${dueLabel} (2 business hours, Mon–Fri 8 AM–8 PM ET).`,
      "",
      comments || "(No comments given.)",
      "",
      ...contactLines,
      preferred === "text" && "The customer asked to be texted about this request from (866) 690-6227. This is not marketing consent.",
      pageUrl && `Page: ${pageUrl}`,
    ].filter(Boolean).join("\n");

    const { data: ticket, error: insertErr } = await svc
      .from("support_tickets")
      .insert({
        user_id: caller?.id ?? null,
        feature_area: "other",
        category: "callback_request",
        priority: "high",
        source: "in_app",
        title: `Callback: ${name}${bestTime ? ` — ${bestTime}` : ""}`.slice(0, 200),
        description: description.slice(0, 5000),
        reply_email: email || caller?.email || null,
        customer_email: email || caller?.email || null,
        customer_name: name,
        callback_phone_e164: phoneE164,
        callback_phone_display: phone || null,
        callback_phone_country: phoneE164 ? "US" : null,
        callback_phone_source: "customer_entered",
        submission_channel: source,
        first_response_due_at: due.toISOString(),
        page_url: pageUrl || req.headers.get("referer")?.slice(0, 300) || null,
        browser_info: req.headers.get("user-agent")?.slice(0, 300) ?? null,
        request_id: `callback-${crypto.randomUUID()}`,
      })
      .select("id, reference_code")
      .single();
    if (insertErr || !ticket) throw new Error(`ticket insert failed: ${insertErr?.message ?? "unknown"}`);

    const adminLink = `/admin/support?ticket=${ticket.id}`;
    try {
      const { data: admins } = await svc.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        await svc.from("notifications").insert(admins.map((a: { user_id: string }) => ({
          user_id: a.user_id,
          type: "support_ticket",
          title: `📞 Call back by ${dueLabel} — ${ticket.reference_code}`,
          message: `${name}${comments ? `: ${comments}` : ""}`.slice(0, 200),
          link: adminLink,
        })));
      }
    } catch (e) {
      console.error("[schedule-callback] admin notification failed", e);
    }

    let emailed = false;
    for (const to of adminAlertEmails()) {
      try {
        await invokeTransactionalEmail({
          templateName: "generic-notice",
          recipientEmail: to,
          idempotencyKey: adminNoticeKey(`callback-admin-${ticket.id}`, to),
          templateData: {
            subject: `Call back by ${dueLabel}: ${name} (${ticket.reference_code})`,
            kicker: "Contact page · callback request",
            heading: `Call back by ${dueLabel}`,
            paragraphs: [comments || "(No comments given.)"],
            details: contactLines.map((l) => { const [label, value] = l.split(/: (.*)/s); return { label, value: value ?? "" }; }),
            ctaLabel: `Open ticket ${ticket.reference_code}`,
            ctaUrl: `https://vendibook.com${adminLink}`,
          },
        });
        emailed = true;
      } catch (e) {
        console.error("[schedule-callback] admin email failed", e);
      }
    }

    // Confirmation email only to signed-in members (guests see it on screen),
    // so a typed address can't be used to send mail to someone else.
    const confirmTo = caller?.email && (!email || email === caller.email.toLowerCase()) ? caller.email : "";
    if (confirmTo) {
      try {
        await invokeTransactionalEmail({
          templateName: "generic-notice",
          recipientEmail: confirmTo,
          idempotencyKey: `callback-confirm-${ticket.id}`,
          templateData: {
            subject: `We'll be in touch by ${dueLabel}`,
            kicker: "Vendibook support",
            heading: `Thanks, ${name.split(" ")[0]}. We're on it.`,
            paragraphs: [
              `A real person from our team will ${preferred === "email" ? "email" : preferred === "text" ? "text" : "call"} you by ${dueLabel}${bestTime ? ` (you asked for: ${bestTime})` : ""}.`,
              "Need us sooner? Call or text (866) 690-6227 any time.",
            ],
            details: [{ label: "Reference", value: ticket.reference_code }],
            footnote: "You received this because you asked Vendibook to contact you. No marketing subscription was created.",
          },
        });
      } catch (e) {
        console.error("[schedule-callback] confirmation email failed", e);
      }
    }

    return json({
      success: true,
      reference_code: ticket.reference_code,
      follow_up_by: dueLabel,
      follow_up_by_iso: due.toISOString(),
      team_open_now: openNow,
      emailed,
    });
  } catch (e) {
    console.error("[schedule-callback] error", e);
    return json({ error: "We couldn't save your request. Please call or text (866) 690-6227." }, 500);
  }
});
