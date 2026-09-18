/**
 * Vendibook case flow — Phase 1.
 *
 * For our catalogue (vehicles, trailers, turnkey businesses, custom build-outs,
 * local pickup) PayPal's Purchase Protection is largely unavailable, so the
 * Vendibook case process is the real remedy. This function owns it end to end:
 *
 *   open            buyer/seller opens a case; seller payment freezes immediately
 *   reply           append-only statement from either party or an admin
 *   admin_request   admin requests information from one side
 *   admin_resolve   admin records the outcome and unfreezes or terminates
 *   frozen_list     admin view of every frozen order
 *
 * Money rules enforced here AND in the database:
 *  - no payout may be approved, started or completed while a case is open
 *  - the 10-day condition clock pauses on freeze and resumes with the exact
 *    remaining time when the case closes without a refund
 *  - every transition is written append-only to dispute_case_events
 *
 * Phase 2 (PayPal dispute webhooks + automated evidence package) is NOT built
 * here, but `evidence_links` is populated so the package can be assembled later.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { notifyUser } from "../_shared/notify.ts";
import {
  ADMIN_EMAIL, caseUrl, collectEvidenceLinks, fmt, hoursFromNow, ISSUE_LABEL,
  loadParties, logEvent, money, OUTCOME_LABEL, sendCaseEmail, SITE_URL,
} from "../_shared/disputeCaseCore.ts";

const RESPONSE_WINDOW_HOURS = 72;
const ADMIN_SLA_HOURS = 48;
/** Report-a-problem stays available this long after the order was created. */
const REPORT_WINDOW_DAYS = Number(Deno.env.get("DISPUTE_REPORT_WINDOW_DAYS") ?? "60");

const ISSUE_TYPES = new Set([
  "item_not_received", "not_as_described", "damaged_in_transit", "seller_unresponsive",
  "buyer_unresponsive", "walkthrough_never_happened", "agreement_not_signed", "other",
]);
const OUTCOMES = new Set([
  "resolved_between_parties", "refunded_full", "refunded_partial",
  "released_to_seller", "closed_no_action",
]);


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired.");

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    switch (action) {
      case "open": return await openCase(admin, user.id, body);
      case "reply": return await replyToCase(admin, user.id, !!isAdmin, body);
      case "admin_request": return await adminRequest(admin, user.id, !!isAdmin, body);
      case "admin_resolve": return await adminResolve(admin, user.id, !!isAdmin, body);
      case "frozen_list": return await frozenList(admin, !!isAdmin);
      default: return jsonError(400, "invalid_action", "Unsupported case action.");
    }
  } catch (err) {
    return unknownErrorResponse(err);
  }
});

// ---------------------------------------------------------------- open

