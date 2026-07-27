// vapi-create-support-ticket
//
// Dedicated server-to-server endpoint for the Vapi outbound support
// assistant (a37b08b5-ddf7-473d-ac23-1cb49ea2c713) to open a Vendibook
// support ticket after a voice callback. Also accepts a flat body for
// Help Center / smoke-test compatibility.
//
// Auth: shared bearer credential (VAPI_TOOL_SHARED_SECRET) — Vapi cannot
// vouch for a signed-in user. Emails are trusted only when explicit OTP
// verification metadata accompanies the call.
//
// Vapi custom-tool envelope (canonical):
//   { message: {
//       toolCalls: [{ id, type:'function',
//         function: { name:'create_support_ticket', arguments: {..} | "json" }
//       }],
//       call: { id, customer: { number, name } }
//   } }
// Response (canonical):
//   { results: [{ toolCallId, result: "<json string>" }] }
//
// Idempotency: (vapi_call_id, vapi_tool_call_id) unique index on
// support_tickets + support_ticket_webhook_events row per tool call.
// Retries return the original reference and never re-forward.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { type CountryCode } from "https://esm.sh/libphonenumber-js@1.11.14/max";
import { forwardTicketToTawk } from "../_shared/tawkForward.ts";
import {
  APPROVED_TOOL_NAME,
  extractToolCalls,
  normalizePhoneString,
  safeString,
} from "./helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPI_TOOL_SHARED_SECRET = Deno.env.get("VAPI_TOOL_SHARED_SECRET") ?? "";

const ALLOWED_SEVERITY = new Set(["standard", "urgent", "critical"]);
const ALLOWED_CATEGORY = new Set([
  "account_access", "billing_payment", "payout", "listing_issue",
  "booking_issue", "purchase_issue", "document_signing", "shipping_freight",
  "safety_fraud", "technical_bug", "feature_question", "other",
]);
const ALLOWED_ENTITY = new Set([
  "listing", "booking", "sale_transaction", "permit_roadmap",
  "conversation", "review", "draft", "user",
]);
const ALLOWED_FOLLOW_UP = new Set(["phone", "email", "text", "either"]);

const CATEGORY_TO_INTERNAL: Record<string, string> = {
  safety_fraud: "suspected_fraud",
  billing_payment: "payment_issue",
  payout: "seller_did_not_receive_payment",
  purchase_issue: "purchase_cannot_progress",
  booking_issue: "rental_cannot_progress",
  listing_issue: "listing_will_not_publish",
  document_signing: "confirmation_action_failed",
  account_access: "cannot_access_purchase",
  shipping_freight: "item_not_received",
  technical_bug: "other",
  feature_question: "other",
  other: "other",
};

const URGENT_INTERNAL = new Set([
  "suspected_fraud", "unauthorized_transaction", "security_privacy",
  "seller_did_not_receive_payment", "item_not_received", "cannot_access_purchase",
]);
const HIGH_INTERNAL = new Set([
  "listing_will_not_publish", "permit_path_will_not_save",
  "purchase_cannot_progress", "rental_cannot_progress",
  "cannot_access_draft", "confirmation_action_failed",
  "payment_issue", "pay_in_person_confirmation",
]);

function derivePriority(internalCategory: string, severity: string): "urgent" | "high" | "normal" | "low" {
  if (severity === "critical") return "urgent";
  if (URGENT_INTERNAL.has(internalCategory)) return "urgent";
  if (severity === "urgent") return "high";
  if (HIGH_INTERNAL.has(internalCategory)) return "high";
  return "normal";
}

function featureAreaFor(category: string): string {
  switch (category) {
    case "listing_issue": return "listing_page";
    case "booking_issue": return "rental";
    case "purchase_issue": return "purchase";
    case "billing_payment":
    case "payout": return "purchase";
    case "safety_fraud": return "fraud";
    case "account_access": return "profile";
    case "document_signing": return "message";
    default: return "other";
  }
}

// -----------------------------------------------------------------------
// HTTP helpers

