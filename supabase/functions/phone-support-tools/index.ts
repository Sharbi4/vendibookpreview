// Webhook tools for the Vendibook phone support agent on +1 866 690 6227
// (owner, 2026-10-25). ElevenLabs calls these during a phone call; browsers
// never do. Every request must carry the PHONE_AGENT_TOOL_SECRET in the
// x-vendibook-tool-secret header (set on each tool in ElevenLabs).
//
// Tools (?tool=…):
// - request_live_follow_up: a caller wants a real person. Records an admin
//   support ticket with their preferred method (phone call, text, email or a
//   meeting set up by the team), notifies every admin in-app and by email, and
//   returns the reference and the follow-up deadline (2 business hours,
//   Mon–Fri 8 AM–8 PM ET, _shared/followUpWindow.ts). A text follow-up enrols
//   the number for customer-care texts only after the caller agreed to the
//   disclosure on the call, only for the number they are calling from, and
//   never over a STOP.
// - get_pricing: current platform fees and active upgrade prices.
import { createClient } from "npm:@supabase/supabase-js@2";
import { invokeTransactionalEmail } from "../_shared/invokeTransactionalEmail.ts";
import { followUpDueAt, formatEt, inFollowUpHours } from "../_shared/followUpWindow.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { normalizeNanpToE164, SMS_POLICY_VERSION } from "../_shared/smsConsent.ts";
import { adminAlertEmails, adminNoticeKey } from "../_shared/adminRecipients.ts";
import { FEE_CONFIG } from "../_shared/feeConfig.ts";

const PHONE_LINE = Deno.env.get("PHONE_LINE_NUMBER") || "+18666906227";
// Read aloud by the agent before it accepts a text follow-up; stored with the consent.
export const TEXT_DISCLOSURE =
  "Vendibook will text you about this request from 866-690-6227. Message and data rates may apply. Reply STOP to opt out or HELP for help.";

const METHODS = ["phone_call", "text", "email", "meeting"] as const;
type Method = (typeof METHODS)[number];
const METHOD_LABEL: Record<Method, string> = {
  phone_call: "Phone call back",
  text: "Text message",
  email: "Email",
  meeting: "Scheduled meeting (team to set up)",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function sameSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const svc = () =>
  createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

/** Enrols the caller's own number for customer-care texts after verbal consent. */
async function enrolTextFollowUp(db: ReturnType<typeof svc>, phone: string, conversationId: string): Promise<string | null> {
  const { data: suppressed } = await db
    .from("sms_suppressions").select("id").eq("phone_e164", phone).is("released_at", null).limit(1).maybeSingle();
  if (suppressed) return "This number replied STOP to Vendibook texts, so we cannot text it. Offer a phone call or email instead.";
  const { data: pref } = await db
    .from("sms_preferences").select("id, transactional_status").eq("phone_e164", phone).maybeSingle();
  if (pref?.transactional_status === "opted_out") {
    return "This number opted out of Vendibook texts, so we cannot text it. Offer a phone call or email instead.";
  }
  const now = new Date().toISOString();
  const disclosureHash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(TEXT_DISCLOSURE))),
  ).map((b) => b.toString(16).padStart(2, "0")).join("");
  const { error: eventErr } = await db.from("sms_consent_events").insert({
    phone_e164: phone,
    event_type: "opt_in",
    message_category: "customer_care",
    source: "support",
    disclosure_version: SMS_POLICY_VERSION,
    disclosure_text_hash: disclosureHash,
    metadata: { channel: "phone_agent", conversation_id: conversationId || null, verified_by: "inbound_caller_id", disclosure: TEXT_DISCLOSURE },
  });
  if (eventErr) throw new Error(`consent event failed: ${eventErr.message}`);
  const row = {
    phone_e164: phone,
    transactional_status: "opted_in",
    consent_source: "support",
    consent_version: SMS_POLICY_VERSION,
    opted_in_at: now,
    phone_verified_at: now,
    last_updated_at: now,
    updated_at: now,
  };
  const { error } = pref
    ? await db.from("sms_preferences").update(row).eq("id", pref.id)
    : await db.from("sms_preferences").insert(row);
  if (error) throw new Error(`sms preference failed: ${error.message}`);
  return null;
}