async function openCase(admin: any, userId: string, body: any) {
  const paymentRecordId = body?.payment_record_id as string | undefined;
  const issueType = String(body?.issue_type ?? "");
  const description = String(body?.description ?? "").trim();
  const attachments = Array.isArray(body?.attachments) ? body.attachments.slice(0, 10) : [];

  if (!paymentRecordId) return jsonError(400, "missing_fields", "Missing the order reference.");
  if (!ISSUE_TYPES.has(issueType)) return jsonError(400, "invalid_issue", "Choose an issue type.");
  if (description.length < 20) {
    return jsonError(400, "description_too_short", "Please describe what happened in at least a sentence or two.");
  }

  const { data: payment } = await admin.from("payment_records")
    .select("*").eq("id", paymentRecordId).maybeSingle();
  if (!payment) return jsonError(404, "not_found", "We couldn't find that order.");

  const role = payment.buyer_id === userId ? "buyer" : payment.seller_id === userId ? "seller" : null;
  if (!role) return jsonError(403, "forbidden", "This order isn't yours.");

  if (!["completed", "pending", "processing", "partially_refunded"].includes(String(payment.payment_status))) {
    return jsonError(409, "not_reportable", "This order has no payment to review yet.");
  }
  const openedDaysAgo = (Date.now() - new Date(payment.created_at).getTime()) / 86_400_000;
  if (openedDaysAgo > REPORT_WINDOW_DAYS) {
    return jsonError(409, "window_closed", `The reporting window for this order closed after ${REPORT_WINDOW_DAYS} days. Contact support.`);
  }

  const { data: existing } = await admin.from("dispute_cases")
    .select("id, case_number, status")
    .eq("payment_record_id", paymentRecordId)
    .not("status", "in", "(resolved,closed)")
    .maybeSingle();
  if (existing) {
    return jsonResponse(200, { success: true, already_open: true, case: existing });
  }

  const { data: payable } = await admin.from("seller_payables")
    .select("id, net_payout_cents, currency, status, conditions_deadline_at")
    .eq("payment_record_id", paymentRecordId)
    .maybeSingle();

  const evidence = await collectEvidenceLinks(admin, payment);
  const caseNumber = `VB-CASE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  const { data: created, error: createErr } = await admin.from("dispute_cases").insert({
    case_number: caseNumber,
    payment_record_id: payment.id,
    seller_payable_id: payable?.id ?? null,
    sale_transaction_id: payment.sale_transaction_id ?? null,
    booking_request_id: payment.booking_request_id ?? null,
    listing_id: payment.listing_id ?? null,
    buyer_id: payment.buyer_id,
    seller_id: payment.seller_id,
    opened_by: userId,
    opened_by_role: role,
    issue_type: issueType,
    description,
    status: role === "buyer" ? "awaiting_seller" : "awaiting_buyer",
    response_deadline_at: hoursFromNow(RESPONSE_WINDOW_HOURS),
    sla_due_at: hoursFromNow(ADMIN_SLA_HOURS),
    amount_held_cents: payable?.net_payout_cents ?? 0,
    currency: payable?.currency ?? payment.currency ?? "USD",
    evidence_links: evidence.links,
    listing_snapshot: evidence.listingSnapshot,
  }).select().maybeSingle();

  if (createErr || !created) {
    return jsonError(409, "case_not_created", createErr?.message ?? "We couldn't open that case.");
  }

  await admin.from("dispute_case_messages").insert({
    case_id: created.id,
    author_id: userId,
    author_role: role,
    body: description,
    attachments,
  });

  // ---- FREEZE: this is the critical piece. Fail closed.
  let frozen = false;
  if (payable?.id) {
    const { error: freezeErr } = await admin.rpc("freeze_payable_for_case", {
      _payable_id: payable.id, _case_id: created.id,
    });
    frozen = !freezeErr;
    if (freezeErr) {
      // We could not freeze — mark the case so the payout gate still fails closed
      // on the unresolved-case check, and tell admins loudly.
      await logEvent(admin, created.id, payable.id, "freeze_failed", userId, role, null, null, freezeErr.message);
    } else {
      await admin.from("dispute_cases").update({ disbursement_frozen: true }).eq("id", created.id);
      await logEvent(admin, created.id, payable.id, "disbursement_frozen", userId, role,
        "clock_running", "clock_paused", "Case opened — seller payment and the 10-day clock are paused.");
    }
  }

  await logEvent(admin, created.id, payable?.id ?? null, "case_opened", userId, role, null,
    created.status, `Case opened: ${ISSUE_LABEL[issueType]}`);

  const parties = await loadParties(admin, payment);
  const other = role === "buyer" ? parties.seller : parties.buyer;
  const opener = role === "buyer" ? parties.buyer : parties.seller;
  const link = caseUrl(created.id);

  await sendCaseEmail(admin, opener?.email, `case-opened-${created.id}-opener`, {
    kicker: `Case ${created.case_number}`,
    heading: "Your case is open",
    paragraphs: [
      `We've opened case ${created.case_number} on order ${payment.reference}. The other party has been notified and has until ${fmt(created.response_deadline_at)} to respond.`,
      role === "buyer"
        ? "Seller payment on this order is paused while the case is open, and the condition clock is paused with it."
        : "Seller payment on this order is paused while the case is open.",
      "Opening a Vendibook case also satisfies PayPal's requirement that a buyer first attempt to resolve the issue with the seller. It does not extend or replace any deadline PayPal or your card issuer sets.",
    ],
    ctaLabel: "View your case", ctaUrl: link,
  });

  await sendCaseEmail(admin, other?.email, `case-opened-${created.id}-other`, {
    kicker: `Case ${created.case_number}`,
    heading: role === "buyer" ? "A case was opened on your order" : "A case was opened on your order",
    alert: {
      tone: "warning",
      title: "Response needed",
      body: `Respond by ${fmt(created.response_deadline_at)}.${role === "buyer" ? " Your payout on this order is paused while the case is open." : ""}`,
    },
    paragraphs: [
      `${ISSUE_LABEL[issueType]} was reported on order ${payment.reference}.`,
      "Reply in the case thread. Everything written there is part of the record and cannot be edited later.",
    ],
    ctaLabel: "Open the case", ctaUrl: link,
  });

  await sendCaseEmail(admin, ADMIN_EMAIL, `case-opened-${created.id}-admin`, {
    kicker: "New case",
    heading: `${created.case_number} — ${ISSUE_LABEL[issueType]}`,
    details: [
      { label: "Order", value: payment.reference ?? payment.id },
      { label: "Opened by", value: role },
      { label: "Amount held", value: money(created.amount_held_cents, created.currency) },
      { label: "Disbursement", value: frozen ? "Frozen" : "FREEZE FAILED — check immediately" },
      { label: "SLA due", value: fmt(created.sla_due_at) },
    ],
    ctaLabel: "Review case", ctaUrl: `${SITE_URL}/admin/disputes`,
  });

  await notifyUser(admin, {
    userId: other?.id, type: "case_opened",
    title: "A case was opened on your order",
    message: `${ISSUE_LABEL[issueType]} — respond by ${fmt(created.response_deadline_at)}.`,
    link: `/cases/${created.id}`, dedupeKey: `case-open-${created.id}`,
  });

  return jsonResponse(200, { success: true, case: created, disbursement_frozen: frozen });
}

