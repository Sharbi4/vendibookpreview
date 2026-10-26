// Webhook tools for the Vendibook phone support agent on +1 866 690 6227
// (owner, 2026-10-25). ElevenLabs calls these during a phone call; browsers
// never do. Every request must carry the tool secret (_shared/phoneLine.ts)
// in the x-vendibook-tool-secret header, set on each tool in ElevenLabs from
// the PHONE_AGENT_TOOL_SECRET workspace secret.
//
// Tools (?tool=…):
// - save_caller_details: called as soon as the caller gives their first and
//   last name and a good call-back number (email optional), so a dropped call
//   still leaves an Admin → Support ticket to call them back from.
// - request_live_follow_up: a caller wants a real person. Records an admin
//   support ticket with their preferred method (phone call, text, email or a
//   meeting set up by the team), notifies every admin in-app and by email, and
//   returns the reference and the follow-up deadline (2 business hours,
//   Mon–Fri 8 AM–8 PM ET, _shared/followUpWindow.ts). A text follow-up enrols
//   the number for customer-care texts only after the caller agreed to the
//   disclosure on the call, only for the number they are calling from, and
//   never over a STOP.
// - get_pricing: current platform fees and active upgrade prices.
// - start_account_verification / check_account_code: a caller with an
//   account proves it with a 6-digit code sent to the account's phone or
//   email on file (never trusted from caller ID alone). The reply is the same
//   whether or not an account matched, so the line can't be used to probe.
// - get_my_account_summary: after verification only, a short status of the
//   caller's own bookings, orders, listings and support tickets. No addresses,
//   card details or the other party's contact information.
import { createClient } from "npm:@supabase/supabase-js@2";
import { invokeTransactionalEmail } from "../_shared/invokeTransactionalEmail.ts";
import { followUpDueAt, formatEt, inFollowUpHours } from "../_shared/followUpWindow.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { normalizeNanpToE164, SMS_POLICY_VERSION } from "../_shared/smsConsent.ts";
import { phoneToolSecret } from "../_shared/phoneLine.ts";
import { sendGuardedSms } from "../_shared/smsGuard.ts";
import { maskContactDetails } from "../_shared/contactPatterns.ts";
import { adminAlertEmails, adminNoticeKey } from "../_shared/adminRecipients.ts";
import { FEE_CONFIG } from "../_shared/feeConfig.ts";

const PHONE_LINE = Deno.env.get("PHONE_LINE_NUMBER") || "+18666906227";
// Read aloud by the agent before it accepts a text follow-up; stored with the consent.
const TEXT_DISCLOSURE =
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

const CODE_TTL_MS = 10 * 60 * 1000;
const VERIFIED_FOR_MS = 2 * 60 * 60 * 1000;
const lastTen = (raw: string | null | undefined) => String(raw ?? "").replace(/\D/g, "").slice(-10);

async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The account this call has verified with a code, if any. */
async function verifiedAccount(db: ReturnType<typeof svc>, conversationId: string): Promise<string | null> {
  if (!conversationId) return null;
  const { data } = await db.from("phone_agent_verifications").select("user_id, verified_at")
    .eq("conversation_id", conversationId).not("verified_at", "is", null)
    .order("verified_at", { ascending: false }).limit(1).maybeSingle();
  if (!data || Date.now() - new Date(data.verified_at).getTime() > VERIFIED_FOR_MS) return null;
  return data.user_id;
}

const SAME_REPLY = "If that matches a Vendibook account, a 6-digit code is on its way. Ask the caller to read it back when it arrives.";