async function requestLiveFollowUp(body: Record<string, unknown>): Promise<Response> {
  const name = text(body.name, 80);
  const method = (METHODS as readonly string[]).includes(String(body.preferred_method)) ? (body.preferred_method as Method) : null;
  const callerId = normalizeNanpToE164(text(body.caller_id, 30));
  const spokenPhone = normalizeNanpToE164(text(body.phone, 30));
  const phone = spokenPhone ?? callerId;
  const typedEmail = text(body.email, 120).toLowerCase();
  const email = EMAIL_RE.test(typedEmail) ? typedEmail : "";
  const bestTime = text(body.best_time, 120);
  const timeZone = text(body.time_zone, 60);
  const topic = text(body.topic, 120) || "Speak with the Vendibook team";
  const summary = text(body.summary, 1500);
  const conversationId = text(body.conversation_id, 120);

  if (!name) return json({ error: "Ask for the caller's name first." }, 400);
  if (!method) return json({ error: "Ask how they want the team to reach them: a phone call, a text, an email or a meeting." }, 400);
  if ((method === "phone_call" || method === "text") && !phone) {
    return json({ error: "Ask for the best US phone number for the call back or text." }, 400);
  }
  if (method === "email" && !email) return json({ error: "Ask for their email address and spell it back to confirm." }, 400);
  if (method === "meeting" && !phone && !email) return json({ error: "Ask for a phone number or email so the team can confirm the meeting." }, 400);
  if (method === "text" && body.text_consent !== true) {
    return json({ error: `Read this to the caller and ask if that is okay: "${TEXT_DISCLOSURE}" Only continue with a text follow-up if they say yes.` }, 400);
  }
  if (method === "text" && phone !== callerId) {
    return json({ error: "We can only text the number they are calling from. Offer a phone call or email for a different number." }, 400);
  }

  const contactKey = (phone ?? email).toLowerCase();
  if (!(await checkRateLimit("phone_follow_up_contact", contactKey, 3, 24 * 60))) {
    return json({ error: "A follow-up is already on the way for this caller. Tell them the team will reach out at the time they were given." }, 429);
  }

  const db = svc();
  let textNote: string | null = null;
  if (method === "text") textNote = await enrolTextFollowUp(db, phone!, conversationId);
  if (textNote) return json({ error: textNote }, 409);

  const now = new Date();
  const due = followUpDueAt(now);
  const dueLabel = formatEt(due);
  const contactLines = [
    `Name: ${name}`,
    `Prefers: ${METHOD_LABEL[method]}`,
    phone && `Phone: ${phone}${phone === callerId ? " (calling from)" : ""}`,
    callerId && callerId !== phone && `Called from: ${callerId}`,
    email && `Email: ${email}`,
    bestTime && `Best time: ${bestTime}${timeZone ? ` (${timeZone})` : ""}`,
    method === "text" && "Text consent: agreed on the call to the Vendibook text disclosure",
  ].filter(Boolean) as string[];
  const description = [
    `Phone line follow-up by ${dueLabel} (2 business hours, Mon–Fri 8 AM–8 PM ET).`,
    "",
    summary || "(No summary given.)",
    "",
    ...contactLines,
    conversationId && `ElevenLabs conversation: ${conversationId}`,
  ].filter((l) => l !== "" || true).filter((l) => l !== null && l !== undefined && l !== false).join("\n");

  const { data: ticket, error: insertErr } = await db
    .from("support_tickets")
    .insert({
      feature_area: "other",
      category: "callback_request",
      priority: "high",
      source: "system",
      submission_channel: "phone_agent",
      title: `Phone line: ${name} — ${topic}`.slice(0, 200),
      description: description.slice(0, 5000),
      reply_email: email || null,
      customer_email: email || null,
      customer_name: name,
      callback_phone_e164: phone,
      callback_phone_source: phone ? (phone === callerId ? "caller_id" : "spoken") : null,
      first_response_due_at: due.toISOString(),
      request_id: `phone-${conversationId || crypto.randomUUID()}`,
    })
    .select("id, reference_code")
    .single();
  if (insertErr || !ticket) throw new Error(`ticket insert failed: ${insertErr?.message ?? "unknown"}`);

  const adminLink = `/admin/support?ticket=${ticket.id}`;
  try {
    const { data: admins } = await db.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await db.from("notifications").insert(
        admins.map((a: { user_id: string }) => ({
          user_id: a.user_id,
          type: "support_ticket",
          title: `📞 Phone line: ${METHOD_LABEL[method]} by ${dueLabel} — ${ticket.reference_code}`,
          message: `${name}: ${topic}`.slice(0, 200),
          link: adminLink,
        })),
      );
    }
  } catch (e) {
    console.error("[phone-support-tools] admin notification failed", e);
  }

  let emailed = false;
  for (const to of adminAlertEmails()) {
    const { error } = await invokeTransactionalEmail({
      templateName: "generic-notice",
      recipientEmail: to,
      idempotencyKey: adminNoticeKey(`phone-follow-up-${ticket.id}`, to),
      templateData: {
        subject: `Phone line: ${METHOD_LABEL[method]} by ${dueLabel} — ${name} (${ticket.reference_code})`,
        kicker: "Phone line · requested follow-up",
        heading: `${METHOD_LABEL[method]} by ${dueLabel}`,
        paragraphs: [summary || "(No summary given.)"],
        details: contactLines.map((l) => {
          const [label, value] = l.split(/: (.*)/s);
          return { label, value: value ?? "" };
        }),
        ctaLabel: `Open ticket ${ticket.reference_code}`,
        ctaUrl: `https://vendibook.com${adminLink}`,
      },
    });
    if (!error) emailed = true;
  }

  const sayThis = {
    phone_call: `A Vendibook team member will call you back from ${PHONE_LINE.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3")}`,
    text: "A Vendibook team member will text you from this number",
    email: `A Vendibook team member will email you at ${email}`,
    meeting: "A Vendibook team member will reach out to set up the meeting",
  }[method];
  return json({
    reference_code: ticket.reference_code,
    follow_up_by: dueLabel,
    team_open_now: inFollowUpHours(now),
    emailed,
    say_this: `${sayThis} by ${dueLabel} Eastern. Your reference is ${ticket.reference_code}.`,
  });
}