// ---------------------------------------------------------------- reply

async function replyToCase(admin: any, userId: string, isAdmin: boolean, body: any) {
  const caseId = body?.case_id as string | undefined;
  const text = String(body?.body ?? "").trim();
  const attachments = Array.isArray(body?.attachments) ? body.attachments.slice(0, 10) : [];
  if (!caseId || text.length < 2) return jsonError(400, "missing_fields", "Write a message first.");

  const { data: c } = await admin.from("dispute_cases").select("*").eq("id", caseId).maybeSingle();
  if (!c) return jsonError(404, "not_found", "Case not found.");

  const role = isAdmin ? "admin" : c.buyer_id === userId ? "buyer" : c.seller_id === userId ? "seller" : null;
  if (!role) return jsonError(403, "forbidden", "This case isn't yours.");
  if (["resolved", "closed"].includes(c.status)) {
    return jsonError(409, "case_closed", "This case is closed. Contact support if something changed.");
  }

  await admin.from("dispute_case_messages").insert({
    case_id: caseId, author_id: userId, author_role: role, body: text, attachments,
  });

  const nextStatus = role === "admin"
    ? c.status
    : role === "buyer" ? "awaiting_seller" : "awaiting_buyer";

  await admin.from("dispute_cases").update({
    status: nextStatus,
    last_activity_at: new Date().toISOString(),
    response_deadline_at: role === "admin" ? c.response_deadline_at : hoursFromNow(RESPONSE_WINDOW_HOURS),
  }).eq("id", caseId);

  await logEvent(admin, caseId, c.seller_payable_id, "case_reply", userId, role, c.status, nextStatus, null);

  const parties = await loadParties(admin, { buyer_id: c.buyer_id, seller_id: c.seller_id });
  const recipient = role === "buyer" ? parties.seller : role === "seller" ? parties.buyer : null;
  if (recipient?.email) {
    await sendCaseEmail(admin, recipient.email, `case-reply-${caseId}-${Date.now()}`, {
      kicker: `Case ${c.case_number}`,
      heading: role === "buyer" ? "The buyer responded" : "The seller responded",
      paragraphs: ["There's a new message in your case thread on Vendibook."],
      ctaLabel: "Read the reply", ctaUrl: caseUrl(caseId),
    });
  }
  if (role !== "admin") {
    await notifyUser(admin, {
      userId: recipient?.id, type: "case_reply",
      title: "New message on your case",
      message: `Case ${c.case_number} has a new message.`,
      link: `/cases/${caseId}`,
    });
  }

  return jsonResponse(200, { success: true });
}

