import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";

/**
 * Administrator actions on the manual seller-payout queue.
 *
 * Guard rails enforced here AND at the database level:
 *  - payment must be completed and undisputed before approval
 *  - a completed payout can never be re-opened or paid twice
 *  - "completed" requires an external transfer reference
 *  - every action is written to payout_actions as an audit record
 */

type Action =
  | "mark_eligible"
  | "hold"
  | "release_hold"
  | "approve"
  | "start_payout"
  | "record_manual_payout"
  | "mark_completed"
  | "mark_failed"
  | "retry"
  | "add_note";

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
    if (!isAdmin) return jsonError(403, "forbidden", "Administrator access required.");

    const body = await req.json().catch(() => ({}));
    const action = body?.action as Action;
    const payableId = body?.payable_id as string | undefined;
    if (!action || !payableId) {
      return jsonError(400, "missing_fields", "Missing action or payable id.");
    }

    const { data: payable } = await admin.from("seller_payables")
      .select("*, payment:payment_records(*)")
      .eq("id", payableId)
      .maybeSingle();
    if (!payable) return jsonError(404, "not_found", "Payout record not found.");

    const payment = (payable as any).payment;
    const from = payable.status;
    let patch: Record<string, unknown> = {};
    let note: string | null = body?.note ?? null;
    let externalReference: string | null = body?.external_reference ?? null;

    const blockers = payoutBlockers(payable, payment);

    switch (action) {
      case "add_note":
        if (!note) return jsonError(400, "missing_fields", "A note is required.");
        patch = { admin_notes: [payable.admin_notes, note].filter(Boolean).join("\n") };
        break;

      case "mark_eligible":
        if (blockers.length) return jsonError(409, "payout_blocked", blockers[0]);
        patch = { status: "eligible_for_review", hold_reason: null };
        break;

      case "hold":
        if (payable.status === "payout_completed") {
          return jsonError(409, "payout_blocked", "This payout is already completed.");
        }
        patch = { status: "payout_on_hold", hold_reason: note ?? "Administrative hold." };
        break;

      case "release_hold":
        if (payable.status !== "payout_on_hold") {
          return jsonError(409, "invalid_state", "This payout isn't on hold.");
        }
        patch = { status: "pending_release", hold_reason: null };
        break;

      case "approve":
        if (blockers.length) return jsonError(409, "payout_blocked", blockers[0]);
        if (payable.status === "payout_approved" || payable.status === "payout_processing") {
          return jsonError(409, "already_approved", "This payout is already approved.");
        }
        patch = {
          status: "payout_approved",
          payout_approved_at: new Date().toISOString(),
          payout_approved_by: user.id,
          payout_idempotency_key: payable.payout_idempotency_key ?? `payout:${payable.id}`,
          hold_reason: null,
        };
        break;

      case "start_payout":
        if (payable.status !== "payout_approved") {
          return jsonError(409, "invalid_state", "Approve the payout before starting it.");
        }
        patch = {
          status: "payout_processing",
          payout_method: body?.payout_method ?? payable.payout_method,
        };
        break;

      case "record_manual_payout": {
        if (!externalReference) {
          return jsonError(
            400,
            "missing_reference",
            "An external transfer reference is required to record a payout.",
          );
        }
        if (payable.status === "payout_completed") {
          return jsonError(409, "already_paid", "This seller has already been paid.");
        }
        if (!["payout_approved", "payout_processing", "payout_failed"].includes(payable.status)) {
          return jsonError(409, "invalid_state", "Approve the payout before recording a transfer.");
        }
        patch = {
          status: "payout_processing",
          external_payout_reference: externalReference,
          payout_method: body?.payout_method ?? payable.payout_method,
          payout_provider: body?.payout_provider ?? payable.payout_provider,
          dwolla_transfer_id: body?.dwolla_transfer_id ?? payable.dwolla_transfer_id,
        };
        note = note ?? `Manual transfer recorded (${externalReference}).`;
        break;
      }

      case "mark_completed": {
        const reference = externalReference ?? payable.external_payout_reference;
        if (!reference && !payable.dwolla_transfer_id) {
          return jsonError(
            400,
            "missing_reference",
            "A confirmed external transfer reference is required before completing a payout.",
          );
        }
        if (payable.status === "payout_completed") {
          return jsonError(409, "already_paid", "This payout is already completed.");
        }
        patch = {
          status: "payout_completed",
          external_payout_reference: reference,
          payout_completed_at: new Date().toISOString(),
          failure_reason: null,
        };
        externalReference = reference;
        break;
      }

      case "mark_failed":
        if (payable.status === "payout_completed") {
          return jsonError(409, "already_paid", "A completed payout can't be marked failed.");
        }
        patch = { status: "payout_failed", failure_reason: note ?? "Payout failed." };
        break;

      case "retry":
        if (payable.status !== "payout_failed") {
          return jsonError(409, "invalid_state", "Only a failed payout can be retried.");
        }
        patch = { status: "payout_approved", failure_reason: null };
        break;

      default:
        return jsonError(400, "invalid_action", "Unsupported payout action.");
    }

    const { data: updated, error: updateErr } = await admin.from("seller_payables")
      .update(patch).eq("id", payableId).select().maybeSingle();

    if (updateErr) {
      return jsonError(409, "update_rejected", updateErr.message);
    }

    await admin.from("payout_actions").insert({
      payable_id: payableId,
      action,
      actor_id: user.id,
      from_status: from,
      to_status: (patch.status as string) ?? from,
      note,
      external_reference: externalReference,
    });

    return jsonResponse(200, { success: true, payable: updated });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});

/** Reasons a payout must not be approved right now. */
function payoutBlockers(payable: any, payment: any): string[] {
  const reasons: string[] = [];
  if (!payment || payment.payment_status !== "completed") {
    reasons.push("The buyer payment is not confirmed as completed.");
  }
  if (payment && payment.dispute_status && !["none", "resolved"].includes(payment.dispute_status)) {
    reasons.push("An active dispute is open on this payment.");
  }
  if (["fully_refunded", "reversed", "cancelled", "disputed"].includes(payable.status)) {
    reasons.push("This payment was refunded, reversed, disputed or cancelled.");
  }
  if (payable.status === "payout_completed") {
    reasons.push("This seller has already been paid for this transaction.");
  }
  if ((payable.net_payout_cents ?? 0) <= 0) {
    reasons.push("The payout amount is zero after refunds and fees.");
  }
  if (payable.hold_reason && payable.status === "payout_on_hold") {
    reasons.push(`A hold is in place: ${payable.hold_reason}`);
  }
  return reasons;
}