async function getPricing(): Promise<Response> {
  const { data, error } = await svc()
    .from("monetization_products")
    .select("slug, name, price_cents, is_active")
    .eq("is_active", true)
    .in("slug", ["vendibook_pro", "vendibook_pro_annual", "featured_listing_monthly", "boost-featured-30", "pro_listing_30", "tool_pricepilot", "listing_rewrite", "permit_path_plus_monthly"]);
  const monthly = new Set(["vendibook_pro", "permit_path_plus_monthly", "featured_listing_monthly"]);
  return json({
    listing: "Free to list. No listing fee.",
    equipment_sales: `Sellers pay a ${FEE_CONFIG.saleSellerFeePct}% commission on new online equipment sales, the same for Free and Pro. Buyers pay no Vendibook platform fee.`,
    rentals: `Renters pay a ${FEE_CONFIG.rentalRenterFeePct}% service fee and hosts pay a ${FEE_CONFIG.rentalHostFeePct}% commission, the same for Free and Pro. Rentals are paid by card through Square.`,
    optional_upgrades: error
      ? []
      : (data ?? []).map((p: { slug: string; name: string; price_cents: number }) => ({
          name: p.name,
          price: `$${(Number(p.price_cents) / 100).toFixed(2)}${p.slug === "vendibook_pro_annual" ? " per year" : monthly.has(p.slug) ? " per month" : ""}`,
        })),
    catalog_status: error ? "unavailable" : "loaded",
    note: error
      ? "Current upgrade prices could not be loaded. Do not quote remembered prices; point them to vendibook.com/pricing."
      : "Only active upgrades are listed; tax is shown at checkout. Upgrades are optional.",
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("PHONE_AGENT_TOOL_SECRET") ?? "";
  if (!sameSecret(req.headers.get("x-vendibook-tool-secret") ?? "", secret)) return json({ error: "Forbidden" }, 403);

  try {
    const tool = new URL(req.url).searchParams.get("tool");
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (tool === "request_live_follow_up") return await requestLiveFollowUp(body);
    if (tool === "get_pricing") return await getPricing();
    return json({ error: "Unknown tool" }, 404);
  } catch (e) {
    console.error("[phone-support-tools] error", e);
    return json({ error: "Could not complete that. Offer to take a message for support@vendibook.com." }, 500);
  }
});
