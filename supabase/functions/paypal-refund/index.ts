import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { centsFromPayPalAmount, PayPalError, refundPayPalCapture, safeLog } from "../_shared/paypal.ts";
import { appendLedgerEntry, recalculatePayableAfterRefund } from "../_shared/paypalAccounting.ts";
import { auditPayment, requestIp } from "../_shared/paymentAudit.ts";

/** Administrator-only PayPal refund. Always calls PayPal — never a DB-only status flip. */
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

    const { payment_record_id, amount_cents, reason } = await req.json().catch(() => ({}));
    if (!payment_record_id) return jsonError(400, "missing_fields", "Missing payment record id.");

    const { data: record } = await admin.from("payment_records").select("*")
      .eq("id", payment_record_id).maybeSingle();
    if (!record) return jsonError(404, "not_found", "Payment record not found.");
    if (!record.paypal_capture_id) {
      return jsonError(409, "not_captured", "This payment has no PayPal capture to refund.");
    }
    if (record.provider !== "paypal") {
      return jsonError(409, "wrong_provider", "Only PayPal payments can be refunded here.");
    }

    const remaining = record.gross_amount_cents - (record.refunded_cents ?? 0);
    if (remaining <= 0) return jsonError(409, "already_refunded", "This payment is fully refunded.");

    const requested = amount_cents ? Math.min(Number(amount_cents), remaining) : remaining;
    if (requested <= 0) return jsonError(400, "invalid_amount", "Refund amount must be positive.");

    const isFull = requested >= remaining;
    const idempotencyKey = `refund:${record.reference}:${record.refunded_cents ?? 0}:${requested}`;

    const refund = await refundPayPalCapture({
      captureId: record.paypal_capture_id,
      amountCents: isFull && (record.refunded_cents ?? 0) === 0 ? undefined : requested,
      currency: record.currency,
      reason,
      idempotencyKey,
    });

    const refundedNow = centsFromPayPalAmount(refund?.amount?.value) || requested;
    const totalRefunded = (record.refunded_cents ?? 0) + refundedNow;

    await appendLedgerEntry(admin, {
      paymentRecordId: record.id,
      entryType: "refund",
      amountCents: refundedNow,
      currency: record.currency,
      direction: "debit",
      description: reason ? `Admin refund — ${reason}` : "Admin refund",
      externalReference: refund?.id,
      dedupeKey: `refund:${refund?.id ?? idempotencyKey}`,
      actorId: user.id,
    });

    await admin.from("payment_records").update({
      refunded_cents: totalRefunded,
      payment_status: totalRefunded >= record.gross_amount_cents ? "refunded" : "partially_refunded",
      refunded_at: new Date().toISOString(),
      metadata: { ...(record.metadata ?? {}), last_refund_id: refund?.id, last_refund_reason: reason ?? null },
    }).eq("id", record.id);

    const { data: payable } = await admin.from("seller_payables").select("*")
      .eq("payment_record_id", record.id).maybeSingle();

    if (payable) {
      if (payable.status === "payout_completed") {
        await admin.from("payout_actions").insert({
          payable_id: payable.id,
          action: "recovery_required",
          actor_id: user.id,
          from_status: payable.status,
          to_status: payable.status,
          note: `Refund of ${(refundedNow / 100).toFixed(2)} issued after payout completed — recovery review required.`,
          external_reference: refund?.id ?? null,
        });
      } else {
        const next = recalculatePayableAfterRefund(payable, totalRefunded);
        await admin.from("seller_payables").update({
          refunded_cents: totalRefunded,
          net_payout_cents: next.net_payout_cents,
          status: next.status,
          hold_reason: next.hold_reason,
        }).eq("id", payable.id);
        await admin.from("payout_actions").insert({
          payable_id: payable.id,
          action: "refund_recalculated",
          actor_id: user.id,
          from_status: payable.status,
          to_status: next.status,
          note: next.hold_reason,
          external_reference: refund?.id ?? null,
        });
      }
    }

    await auditPayment(admin, {
      actorId: user.id,
      actorRole: "admin",
      actorIp: requestIp(req),
      provider: "paypal",
      action: isFull ? "refund.full" : "refund.partial",
      entityType: "refund",
      entityId: record.id,
      reference: record.reference,
      captureId: record.paypal_capture_id,
      refundId: refund?.id ?? null,
      oldValue: { refunded_cents: record.refunded_cents ?? 0, payment_status: record.payment_status },
      newValue: { refunded_cents: totalRefunded, refunded_now_cents: refundedNow, reason: reason ?? null },
    });

    safeLog("refund_processed", { reference: record.reference, refundedNow });

    return jsonResponse(200, {
      success: true,
      refund_id: refund?.id,
      refund_status: refund?.status,
      refunded_cents: refundedNow,
      total_refunded_cents: totalRefunded,
    });
  } catch (err) {
    if (err instanceof PayPalError) {
      return jsonError(502, "paypal_error", "PayPal could not process this refund right now.");
    }
    return unknownErrorResponse(err);
  }
});