function httpJson(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Wrap a tool-call outcome in Vapi's { results:[{toolCallId,result}] } envelope. */
function vapiResults(toolCallId: string, payload: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ results: [{ toolCallId, result: JSON.stringify(payload) }] }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// -----------------------------------------------------------------------
// Parsing helpers (see ./helpers.ts). Only local-only helpers remain here.

function looksLikeEmail(v: string | null): boolean {
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// -----------------------------------------------------------------------
// Per-tool-call processor

type ProcessInput = {
  args: Record<string, unknown>;
  toolCallId: string;
  callId: string | null;
  callerNumberFromCall: string | null;
  callerNameFromCall: string | null;
  submissionChannel: string;
};

async function processCreateSupportTicket(input: ProcessInput): Promise<Record<string, unknown>> {
  const { args, toolCallId, callId, callerNumberFromCall, callerNameFromCall, submissionChannel } = input;

  // ---- extract + coerce ------------------------------------------------
  const customer_name = safeString(args.customer_name ?? callerNameFromCall, 120);
  const verified_email = safeString(args.verified_email ?? args.customer_email, 254);

  // Accept several phone aliases; ALWAYS coerce to string.
  const rawCallback =
    args.callback_phone ??
    args.callback_number ??
    args.phone_number ??
    args.phone ??
    args.customer_phone ??
    null;
  const country = safeString(args.callback_phone_country ?? args.phone_country, 8) as CountryCode | null;

  // Prefer explicitly provided/confirmed callback; fall back to the outbound
  // call's own customer number (already in E.164 from Vapi).
  const providedNorm = normalizePhoneString(rawCallback, (country ?? "US") as CountryCode);
  const fallbackNorm = providedNorm ? null : normalizePhoneString(callerNumberFromCall);
  const phone = providedNorm ?? fallbackNorm;
  const phoneSource = providedNorm
    ? "assistant_confirmed"
    : fallbackNorm
      ? "call_metadata"
      : null;

  const issue_category = safeString(args.issue_category, 40) ?? "other";
  const severityIn = safeString(args.severity, 20) ?? "standard";
  const issue_summary = safeString(args.issue_summary ?? args.summary, 200);
  const exact_error_message = safeString(args.exact_error_message ?? args.error_message, 2000);
  const related_entity_type = safeString(args.related_entity_type, 40);
  const related_entity_id = safeString(args.related_entity_id, 64);
  const troubleshooting_attempted = safeString(args.troubleshooting_attempted, 2000);
  const customer_impact = safeString(args.customer_impact, 1000);
  const preferred_follow_up = safeString(args.preferred_follow_up, 60);
  const call_summary = safeString(args.call_summary, 4000);
  // NOTE: `email_verification_method` / `email_verification_result` were
  // previously accepted as trust signals. They are LLM-controlled tool
  // arguments — NOT independent OTP proof — so they are intentionally
  // ignored here. A caller email spoken to the voice assistant is always
  // treated as unverified: we store it as `customer_email`, never as
  // `reply_email`, and never link `user_id` from it. Verified linkage
  // requires an out-of-band, server-side OTP store, which this endpoint
  // does not currently consult.
  const _ignored_email_verification_method = args.email_verification_method;
  const _ignored_email_verification_result = args.email_verification_result;
  void _ignored_email_verification_method;
  void _ignored_email_verification_result;

  // ---- validate --------------------------------------------------------
  const errors: string[] = [];
  if (!customer_name || customer_name.length < 2) errors.push("customer_name");
  if (!issue_summary || issue_summary.length < 3) errors.push("issue_summary");
  if (!ALLOWED_SEVERITY.has(severityIn)) errors.push("severity");
  if (!ALLOWED_CATEGORY.has(issue_category)) errors.push("issue_category");
  if (related_entity_type && !ALLOWED_ENTITY.has(related_entity_type)) errors.push("related_entity_type");
  if (verified_email && !looksLikeEmail(verified_email)) errors.push("verified_email");
  if (preferred_follow_up && !ALLOWED_FOLLOW_UP.has(preferred_follow_up)) errors.push("preferred_follow_up");
  // If caller asked for phone/text follow-up we need a valid phone.
  if (
    (preferred_follow_up === "phone" || preferred_follow_up === "text") &&
    !phone
  ) errors.push("callback_phone");
  if (errors.length) {
    return {
      success: false,
      ticket_created: false,
      retryable: false,
      error_code: "validation_failed",
      missing_fields: errors,
      customer_message:
        "I couldn't capture everything I need — could you repeat the missing detail so I can log this ticket?",
    };
  }

  const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // ---- idempotency: prior tool-call replay -----------------------------
  const idempotencyKey = callId ? `${callId}::${toolCallId}` : `tool:${toolCallId}`;
  if (callId) {
    const { data: prior } = await svc
      .from("support_ticket_webhook_events")
      .select("id, ticket_id")
      .eq("source", "vapi_callback")
      .eq("external_event_id", idempotencyKey)
      .maybeSingle();
    if (prior?.ticket_id) {
      const { data: existing } = await svc
        .from("support_tickets")
        .select("id, reference_code, forwarding_status, callback_phone_e164, callback_phone_display")
        .eq("id", prior.ticket_id)
        .maybeSingle();
      if (existing) {
        return {
          success: true,
          ticket_created: false,
          deduped: true,
          ticket_reference: existing.reference_code,
          reference: existing.reference_code,
          callback_phone_e164: existing.callback_phone_e164,
          callback_phone_display: existing.callback_phone_display,
          delivery_status: existing.forwarding_status,
          retryable: false,
          customer_message: `We already opened ticket ${existing.reference_code} for this call.`,
        };
      }
    }
  }

  // ---- email verification handling ------------------------------------
  // Vapi callers cannot prove ownership of an email address during a voice
  // call. Always treat as unverified; never auto-link a user_id from a
  // spoken email; never set reply-to. If the human agent later verifies
  // ownership out-of-band, they can update the ticket manually.
  const email_verified = false;
  const linkedUserId: string | null = null;

  const internalCategory = CATEGORY_TO_INTERNAL[issue_category] ?? "other";
  const priority = derivePriority(internalCategory, severityIn);
  const featureArea = featureAreaFor(issue_category);

  const descriptionParts = [
    `Voice callback ticket opened by Vendibook Support assistant.`,
    ``,
    `Summary: ${issue_summary}`,
    customer_impact ? `Impact: ${customer_impact}` : null,
    troubleshooting_attempted ? `Troubleshooting tried: ${troubleshooting_attempted}` : null,
    exact_error_message ? `Exact error message: ${exact_error_message}` : null,
    preferred_follow_up ? `Preferred follow-up: ${preferred_follow_up}` : null,
    phone ? `Callback: ${phone.display} (${phone.e164})${phone.extension ? ` ext. ${phone.extension}` : ""}` : null,
    !email_verified ? `NOTE: caller email was NOT securely verified during the call.` : null,
  ].filter(Boolean).join("\n");

  const relatedColumnMap: Record<string, string> = {
    listing: "related_listing_id",
    booking: "related_booking_id",
    sale_transaction: "related_sale_transaction_id",
    permit_roadmap: "related_permit_roadmap_id",
    conversation: "related_conversation_id",
    review: "related_review_id",
    draft: "related_draft_id",
    user: "related_reported_user_id",
  };
  const relatedPatch: Record<string, string | null> = {};
  if (related_entity_type && related_entity_id) {
    const col = relatedColumnMap[related_entity_type];
    if (col && /^[0-9a-fA-F-]{10,64}$/.test(related_entity_id)) relatedPatch[col] = related_entity_id;
  }

  // ---- insert ticket (pending delivery) --------------------------------
  const { data: ticket, error: insertErr } = await svc
    .from("support_tickets")
    .insert({
      user_id: linkedUserId,
      source: "vapi_callback",
      submission_channel: submissionChannel,
      feature_area: featureArea,
      category: internalCategory,
      priority,
      title: issue_summary!.slice(0, 200),
      description: descriptionParts.slice(0, 5000),
      is_blocking: severityIn !== "standard",
      reply_email: email_verified ? verified_email : null,
      customer_email: verified_email,
      customer_name,
      email_verified,
      vapi_call_id: callId,
      vapi_tool_call_id: toolCallId,
      request_id: callId ? `vapi:${callId}:${toolCallId}` : `vapi:${toolCallId}`,
      forwarding_status: "pending",
      callback_phone_e164: phone?.e164 ?? null,
      callback_phone_display: phone?.display ?? null,
      callback_phone_country: phone?.country ?? null,
      callback_phone_extension: phone?.extension ?? null,
      callback_phone_source: phoneSource,
      ...relatedPatch,
    })
    .select("id, reference_code, priority, forwarding_status, callback_phone_e164, callback_phone_display")
    .single();

  if (insertErr || !ticket) {
    // Handle uniqueness race: someone else inserted with same (call, tool)
    if (insertErr && (insertErr as { code?: string }).code === "23505" && callId) {
      const { data: dup } = await svc
        .from("support_tickets")
        .select("id, reference_code, forwarding_status, callback_phone_e164, callback_phone_display")
        .eq("vapi_call_id", callId)
        .eq("vapi_tool_call_id", toolCallId)
        .maybeSingle();
      if (dup) {
        return {
          success: true,
          ticket_created: false,
          deduped: true,
          ticket_reference: dup.reference_code,
          reference: dup.reference_code,
          callback_phone_e164: dup.callback_phone_e164,
          callback_phone_display: dup.callback_phone_display,
          delivery_status: dup.forwarding_status,
          retryable: false,
          customer_message: `We already opened ticket ${dup.reference_code} for this call.`,
        };
      }
    }
    console.error("[vapi-create-support-ticket] insert failed", (insertErr as { code?: string; message?: string })?.code, (insertErr as { message?: string })?.message);
    return {
      success: false,
      ticket_created: false,
      retryable: true,
      error_code: "ticket_persist_failed",
      customer_message:
        "I couldn't open the ticket right now. Please try again or email support@vendibook.com.",
    };
  }

  // Reserve idempotency row (post-insert so we always have ticket_id).
  if (callId) {
    await svc.from("support_ticket_webhook_events").insert({
      source: "vapi_callback",
      external_event_id: idempotencyKey,
      event_type: "vapi_tool_call",
      payload: {
        tool_call_id: toolCallId,
        severity: severityIn,
        issue_category,
        priority_derived: priority,
        email_verified,
        email_verification_note: "voice_caller_email_never_trusted",
        preferred_follow_up,
        callback_phone_source: phoneSource,
      },
      ticket_id: ticket.id,
      processed_at: new Date().toISOString(),
    });
  }

  await svc.from("support_ticket_audit_events").insert({
    ticket_id: ticket.id,
    event_type: "vapi_callback_captured",
    actor_type: "system",
    external_ref: callId,
    details: {
      call_summary,
      callback_phone_e164: phone?.e164,
      callback_phone_display: phone?.display,
      callback_phone_source: phoneSource,
      severity_reported: severityIn,
      email_verified,
      issue_category,
      related_entity_type,
      related_entity_id,
      submission_channel: submissionChannel,
    },
  });

  // ---- forward to private Tawk address --------------------------------
  await svc.from("support_tickets")
    .update({ delivery_attempted_at: new Date().toISOString() })
    .eq("id", ticket.id);

  const forwardResult = await forwardTicketToTawk({
    referenceCode: ticket.reference_code,
    ticketId: ticket.id,
    subject: issue_summary!,
    priority,
    category: internalCategory,
    featureArea,
    source: "vapi_callback",
    customerName: customer_name,
    customerEmail: verified_email,
    emailVerified: email_verified,
    callbackPhone: phone ? `${phone.display} (${phone.e164})${phone.extension ? ` ext. ${phone.extension}` : ""}` : null,
    bodyText: descriptionParts,
    context: {
      severity: severityIn,
      issue_category,
      related_entity_type,
      related_entity_id,
      preferred_follow_up,
      callback_phone_source: phoneSource,
    },
    callId,
    callSummary: call_summary,
    replyTo: email_verified ? verified_email : null,
  });

  await svc.from("support_tickets")
    .update({
      forwarding_status: forwardResult.status,
      forwarding_last_error: forwardResult.error ?? null,
      forwarded_at: forwardResult.status === "delivered" ? new Date().toISOString() : null,
    })
    .eq("id", ticket.id);

  const retryable = forwardResult.status === "retryable_failure";
  const forwardingOk = forwardResult.status === "delivered" || forwardResult.status === "skipped";

  return {
    success: true,
    ticket_created: true,
    ticket_reference: ticket.reference_code,
    // Legacy keys retained for existing consumers (smoke test, Help Center):
    reference: ticket.reference_code,
    ticket_id: ticket.id,
    priority: ticket.priority,
    callback_phone_e164: phone?.e164 ?? null,
    callback_phone_display: phone?.display ?? null,
    delivery_status: forwardResult.status,
    forwarding_status: forwardResult.status,
    retryable,
    customer_message: forwardingOk
      ? `I've opened ticket ${ticket.reference_code}. Our support team has it now.`
      : `I've opened ticket ${ticket.reference_code}, but the handoff to our support inbox is still syncing. If you don't hear back within a business day, please email support@vendibook.com and reference ${ticket.reference_code}.`,
    confirmation_message: forwardingOk
      ? `I've opened ticket ${ticket.reference_code}. Our support team has it now.`
      : `I've opened ticket ${ticket.reference_code}, but the handoff to our support inbox is still syncing. Please email support@vendibook.com and reference ${ticket.reference_code} if you don't hear back within a business day.`,
  };
}

// -----------------------------------------------------------------------
// Request handler

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return httpJson(405, { success: false, error: "method_not_allowed" });

  // Server-to-server auth
  if (!VAPI_TOOL_SHARED_SECRET) {
    console.error("[vapi-create-support-ticket] VAPI_TOOL_SHARED_SECRET not configured");
    return httpJson(500, { success: false, error: "server_not_configured" });
  }
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const presented = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!presented) return httpJson(401, { success: false, error: "missing_bearer" });
  const a = new TextEncoder().encode(presented);
  const b = new TextEncoder().encode(VAPI_TOOL_SHARED_SECRET);
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (diff !== 0) return httpJson(403, { success: false, error: "invalid_bearer" });

  let body: unknown;
  try { body = await req.json(); } catch { return httpJson(400, { success: false, error: "invalid_json" }); }

  const { toolCalls, callId, callerNumber, callerName, isVapiEnvelope } = extractToolCalls(body);
  if (toolCalls.length === 0) {
    return httpJson(400, { success: false, error: "no_tool_calls" });
  }

  // Envelope shape is used for auditing / channel labeling.
  const submissionChannel = isVapiEnvelope ? "vapi_voice" : "vapi_direct";

  const results: Array<{ toolCallId: string; result: string }> = [];

  for (const tc of toolCalls) {
    if (tc.name !== APPROVED_TOOL_NAME) {
      results.push({
        toolCallId: tc.id,
        result: JSON.stringify({
          success: false,
          ticket_created: false,
          error_code: "unknown_tool",
          retryable: false,
          customer_message: "I don't recognize that support action.",
        }),
      });
      continue;
    }
    try {
      const payload = await processCreateSupportTicket({
        args: tc.args,
        toolCallId: tc.id,
        callId,
        callerNumberFromCall: callerNumber,
        callerNameFromCall: callerName,
        submissionChannel,
      });
      results.push({ toolCallId: tc.id, result: JSON.stringify(payload) });
    } catch (err) {
      console.error("[vapi-create-support-ticket] unhandled", (err as Error).message);
      results.push({
        toolCallId: tc.id,
        result: JSON.stringify({
          success: false,
          ticket_created: false,
          retryable: true,
          error_code: "internal_error",
          customer_message:
            "Something went wrong on our side. Please try again or email support@vendibook.com.",
        }),
      });
    }
  }

  // Single-call flat-body compatibility: mirror the tool result at the top
  // level so existing consumers (smoke test, Help Center) keep working.
  if (!isVapiEnvelope && results.length === 1) {
    const only = JSON.parse(results[0].result);
    return new Response(
      JSON.stringify({ ...only, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