async function startAccountVerification(body: Record<string, unknown>): Promise<Response> {
  const conversationId = text(body.conversation_id, 120);
  const channel = body.channel === "email" ? "email" : "text";
  const callerId = normalizeNanpToE164(text(body.caller_id, 30));
  const typedEmail = text(body.email, 120).toLowerCase();
  const email = EMAIL_RE.test(typedEmail) ? typedEmail : "";
  if (!conversationId) return json({ error: "Missing conversation reference." }, 400);
  if (!email && !callerId) return json({ error: "Ask for the email address on their Vendibook account." }, 400);
  if (!(await checkRateLimit("phone_account_code", conversationId, 3, 60))) {
    return json({ error: "Several codes were already sent on this call. Offer a follow-up from the team instead." }, 429);
  }

  const db = svc();
  // Match by the email they give, otherwise by the number they are calling from.
  let account: { id: string; email: string | null; phone_number: string | null; first_name: string | null } | null = null;
  if (email) {
    const { data } = await db.from("profiles").select("id, email, phone_number, first_name").ilike("email", email).limit(2);
    if (data?.length === 1) account = data[0];
  } else {
    const { data } = await db.from("profiles").select("id, email, phone_number, first_name")
      .ilike("phone_number", `%${lastTen(callerId).slice(-4)}`).limit(25);
    const matches = (data ?? []).filter((p) => lastTen(p.phone_number) === lastTen(callerId));
    if (matches.length === 1) account = matches[0];
  }
  if (!account) return json({ sent: false, say_this: SAME_REPLY });

  const phoneOnFile = normalizeNanpToE164(account.phone_number);
  const destination = channel === "text" ? phoneOnFile : (account.email ?? "").toLowerCase();
  if (!destination) {
    return json({ sent: false, say_this: SAME_REPLY, hint: channel === "text" ? "Offer the email option instead." : "Offer the text option instead." });
  }

  let random: number;
  do { random = crypto.getRandomValues(new Uint32Array(1))[0]; } while (random >= 4294000000);
  const code = String(random % 1000000).padStart(6, "0");
  const { error: insertErr } = await db.from("phone_agent_verifications").insert({
    conversation_id: conversationId,
    user_id: account.id,
    channel,
    code_hash: await sha256(`${conversationId}:${account.id}:${code}`),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (insertErr) throw new Error(`verification insert failed: ${insertErr.message}`);

  if (channel === "text") {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    const twilioKey = Deno.env.get("TWILIO_API_KEY") ?? "";
    const from = Deno.env.get("TWILIO_FROM_NUMBER") || PHONE_LINE;
    const { data: suppressed } = await db.from("sms_suppressions").select("id").eq("phone_e164", destination).is("released_at", null).limit(1).maybeSingle();
    if (!suppressed && lovableKey && twilioKey) {
      await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": twilioKey, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          To: destination,
          From: from,
          Body: `Vendibook: Your phone support verification code is ${code}. It expires in 10 minutes. Only read it to the Vendibook assistant on your current call. Reply STOP to opt out.`,
        }),
        signal: AbortSignal.timeout(15000),
      }).catch((e) => console.error("[phone-support-tools] code text failed", e));
    }
  } else {
    await invokeTransactionalEmail({
      templateName: "generic-notice",
      recipientEmail: destination,
      idempotencyKey: `phone-verify-${conversationId}-${code}`,
      templateData: {
        subject: "Your Vendibook phone support code",
        kicker: "Phone support",
        heading: `Your code is ${code}`,
        paragraphs: [
          "Read this code to the Vendibook assistant on your current call to confirm it's you. It expires in 10 minutes.",
          "If you are not on a call with Vendibook, ignore this email. Your account has not changed.",
        ],
      },
    });
  }
  return json({ sent: true, say_this: SAME_REPLY });
}

async function checkAccountCode(body: Record<string, unknown>): Promise<Response> {
  const conversationId = text(body.conversation_id, 120);
  const code = text(body.code, 12).replace(/\D/g, "");
  if (!conversationId || code.length !== 6) return json({ error: "Ask the caller to read the 6-digit code." }, 400);
  const db = svc();
  const { data: challenge } = await db.from("phone_agent_verifications").select("id, user_id, attempts, expires_at, verified_at, code_hash")
    .eq("conversation_id", conversationId).is("verified_at", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!challenge || new Date(challenge.expires_at).getTime() < Date.now() || challenge.attempts >= 5) {
    return json({ verified: false, say_this: "That code has expired or used up its tries. Offer to send a new one." });
  }
  await db.from("phone_agent_verifications").update({ attempts: challenge.attempts + 1 }).eq("id", challenge.id);
  if (!sameSecret(await sha256(`${conversationId}:${challenge.user_id}:${code}`), challenge.code_hash)) {
    return json({ verified: false, say_this: "That code doesn't match. Ask them to read it again slowly." });
  }
  await db.from("phone_agent_verifications").update({ verified_at: new Date().toISOString() }).eq("id", challenge.id);
  const { data: profile } = await db.from("profiles").select("first_name").eq("id", challenge.user_id).maybeSingle();
  // Link this call's ticket to the account.
  await db.from("support_tickets").update({ user_id: challenge.user_id }).eq("request_id", ticketKey(conversationId)).is("user_id", null);
  return json({ verified: true, first_name: profile?.first_name ?? null });
}