// ---------------------------------------------------------- admin request

async function adminRequest(admin: any, userId: string, isAdmin: boolean, body: any) {
  if (!isAdmin) return jsonError(403, "forbidden", "Administrator access required.");
  const caseId = body?.case_id as string | undefined;
  const target = String(body?.target ?? "");
  const text = String(body?.body ?? "").trim();
  if (!caseId || !["buyer", "seller"].includes(target) || text.length < 2) {
    return jsonError(400, "missing_fields", "Choose who to ask and what you need.");
  }

  const { data: c } = await admin.from("dispute_cases").select("*").eq("id", caseId).maybeSingle();
  if (!c) return jsonError(404, "not_found", "Case not found.");

  await admin.from("dispute_case_messages").insert({
    case_id: caseId, author_id: userId, author_role: "admin", body: text,
  });
  const nextStatus = target === "buyer" ? "awaiting_buyer" : "awaiting_seller";
  await admin.from("dispute_cases").update({
    status: nextStatus,
    response_deadline_at: hoursFromNow(RESPONSE_WINDOW_HOURS),
    last_activity_at: new Date().toISOString(),
  }).eq("id", caseId);
  await logEvent(admin, caseId, c.seller_payable_id, "admin_requested_information", userId, "admin", c.status, nextStatus, `Information requested from ${target}.`);

  const parties = await loadParties(admin, { buyer_id: c.buyer_id, seller_id: c.seller_id });
  const person = target === "buyer" ? parties.buyer : parties.seller;
  await sendCaseEmail(admin, person?.email, `case-info-${caseId}-${Date.now()}`, {
    kicker: `Case ${c.case_number}`,
    heading: "Vendibook needs information from you",
    paragraphs: [text, `Please reply by ${fmt(hoursFromNow(RESPONSE_WINDOW_HOURS))}.`],
    ctaLabel: "Respond in the case", ctaUrl: caseUrl(caseId),
  });
  await notifyUser(admin, {
    userId: person?.id, type: "case_info_requested",
    title: "Vendibook needs information",
    message: `Case ${c.case_number} is waiting on you.`, link: `/cases/${caseId}`,
  });

  return jsonResponse(200, { success: true });
}

// ---------------------------------------------------------- admin resolve

