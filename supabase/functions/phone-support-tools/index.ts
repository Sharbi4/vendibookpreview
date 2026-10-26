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
    return json({ error: "Unknown tool" }, 404);
  } catch (e) {
    console.error("[phone-support-tools] error", e);
    return json({ error: "Could not complete that. Offer to take a message for support@vendibook.com." }, 500);
  }
});