async function getMyAccountSummary(body: Record<string, unknown>): Promise<Response> {
  const conversationId = text(body.conversation_id, 120);
  const db = svc();
  const userId = await verifiedAccount(db, conversationId);
  if (!userId) return json({ error: "Verify the caller's account with a code first." }, 403);
  const [bookings, hosting, purchases, sales, listings, tickets] = await Promise.all([
    db.from("booking_requests").select("start_date, end_date, status, payment_status, listing:listings(title)")
      .eq("shopper_id", userId).order("created_at", { ascending: false }).limit(5),
    db.from("booking_requests").select("start_date, end_date, status, payment_status, listing:listings(title)")
      .eq("host_id", userId).order("created_at", { ascending: false }).limit(5),
    db.from("sale_transactions").select("status, created_at, listing:listings(title)")
      .eq("buyer_id", userId).order("created_at", { ascending: false }).limit(5),
    db.from("sale_transactions").select("status, created_at, listing:listings(title)")
      .eq("seller_id", userId).order("created_at", { ascending: false }).limit(5),
    db.from("listings").select("title, status, mode").eq("host_id", userId).is("deleted_at", null)
      .order("updated_at", { ascending: false }).limit(10),
    db.from("support_tickets").select("reference_code, title, status, created_at, request_id").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(6),
  ]);
  const titleOf = (r: { listing?: { title?: string } | { title?: string }[] | null }) =>
    (Array.isArray(r.listing) ? r.listing[0]?.title : r.listing?.title) ?? "a listing";
  return json({
    rentals_as_renter: (bookings.data ?? []).map((b) => ({ listing: titleOf(b), dates: `${b.start_date} to ${b.end_date}`, status: b.status, payment: b.payment_status })),
    rentals_as_host: (hosting.data ?? []).map((b) => ({ listing: titleOf(b), dates: `${b.start_date} to ${b.end_date}`, status: b.status, payment: b.payment_status })),
    purchases: (purchases.data ?? []).map((t) => ({ listing: titleOf(t), status: t.status })),
    sales: (sales.data ?? []).map((t) => ({ listing: titleOf(t), status: t.status })),
    listings: (listings.data ?? []).map((l) => ({ title: l.title, status: l.status, type: l.mode })),
    support_tickets: (tickets.data ?? []).filter((t) => t.request_id !== ticketKey(conversationId)).slice(0, 5)
      .map((t) => ({ reference: t.reference_code, title: t.title, status: t.status })),
    note: "Share only what the caller asks about. You cannot change bookings, payments, refunds or payouts; offer a follow-up from the team for any change.",
  });
}

const ticketKey = (conversationId: string) => (conversationId ? `phone-${conversationId}` : "");

/** The ticket this call already opened, if any. */
async function callTicket(db: ReturnType<typeof svc>, conversationId: string) {
  const key = ticketKey(conversationId);
  if (!key) return null;
  const { data } = await db.from("support_tickets").select("id, reference_code, customer_name, callback_phone_e164, customer_email")
    .eq("request_id", key).maybeSingle();
  return data;
}

async function saveCallerDetails(body: Record<string, unknown>): Promise<Response> {
  const first = text(body.first_name, 40);
  const last = text(body.last_name, 40);
  const callerId = normalizeNanpToE164(text(body.caller_id, 30));
  const phone = normalizeNanpToE164(text(body.callback_phone, 30)) ?? callerId;
  const typedEmail = text(body.email, 120).toLowerCase();
  const email = EMAIL_RE.test(typedEmail) ? typedEmail : "";
  const conversationId = text(body.conversation_id, 120);
  if (!first || !last) return json({ error: "Ask for the caller's first and last name." }, 400);
  if (!phone) return json({ error: "Ask for a good US call-back number in case the call drops." }, 400);
  if (typedEmail && !email) return json({ error: "That email doesn't look complete. Spell it back to the caller and try again." }, 400);
  if (!conversationId) return json({ error: "Missing conversation reference." }, 400);

  const db = svc();
  const name = `${first} ${last}`;
  const details = {
    customer_name: name,
    callback_phone_e164: phone,
    callback_phone_source: phone === callerId ? "caller_id" : "spoken",
    ...(email ? { customer_email: email, reply_email: email } : {}),
  };
  const userId = await verifiedAccount(db, conversationId);
  if (userId) Object.assign(details, { user_id: userId });
  const existing = await callTicket(db, conversationId);
  if (existing) {
    const { error } = await db.from("support_tickets").update(details).eq("id", existing.id);
    if (error) throw new Error(`ticket update failed: ${error.message}`);
    return json({ saved: true, reference_code: existing.reference_code });
  }
  const { data: ticket, error } = await db.from("support_tickets").insert({
    ...details,
    feature_area: "other",
    category: "callback_request",
    priority: "normal",
    source: "system",
    submission_channel: "phone_agent",
    title: `Phone line call: ${name}`.slice(0, 200),
    description: [
      "Caller details saved at the start of a phone line call. If no follow-up was requested, the call may have dropped: call them back.",
      "",
      `Name: ${name}`,
      `Call-back number: ${phone}${phone === callerId ? " (calling from)" : ""}`,
      callerId && callerId !== phone ? `Called from: ${callerId}` : null,
      email ? `Email: ${email}` : null,
      `ElevenLabs conversation: ${conversationId}`,
    ].filter((l) => l !== null).join("\n"),
    request_id: ticketKey(conversationId),
  }).select("reference_code").single();
  if (error || !ticket) throw new Error(`ticket insert failed: ${error?.message ?? "unknown"}`);
  return json({ saved: true, reference_code: ticket.reference_code });
}