async function adminResolve(admin: any, userId: string, isAdmin: boolean, body: any) {
  if (!isAdmin) return jsonError(403, "forbidden", "Administrator access required.");
  const caseId = body?.case_id as string | undefined;
  const outcome = String(body?.outcome ?? "");
  const reason = String(body?.reason ?? "").trim();
  if (!caseId || !OUTCOMES.has(outcome) || reason.length < 5) {
    return jsonError(400, "missing_fields", "An outcome and a written reason are required.");
  }

  const { data: c } = await admin.from("dispute_cases").select("*").eq("id", caseId).maybeSingle();
  if (!c) return jsonError(404, "not_found", "Case not found.");
  if (["resolved", "closed"].includes(c.status)) {
    return jsonError(409, "already_resolved", "This case is already resolved.");
  }

  const resolvedAt = new Date().toISOString();
  await admin.from("dispute_cases").update({
    status: outcome === "closed_no_action" ? "closed" : "resolved",
    outcome, resolution_reason: reason, resolved_by: userId, resolved_at: resolvedAt,
    disbursement_frozen: false, last_activity_at: resolvedAt,
  }).eq("id", caseId);

  // Unfreeze: a refund outcome ends the order, everything else resumes the clock
  // with exactly the time that was left when the case opened.
  let unfroze = false;
  if (c.seller_payable_id) {
    const { error: unfreezeErr } = await admin.rpc("unfreeze_payable_for_case", { _payable_id: c.seller_payable_id });
    unfroze = !unfreezeErr;
    await logEvent(admin, caseId, c.seller_payable_id,
      unfreezeErr ? "unfreeze_failed" : "disbursement_unfrozen", userId, "admin",
      "clock_paused", unfreezeErr ? "clock_paused" : "clock_running",
      unfreezeErr ? unfreezeErr.message : "Case closed — remaining time on the 10-day clock resumed.");
  }

  await admin.from("dispute_case_messages").insert({
    case_id: caseId, author_id: userId, author_role: "admin",
    body: `Outcome: ${OUTCOME_LABEL[outcome]}. ${reason}`,
  });
  await logEvent(admin, caseId, c.seller_payable_id, "case_resolved", userId, "admin", c.status,
    outcome, reason);

  const parties = await loadParties(admin, { buyer_id: c.buyer_id, seller_id: c.seller_id });
  const refunded = outcome === "refunded_full" || outcome === "refunded_partial";
  for (const [who, person] of [["buyer", parties.buyer], ["seller", parties.seller]] as const) {
    await sendCaseEmail(admin, person?.email, `case-resolved-${caseId}-${who}`, {
      kicker: `Case ${c.case_number}`,
      heading: "Your case is resolved",
      details: [{ label: "Outcome", value: OUTCOME_LABEL[outcome] }],
      paragraphs: [
        reason,
        who === "seller" && refunded
          ? "Because a refund was issued, no seller payment will be made on this order for the refunded amount."
          : who === "seller"
            ? "Your payment on this order can continue through the normal review once the payment conditions are met."
            : "Closing a Vendibook case does not extend or replace any deadline PayPal or your card issuer sets.",
      ],
      ctaLabel: "View the case", ctaUrl: caseUrl(caseId),
    });
    await notifyUser(admin, {
      userId: person?.id, type: "case_resolved",
      title: "Case resolved", message: OUTCOME_LABEL[outcome],
      link: `/cases/${caseId}`, dedupeKey: `case-resolved-${caseId}-${who}`,
    });
  }

  return jsonResponse(200, { success: true, unfroze });
}

// ------------------------------------------------------------ frozen list

async function frozenList(admin: any, isAdmin: boolean) {
  if (!isAdmin) return jsonError(403, "forbidden", "Administrator access required.");
  const { data } = await admin.from("dispute_cases")
    .select("*")
    .not("status", "in", "(resolved,closed)")
    .order("created_at", { ascending: true });

  const rows = data ?? [];
  const ids = rows.map((r: any) => r.seller_payable_id).filter(Boolean);
  const { data: payables } = ids.length
    ? await admin.from("seller_payables")
      .select("id, net_payout_cents, currency, status, dispute_frozen_at, deadline_remaining_seconds")
      .in("id", ids)
    : { data: [] };

  const byId = new Map((payables ?? []).map((p: any) => [p.id, p]));
  return jsonResponse(200, {
    success: true,
    cases: rows.map((r: any) => ({
      ...r,
      payable: r.seller_payable_id ? byId.get(r.seller_payable_id) ?? null : null,
      days_open: Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86_400_000),
      blocking: r.status === "awaiting_buyer" ? "buyer"
        : r.status === "awaiting_seller" ? "seller" : "vendibook",
      past_sla: !!r.sla_due_at && new Date(r.sla_due_at).getTime() < Date.now(),
    })),
  });
}

// helpers live in ../_shared/disputeCaseCore.ts so PayPal dispute intake and
// party-opened cases stay identical.
