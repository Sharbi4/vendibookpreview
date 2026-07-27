// vapi-create-support-ticket
//
// Dedicated server-to-server endpoint for the Vapi outbound support
// assistant (a37b08b5-ddf7-473d-ac23-1cb49ea2c713) to open a Vendibook
// support ticket after a voice callback.
//
// Auth model: shared bearer credential (VAPI_TOOL_SHARED_SECRET) enforced
// in-code. NEVER accepts a customer's Supabase JWT — Vapi cannot vouch for
// a signed-in user; unverified email addresses are always persisted as
// unverified regardless of what Vapi claims.
//
// Idempotency: (source='vapi_callback', external_event_id=call_id) unique
// on support_ticket_webhook_events → replays return the original reference.
//
// Response is customer-safe (no secrets, no Tawk address, no config).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { forwardTicketToTawk } from "../_shared/tawkForward.ts";

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

// Map Vapi's coarse category → the canonical support_tickets category vocabulary
// used by submit-support-ticket for priority derivation.
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

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return raw.startsWith("+") ? `+${digits}` : digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function looksLikeEmail(v: string | null): boolean {
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "method_not_allowed" });

  // --- server-to-server auth ---------------------------------------------
  if (!VAPI_TOOL_SHARED_SECRET) {
    console.error("[vapi-create-support-ticket] VAPI_TOOL_SHARED_SECRET not configured");
    return json(500, { success: false, error: "server_not_configured" });
  }
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const presented = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!presented) return json(401, { success: false, error: "missing_bearer" });

  // constant-time compare
  const a = new TextEncoder().encode(presented);
  const b = new TextEncoder().encode(VAPI_TOOL_SHARED_SECRET);
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (diff !== 0) return json(403, { success: false, error: "invalid_bearer" });

  // --- validation --------------------------------------------------------
  let raw: Record<string, unknown>;
  try { raw = await req.json(); } catch { return json(400, { success: false, error: "invalid_json" }); }

  const customer_name = safeString(raw.customer_name, 120);
  const verified_email = safeString(raw.verified_email, 254);
  const callback_phone = normalizePhone(safeString(raw.callback_phone, 40));
  const issue_category = safeString(raw.issue_category, 40) ?? "other";
  const severityIn = safeString(raw.severity, 20) ?? "standard";
  const issue_summary = safeString(raw.issue_summary, 200);
  const exact_error_message = safeString(raw.exact_error_message, 2000);
  const related_entity_type = safeString(raw.related_entity_type, 40);
  const related_entity_id = safeString(raw.related_entity_id, 64);
  const troubleshooting_attempted = safeString(raw.troubleshooting_attempted, 2000);
  const customer_impact = safeString(raw.customer_impact, 1000);
  const preferred_follow_up = safeString(raw.preferred_follow_up, 60);
  const call_id = safeString(raw.call_id, 120);
  const call_summary = safeString(raw.call_summary, 4000);
  const email_verification_method = safeString(raw.email_verification_method, 40);
  const email_verification_result = safeString(raw.email_verification_result, 40);

  const errors: string[] = [];
  if (!customer_name || customer_name.length < 2) errors.push("customer_name");
  if (!issue_summary || issue_summary.length < 3) errors.push("issue_summary");
  if (!call_id) errors.push("call_id");
  if (!ALLOWED_SEVERITY.has(severityIn)) errors.push("severity");
  if (!ALLOWED_CATEGORY.has(issue_category)) errors.push("issue_category");
  if (related_entity_type && !ALLOWED_ENTITY.has(related_entity_type)) errors.push("related_entity_type");
  if (verified_email && !looksLikeEmail(verified_email)) errors.push("verified_email");
  if (errors.length) return json(400, { success: false, error: "validation_failed", fields: errors });

  const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // --- idempotency: replay returns original ticket -----------------------
  const { data: prior } = await svc
    .from("support_ticket_webhook_events")
    .select("id, ticket_id")
    .eq("source", "vapi_callback")
    .eq("external_event_id", call_id!)
    .maybeSingle();

  if (prior?.ticket_id) {
    const { data: existingTicket } = await svc
      .from("support_tickets")
      .select("id, reference_code, forwarding_status")
      .eq("id", prior.ticket_id)
      .maybeSingle();
    if (existingTicket) {
      return json(200, {
        success: true,
        ticket_created: false,
        deduped: true,
        ticket_id: existingTicket.id,
        reference: existingTicket.reference_code,
        forwarding_status: existingTicket.forwarding_status,
        retryable: false,
        confirmation_message: `We already opened ticket ${existingTicket.reference_code} for this call.`,
      });
    }
  }

  // --- email verification handling --------------------------------------
  // Trust ONLY explicit verification metadata from the assistant runtime.
  // A raw email string is never enough to unlock account context.
  const email_verified =
    !!verified_email &&
    email_verification_method === "otp" &&
    email_verification_result === "verified";

  // Best-effort account lookup — never leaks account data into the response;
  // used only to link the ticket to the correct user_id when verified.
  let linkedUserId: string | null = null;
  if (email_verified && verified_email) {
    const { data: profile } = await svc
      .from("profiles")
      .select("id")
      .eq("email", verified_email)
      .maybeSingle();
    linkedUserId = profile?.id ?? null;
  }

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
    // uuid columns only — validate crudely to avoid insert errors
    if (col && /^[0-9a-fA-F-]{10,64}$/.test(related_entity_id)) relatedPatch[col] = related_entity_id;
  }

  // --- insert ticket -----------------------------------------------------
  const { data: ticket, error: insertErr } = await svc
    .from("support_tickets")
    .insert({
      user_id: linkedUserId,
      source: "vapi_callback",
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
      vapi_call_id: call_id,
      request_id: `vapi:${call_id}`,
      page_url: null,
      forwarding_status: "pending",
      ...relatedPatch,
    })
    .select("id, reference_code, priority, forwarding_status")
    .single();

  if (insertErr || !ticket) {
    console.error("[vapi-create-support-ticket] insert failed", insertErr);
    return json(500, {
      success: false,
      ticket_created: false,
      retryable: true,
      error: "ticket_persist_failed",
      confirmation_message:
        "I couldn't open the ticket right now. Please try again or email support@vendibook.com.",
    });
  }

  // Reserve idempotency row now that ticket exists.
  await svc.from("support_ticket_webhook_events").insert({
    source: "vapi_callback",
    external_event_id: call_id!,
    event_type: "vapi_tool_call",
    payload: {
      severity: severityIn,
      issue_category,
      priority_derived: priority,
      email_verified,
      email_verification_method,
      preferred_follow_up,
    },
    ticket_id: ticket.id,
    processed_at: new Date().toISOString(),
  });

  await svc.from("support_ticket_audit_events").insert({
    ticket_id: ticket.id,
    event_type: "vapi_callback_captured",
    actor_type: "system",
    external_ref: call_id,
    details: {
      call_summary,
      callback_phone,
      severity_reported: severityIn,
      email_verified,
      issue_category,
      related_entity_type,
      related_entity_id,
    },
  });

  // --- forward to Tawk (private address, never exposed) ------------------
  const forwardResult = await forwardTicketToTawk({
    referenceCode: ticket.reference_code,
    ticketId: ticket.id,
    subject: issue_summary!,
    priority: priority,
    category: internalCategory,
    featureArea,
    source: "vapi_callback",
    customerName: customer_name,
    customerEmail: verified_email,
    emailVerified: email_verified,
    callbackPhone: callback_phone,
    bodyText: descriptionParts,
    context: {
      severity: severityIn,
      issue_category,
      related_entity_type,
      related_entity_id,
      preferred_follow_up,
    },
    callId: call_id,
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

  return json(200, {
    success: true,
    ticket_created: true,
    ticket_id: ticket.id,
    reference: ticket.reference_code,
    priority: ticket.priority,
    forwarding_status: forwardResult.status,
    retryable,
    confirmation_message: forwardingOk
      ? `I've opened ticket ${ticket.reference_code}. Our support team has it now.`
      : `I've opened ticket ${ticket.reference_code}, but the handoff to our support inbox is still syncing. If you don't hear back within a business day, please email support@vendibook.com and reference ${ticket.reference_code}.`,
  });
});