async function requestLiveFollowUp(body: Record<string, unknown>): Promise<Response> {
  const conversationId = text(body.conversation_id, 120);
  const db = svc();
  const saved = await callTicket(db, conversationId);
  const name = text([body.first_name, body.last_name].filter((v) => typeof v === "string" && v.trim()).join(" "), 80)
    || text(body.name, 80) || saved?.customer_name || "";
  const method = (METHODS as readonly string[]).includes(String(body.preferred_method)) ? (body.preferred_method as Method) : null;
  const callerId = normalizeNanpToE164(text(body.caller_id, 30));
  const spokenPhone = normalizeNanpToE164(text(body.phone, 30));
  const phone = spokenPhone ?? saved?.callback_phone_e164 ?? callerId;
  const typedEmail = text(body.email, 120).toLowerCase();
  const email = EMAIL_RE.test(typedEmail) ? typedEmail : saved?.customer_email ?? "";
  const bestTime = text(body.best_time, 120);
  const timeZone = text(body.time_zone, 60);
  const topic = text(body.topic, 120) || "Speak with the Vendibook team";
  const summary = text(body.summary, 1500);

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
  ].filter((l) => l !== null && l !== undefined && l !== false).join("\n");

  // The call's saved-details ticket becomes the follow-up; otherwise open one.
  const followUp = {
    priority: "high",
    title: `Phone line: ${name} — ${topic}`.slice(0, 200),
    description: description.slice(0, 5000),
    reply_email: email || null,
    customer_email: email || null,
    customer_name: name,
    callback_phone_e164: phone,
    callback_phone_source: phone ? (phone === callerId ? "caller_id" : "spoken") : null,
    first_response_due_at: due.toISOString(),
    ...(await verifiedAccount(db, conversationId).then((id) => (id ? { user_id: id } : {}))),
  };
  const { data: ticket, error: insertErr } = saved
    ? await db.from("support_tickets").update(followUp).eq("id", saved.id).select("id, reference_code").single()
    : await db.from("support_tickets").insert({
        ...followUp,
        feature_area: "other",
        category: "callback_request",
        source: "system",
        submission_channel: "phone_agent",
        request_id: ticketKey(conversationId) || `phone-${crypto.randomUUID()}`,
      }).select("id, reference_code").single();
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

// ---- Listings: search, details, links, seller messages and new drafts ----

const SITE = "https://vendibook.com";
const CATEGORIES = ["food_truck", "food_trailer", "ghost_kitchen", "vendor_lot", "vendor_space"] as const;
const CATEGORY_LABEL: Record<string, string> = {
  food_truck: "food truck", food_trailer: "food trailer", ghost_kitchen: "shared or ghost kitchen",
  vendor_lot: "vendor lot", vendor_space: "vendor space",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const money = (v: unknown) => (Number(v) > 0 ? `$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : null);

type ListingRow = Record<string, unknown>;
function priceLine(l: ListingRow): string {
  if (l.mode === "sale") return money(l.price_sale) ? `${money(l.price_sale)} to buy` : "price on request";
  const parts = [
    money(l.price_daily) && `${money(l.price_daily)} a day`,
    money(l.price_weekly) && `${money(l.price_weekly)} a week`,
    money(l.price_monthly) && `${money(l.price_monthly)} a month`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "price on request";
}
const place = (l: ListingRow) => [l.city, l.state].filter(Boolean).join(", ") || "location on request";

/** Public listings through the same search the website uses (canonical visibility filters included). */
async function searchListings(body: Record<string, unknown>): Promise<Response> {
  const category = (CATEGORIES as readonly string[]).includes(String(body.category)) ? String(body.category) : undefined;
  const mode = body.mode === "rent" || body.mode === "sale" ? body.mode : undefined;
  const maxPrice = Number(body.max_price) > 0 ? Number(body.max_price) : undefined;
  const location = text(body.location, 120);
  const query = text(body.query, 120);
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/search-listings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}`,
    },
    body: JSON.stringify({
      query: query || undefined, category, mode, max_price: maxPrice,
      location_text: location || undefined, instant_book_only: body.instant_book_only === true || undefined,
      page: 1, page_size: 12,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return json({ error: "Listing search is unavailable right now. Offer to text or email them a link to vendibook.com/search." }, 502);
  const data = await res.json().catch(() => ({}));
  // Featured listings are pinned first on every search, even outside the
  // searched area (owner, 2026-10-26). On a call, local results come first and
  // featured listings from elsewhere follow, labelled as such.
  const radius = Number(data?.search_meta?.effective_radius_miles);
  const inArea = (l: ListingRow) =>
    !location || l.location_text_match === true || !Number.isFinite(radius) ||
    (l.distance_miles != null && Number(l.distance_miles) <= radius);
  const all = (data?.listings ?? []) as ListingRow[];
  const rows = [...all.filter(inArea), ...all.filter((l) => !inArea(l))].slice(0, 5);
  const nowIso = new Date().toISOString();
  return json({
    total_found: Number(data?.total_count ?? rows.length),
    listings: rows.map((l) => ({
      listing_id: l.id,
      title: maskContactDetails(String(l.title ?? "Listing")),
      type: CATEGORY_LABEL[String(l.category)] ?? l.category,
      for: l.mode === "sale" ? "sale" : "rent",
      price: priceLine(l),
      location: place(l),
      miles_away: Number.isFinite(Number(l.distance_miles)) ? Math.round(Number(l.distance_miles)) : null,
      instant_book: l.mode === "rent" ? l.instant_book === true : undefined,
      featured: !!(l.featured_enabled && String(l.featured_expires_at ?? "") > nowIso),
      outside_search_area: !inArea(l) || undefined,
    })),
    note: rows.length
      ? "Read at most three at a time: title, price and city. Local results come first. A result marked outside_search_area is a featured listing from another area: say so (\"a featured listing in Dallas\") rather than implying it's nearby. Keep listing_id to look one up, text or email links, or message the seller. Never read listing IDs aloud."
      : "Nothing matched. Offer to widen the area or price, or to save the request so the team can source one (request_live_follow_up).",
  });
}

const DETAIL_COLUMNS =
  "id, title, description, category, mode, status, deleted_at, city, state, condition, price_daily, price_weekly, price_monthly, price_sale, deposit_amount, rental_min_days, instant_book, fulfillment_type, delivery_fee, delivery_radius_miles, highlights, amenities, length_inches, width_inches, weight_lbs";

async function loadPublicListing(db: ReturnType<typeof svc>, id: string) {
  if (!UUID.test(id)) return null;
  const { data } = await db.from("listings").select(DETAIL_COLUMNS).eq("id", id).maybeSingle();
  if (!data || data.status !== "published" || data.deleted_at) return null;
  return data as ListingRow;
}

async function getListing(body: Record<string, unknown>): Promise<Response> {
  const listing = await loadPublicListing(svc(), text(body.listing_id, 40));
  if (!listing) return json({ error: "That listing isn't available any more. Offer to search again." }, 404);
  const feet = (inches: unknown) => (Number(inches) > 0 ? `${Math.round(Number(inches) / 12)} ft` : null);
  return json({
    listing_id: listing.id,
    title: maskContactDetails(String(listing.title ?? "")),
    type: CATEGORY_LABEL[String(listing.category)] ?? listing.category,
    for: listing.mode === "sale" ? "sale" : "rent",
    price: priceLine(listing),
    security_deposit: listing.mode === "rent" ? money(listing.deposit_amount) : undefined,
    minimum_rental_days: listing.mode === "rent" ? listing.rental_min_days ?? null : undefined,
    instant_book: listing.mode === "rent" ? listing.instant_book === true : undefined,
    location: place(listing),
    condition: listing.condition ?? "not stated by the seller",
    size: [feet(listing.length_inches) && `${feet(listing.length_inches)} long`, feet(listing.width_inches) && `${feet(listing.width_inches)} wide`].filter(Boolean).join(", ") || null,
    pickup_or_delivery: listing.fulfillment_type ?? null,
    highlights: Array.isArray(listing.highlights) ? (listing.highlights as string[]).slice(0, 6) : [],
    equipment: Array.isArray(listing.amenities) ? (listing.amenities as string[]).slice(0, 12) : [],
    description: maskContactDetails(String(listing.description ?? "")).slice(0, 900),
    note: "Only state what is listed here. Equipment listed is what the seller says; it is not a health or fire approval. Booking, buying and payment happen on the website: offer to text or email the link. Never share or ask for the seller's contact details; offer message_seller instead.",
  });
}

async function sendListingLinks(body: Record<string, unknown>): Promise<Response> {
  const conversationId = text(body.conversation_id, 120);
  const method = body.method === "email" ? "email" : body.method === "text" ? "text" : null;
  const ids = (Array.isArray(body.listing_ids) ? body.listing_ids : [body.listing_id]).map((v) => text(v, 40)).filter((v) => UUID.test(v)).slice(0, 5);
  if (!conversationId) return json({ error: "Missing conversation reference." }, 400);
  if (!method) return json({ error: "Ask whether they want the links by text or by email." }, 400);
  if (!(await checkRateLimit("phone_listing_links", conversationId, 4, 60))) {
    return json({ error: "Several links were already sent on this call. Tell them to check their messages." }, 429);
  }
  const db = svc();
  const listings = (await Promise.all(ids.map((id) => loadPublicListing(db, id)))).filter(Boolean) as ListingRow[];
  const extraPage = body.include_listing_start === true ? `${SITE}/list` : null;
  if (!listings.length && !extraPage) return json({ error: "Those listings aren't available. Search again first." }, 404);
  const lines = listings.map((l) => `${maskContactDetails(String(l.title))} (${priceLine(l)}, ${place(l)}): ${SITE}/listing/${l.id}`);
  if (extraPage) lines.push(`List your equipment for free: ${extraPage}`);

  if (method === "text") {
    const callerId = normalizeNanpToE164(text(body.caller_id, 30));
    if (!callerId) return json({ error: "We can only text the number they're calling from, and it isn't available. Offer email." }, 400);
    if (body.text_consent !== true) {
      return json({ error: `Read this to the caller and ask if that is okay: "${TEXT_DISCLOSURE}" Only text the links if they say yes.` }, 400);
    }
    const blocked = await enrolTextFollowUp(db, callerId, conversationId);
    if (blocked) return json({ error: blocked }, 409);
    const result = await sendGuardedSms({
      recipientPhone: callerId,
      category: "customer_care",
      templateId: "phone_listing_links",
      businessPurpose: `phone_call:${conversationId}`,
      body: `Vendibook: here are the links from your call.\n${lines.join("\n")}\nReply STOP to opt out.`.slice(0, 1500),
      idempotencyKey: `phone-links-${conversationId}-${ids.join(",")}`.slice(0, 80),
    });
    if (!result.ok) return json({ error: "The text couldn't be sent. Offer to email the links instead." }, 502);
    return json({ sent: true, say_this: "I just texted you the links from 866-690-6227." });
  }

  const typedEmail = text(body.email, 120).toLowerCase();
  const email = EMAIL_RE.test(typedEmail) ? typedEmail : (await callTicket(db, conversationId))?.customer_email ?? "";
  if (!email) return json({ error: "Ask for their email address and spell it back to confirm." }, 400);
  const { error } = await invokeTransactionalEmail({
    templateName: "generic-notice",
    recipientEmail: email,
    idempotencyKey: `phone-links-${conversationId}-${await sha256(`${email}:${ids.join(",")}:${extraPage ?? ""}`)}`,
    templateData: {
      subject: "Your Vendibook links from today's call",
      kicker: "Vendibook phone support",
      heading: "The links you asked for",
      paragraphs: ["Thanks for calling Vendibook. Here are the links from your call. Booking, buying and listing all happen securely on vendibook.com.", ...lines],
      ctaLabel: listings.length ? "Open the first listing" : "Start your listing",
      ctaUrl: listings.length ? `${SITE}/listing/${listings[0].id}` : extraPage!,
      footnote: "You received this because you asked for it on a call with Vendibook. No marketing subscription was created.",
    },
  });
  if (error) return json({ error: "The email couldn't be sent. Offer a text instead." }, 502);
  return json({ sent: true, say_this: `I just emailed the links to ${email}.` });
}

/** A reviewed message to a seller, through the same managed relay as website guest inquiries. */
async function messageSeller(body: Record<string, unknown>): Promise<Response> {
  const conversationId = text(body.conversation_id, 120);
  const db = svc();
  const saved = await callTicket(db, conversationId);
  const name = text(body.name, 80) || saved?.customer_name || "";
  const typedEmail = text(body.email, 120).toLowerCase();
  const email = EMAIL_RE.test(typedEmail) ? typedEmail : saved?.customer_email ?? "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const listingId = text(body.listing_id, 40);
  if (!conversationId) return json({ error: "Missing conversation reference." }, 400);
  if (!name) return json({ error: "Ask for the caller's first and last name first." }, 400);
  if (!email) return json({ error: "A seller message needs their email so they can read the reply. Ask for it and spell it back." }, 400);
  if (!message) return json({ error: "Help them word the message, then read it back exactly." }, 400);
  if (body.caller_confirmed_exact_message !== true) {
    return json({ error: "Read the exact message back to the caller and ask 'Shall I send that?' Only continue if they say yes." }, 400);
  }
  if (!(await loadPublicListing(db, listingId))) return json({ error: "That listing isn't available any more. Offer to search again." }, 404);

  const access = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
  const key = await sha256(`phone-inquiry:${conversationId}:${listingId}`);
  const requestKey = `${key.slice(0, 8)}-${key.slice(8, 12)}-4${key.slice(13, 16)}-a${key.slice(17, 20)}-${key.slice(20, 32)}`;
  const { data: inquiryId, error } = await db.rpc("create_managed_inquiry", {
    p_listing: listingId,
    p_email: email,
    p_name: name,
    p_body: message,
    p_token_hash: await sha256(access),
    p_request: requestKey,
    p_ip_hash: await sha256(`phone-line:${normalizeNanpToE164(text(body.caller_id, 30)) ?? conversationId}`),
  });
  if (error || !inquiryId) {
    const why = String(error?.message ?? "");
    if (/already saved/i.test(why)) return json({ sent: true, say_this: "That message is already with our team. Check your email for your private conversation link." });
    if (/wait/i.test(why)) return json({ error: "A couple of messages were just sent from this email. Ask them to try again in an hour, or offer a team follow-up." }, 429);
    throw new Error(`managed inquiry failed: ${why}`);
  }
  const sent = await invokeTransactionalEmail({
    templateName: "generic-notice",
    recipientEmail: email,
    idempotencyKey: `managed-access:${inquiryId}`,
    templateData: {
      kicker: "Your private conversation",
      heading: "Confirm your email for your listing inquiry",
      paragraphs: [
        "Open your secure conversation to verify your email. Vendibook reviews every message before relaying it. The seller is notified only after an approved message is sent.",
        "Neither participant receives the other’s email or phone number.",
      ],
      ctaLabel: "Open my conversation",
      ctaUrl: `${SITE}/inquiries/${inquiryId}#access=${access}`,
      footnote: "This private link expires in seven days. Do not forward it. No marketing subscription was created.",
    },
  });
  return json({
    sent: true,
    email_sent: !sent.error,
    say_this: `Done. I emailed you a private link at ${email}. Open it to confirm your email. Our team reviews every message before it goes to the seller, and replies come back to that same private conversation. Your phone and email are never shared with the seller.`,
  });
}

// Ties a phone-started draft to its call: only that call can send its finish link.
const draftKey = (conversationId: string) => `phone:${conversationId}`.slice(0, 80);

/**
 * Starts a listing from the call. A caller verified with a code gets a draft
 * on their own account; anyone else gets a guest draft and a private link to
 * finish it. Photos and Publish always stay with the seller on the website.
 */
async function startListingDraft(body: Record<string, unknown>): Promise<Response> {
  const conversationId = text(body.conversation_id, 120);
  const category = (CATEGORIES as readonly string[]).includes(String(body.category)) ? String(body.category) : null;
  const mode = body.mode === "rent" || body.mode === "sale" ? body.mode : null;
  const title = text(body.title, 120);
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 4000) : "";
  const city = text(body.city, 80);
  const state = text(body.state, 30);
  if (!conversationId) return json({ error: "Missing conversation reference." }, 400);
  if (!category || !mode) return json({ error: "Ask what they're listing (food truck, food trailer, shared kitchen, vendor lot or vendor space) and whether it's for rent or for sale." }, 400);
  if (!title || !city || !state) return json({ error: "Ask for a short title and the city and state where it's located." }, 400);
  if (!(await checkRateLimit("phone_listing_draft", conversationId, 2, 60))) {
    return json({ error: "A draft was already started on this call. Send them the link to finish it." }, 429);
  }
  const price = (v: unknown) => (Number(v) > 0 && Number(v) < 10_000_000 ? Math.round(Number(v) * 100) / 100 : null);
  const db = svc();
  const userId = await verifiedAccount(db, conversationId);
  const sessionKey = draftKey(conversationId);
  const { data: existing } = await db.from("listings").select("id, host_id, guest_draft_token")
    .eq("creation_session_key", sessionKey).eq("status", "draft").limit(1).maybeSingle();
  if (existing) {
    return json({ created: false, listing_id: existing.id, on_account: !!existing.host_id, next: "A draft was already started on this call. Offer to text or email the finish link with send_listing_draft_link." });
  }
  const guestToken = userId ? null : crypto.randomUUID();
  const { data, error } = await db.from("listings").insert({
    creation_session_key: sessionKey,
    title,
    description: description || `${title} in ${city}, ${state}. Details to be added by the seller.`,
    category,
    mode,
    city,
    state,
    status: "draft",
    fulfillment_type: "pickup",
    host_id: userId,
    guest_draft_token: guestToken,
    price_daily: mode === "rent" ? price(body.price_daily) : null,
    price_weekly: mode === "rent" ? price(body.price_weekly) : null,
    price_monthly: mode === "rent" ? price(body.price_monthly) : null,
    deposit_amount: mode === "rent" ? price(body.deposit_amount) : null,
    price_sale: mode === "sale" ? price(body.price_sale) : null,
    condition: ["new", "like_new", "good", "fair", "needs_work"].includes(String(body.condition)) ? String(body.condition) : null,
    amenities: Array.isArray(body.equipment) ? body.equipment.map((v) => text(v, 60)).filter(Boolean).slice(0, 30) : null,
  }).select("id").single();
  if (error || !data) {
    if (/verify your mobile number/i.test(String(error?.message))) {
      return json({ error: "Their account needs its mobile number verified before it can list. Ask them to sign in at vendibook.com and verify their phone, or offer a team follow-up." }, 409);
    }
    throw new Error(`listing draft failed: ${error?.message ?? "unknown"}`);
  }
  const link = userId ? `${SITE}/create-listing/${data.id}` : `${SITE}/create-listing/${data.id}#draft=${guestToken}`;
  return json({
    created: true,
    listing_id: data.id,
    on_account: !!userId,
    finish_link: link,
    next: "Offer to text or email the finish link with send_listing_draft_link. Explain that they add photos, check the details and press Publish themselves; nothing goes live until they do.",
  });
}

async function sendListingDraftLink(body: Record<string, unknown>): Promise<Response> {
  const conversationId = text(body.conversation_id, 120);
  const listingId = text(body.listing_id, 40);
  const db = svc();
  if (!UUID.test(listingId)) return json({ error: "Start the listing draft first." }, 400);
  const { data: draft } = await db.from("listings").select("id, title, status, host_id, guest_draft_token, creation_session_key").eq("id", listingId).maybeSingle();
  if (!draft || draft.status !== "draft") return json({ error: "That draft isn't available. Start a new one." }, 404);
  if (!conversationId) return json({ error: "Missing conversation reference." }, 400);
  if (!(await checkRateLimit("phone_listing_draft_owner", `${conversationId}:${listingId}`, 3, 60))) {
    return json({ error: "That link was already sent. Ask them to check their messages." }, 429);
  }
  if (draft.creation_session_key !== draftKey(conversationId)) return json({ error: "That draft wasn't started on this call." }, 403);
  const link = draft.host_id ? `${SITE}/create-listing/${draft.id}` : `${SITE}/create-listing/${draft.id}#draft=${draft.guest_draft_token}`;
  const line = `Finish your listing "${maskContactDetails(String(draft.title))}": add photos, check the details and press Publish: ${link}`;
  if (body.method === "text") {
    const callerId = normalizeNanpToE164(text(body.caller_id, 30));
    if (!callerId) return json({ error: "We can only text the number they're calling from. Offer email." }, 400);
    if (body.text_consent !== true) {
      return json({ error: `Read this to the caller and ask if that is okay: "${TEXT_DISCLOSURE}" Only text the link if they say yes.` }, 400);
    }
    const blocked = await enrolTextFollowUp(db, callerId, conversationId);
    if (blocked) return json({ error: blocked }, 409);
    const result = await sendGuardedSms({
      recipientPhone: callerId, category: "customer_care", templateId: "phone_listing_draft_link",
      businessPurpose: `phone_call:${conversationId}`, body: `Vendibook: ${line} The link is private, so don't share it. Reply STOP to opt out.`,
      idempotencyKey: `phone-draft-${draft.id}`.slice(0, 80),
    });
    if (!result.ok) return json({ error: "The text couldn't be sent. Offer email instead." }, 502);
    return json({ sent: true, say_this: "I just texted you a private link to finish your listing." });
  }
  const typedEmail = text(body.email, 120).toLowerCase();
  const email = EMAIL_RE.test(typedEmail) ? typedEmail : (await callTicket(db, conversationId))?.customer_email ?? "";
  if (!email) return json({ error: "Ask for their email address and spell it back to confirm." }, 400);
  const { error } = await invokeTransactionalEmail({
    templateName: "generic-notice",
    recipientEmail: email,
    idempotencyKey: `phone-draft-${draft.id}-${await sha256(email)}`,
    templateData: {
      subject: "Finish your Vendibook listing",
      kicker: "Started on your call with Vendibook",
      heading: "Your listing draft is ready",
      paragraphs: [
        `We saved "${maskContactDetails(String(draft.title))}" as a draft. Add photos, check the details and press Publish when you're ready. Nothing goes live until you publish.`,
        draft.host_id ? "Sign in to your Vendibook account to finish it." : "This link is private to you, so please don't forward it. You can create a free account while finishing.",
      ],
      ctaLabel: "Finish my listing",
      ctaUrl: link,
      footnote: "You received this because you asked for it on a call with Vendibook. No marketing subscription was created.",
    },
  });
  if (error) return json({ error: "The email couldn't be sent. Offer a text instead." }, 502);
  return json({ sent: true, say_this: `I just emailed the link to ${email}.` });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = await phoneToolSecret();
  if (!sameSecret(req.headers.get("x-vendibook-tool-secret") ?? "", secret)) return json({ error: "Forbidden" }, 403);

  try {
    const tool = new URL(req.url).searchParams.get("tool");
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (tool === "save_caller_details") return await saveCallerDetails(body);
    if (tool === "start_account_verification") return await startAccountVerification(body);
    if (tool === "check_account_code") return await checkAccountCode(body);
    if (tool === "get_my_account_summary") return await getMyAccountSummary(body);
    if (tool === "request_live_follow_up") return await requestLiveFollowUp(body);
    if (tool === "get_pricing") return await getPricing();
    if (tool === "search_listings") return await searchListings(body);
    if (tool === "get_listing") return await getListing(body);
    if (tool === "send_listing_links") return await sendListingLinks(body);
    if (tool === "message_seller") return await messageSeller(body);
    if (tool === "start_listing_draft") return await startListingDraft(body);
    if (tool === "send_listing_draft_link") return await sendListingDraftLink(body);
    return json({ error: "Unknown tool" }, 404);
  } catch (e) {
    console.error("[phone-support-tools] error", e);
    return json({ error: "Could not complete that. Offer to take a message for support@vendibook.com." }, 500);
  }
});
