import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { capturePayPalOrder, getPayPalOrder, PayPalError, safeLog } from "../_shared/paypal.ts";
import { extractCaptureFacts, finalizeCapture } from "../_shared/paypalFinalize.ts";
import { auditPayment, requestIp } from "../_shared/paymentAudit.ts";
import { classifyCaptureFailure, presentPaymentStatus } from "../_shared/orders/orderStatus.ts";
import { closeAttempt, latestAttempt, openAttempt, recordOrderEvent } from "../_shared/orders/orderEvents.ts";
import { deliverOrderReceipt } from "../_shared/orders/deliverOrderReceipt.ts";

/**
 * Checkout recovery for an existing order.
 *
 * `action: "status"`  — reconciles against PayPal, never charges.
 * `action: "retry"`   — re-captures the SAME PayPal order after proving no
 *                       capture already exists, so an ambiguous timeout can
 *                       never turn into a double charge.
 *
 * The buyer's booking, dates, documents, promotions and fulfillment choices
 * live on the order record and are untouched by a retry.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in to continue.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired.");

    const { order_id, action } = await req.json().catch(() => ({}));
    if (!order_id) return jsonError(400, "missing_fields", "An order identifier is required.");
    const mode: "status" | "retry" = action === "retry" ? "retry" : "status";

    const { data: record } = await admin
      .from("payment_records")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();
    if (!record) return jsonError(404, "not_found", "We couldn't find that order.");
    if (record.buyer_id !== user.id) {
      return jsonError(403, "forbidden", "This order belongs to another account.");
    }

    // ---- already settled: nothing to do, and definitely nothing to charge.
    if (record.payment_status === "completed") {
      return jsonResponse(200, settledPayload(record, "already_completed"));
    }
    if (["refunded", "cancelled", "reversed"].includes(record.payment_status)) {
      return jsonError(409, "order_not_payable", "This order is closed and can no longer be paid.");
    }

    // ---- retry rate limit: max 5 capture attempts per order per 10 minutes.
    if (mode === "retry") {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("payment_attempts")
        .select("id", { count: "exact", head: true })
        .eq("payment_record_id", record.id)
        .gte("created_at", since);
      if ((count ?? 0) >= 5) {
        return jsonError(429, "too_many_attempts", "Too many payment attempts. Please wait a few minutes or contact support.");
      }
    }

    if (!record.paypal_order_id) {
      return jsonError(409, "no_provider_order", "This order needs a new payment session. Please start checkout again.");
    }

    // ---- reconcile first: read PayPal's truth before doing anything.
    let providerOrder: any;
    try {
      providerOrder = await getPayPalOrder(record.paypal_order_id);
    } catch (err) {
      const cls = classifyCaptureFailure({
        issue: err instanceof PayPalError ? err.issue : null,
        status: err instanceof PayPalError ? err.status : null,
      });
      if (cls.category === "terminal") {
        await markExpired(admin, record, cls.code);
        return jsonResponse(200, {
          status: "expired",
          reconciled: true,
          payable: false,
          message: "This PayPal payment session expired. Your order is still saved — start a new payment to continue.",
        });
      }
      return jsonResponse(503, {
        code: "provider_unavailable",
        error: cls.safeMessage,
        payable: true,
        retryable: true,
      });
    }

    const existingFacts = extractCaptureFacts(providerOrder);
    if (existingFacts) {
      // A capture already exists upstream — adopt it instead of charging again.
      const updated = await finalizeCapture(admin, record, existingFacts, "capture_endpoint");
      await recordOrderEvent(admin, {
        paymentRecordId: record.id,
        code: "order_reconciled",
        title: "Payment status reconciled with PayPal",
        description: "We confirmed the existing PayPal capture for this order.",
        dedupeKey: `reconciled:${existingFacts.captureId}`,
      });
      await deliverOrderReceipt(admin, updated.id);
      return jsonResponse(200, settledPayload(updated, "reconciled"));
    }

    const providerStatus = String(providerOrder?.status ?? "").toUpperCase();

    if (mode === "status") {
      return jsonResponse(200, {
        status: providerStatus.toLowerCase(),
        reconciled: true,
        payable: ["CREATED", "SAVED", "APPROVED", "PAYER_ACTION_REQUIRED"].includes(providerStatus),
        needs_approval: providerStatus !== "APPROVED",
        message: providerStatus === "APPROVED"
          ? "Your payment is approved and ready to be completed."
          : "This order is still awaiting payment approval in PayPal.",
      });
    }

    // ---- retry: only capture an APPROVED order.
    if (providerStatus !== "APPROVED") {
      return jsonResponse(200, {
        status: providerStatus.toLowerCase(),
        payable: true,
        needs_approval: true,
        message: "Approve the payment in PayPal to finish checking out. Your order details are saved.",
      });
    }

    const attempt = await openAttempt(admin, {
      paymentRecordId: record.id,
      buyerId: user.id,
      providerOrderId: record.paypal_order_id,
      status: "capture_pending",
    });

    let captured: any;
    try {
      captured = await capturePayPalOrder(record.paypal_order_id, `capture:${record.reference}`);
    } catch (err) {
      const isPayPal = err instanceof PayPalError;
      if (isPayPal && (err as PayPalError).issue === "ORDER_ALREADY_CAPTURED") {
        captured = await getPayPalOrder(record.paypal_order_id);
      } else {
        const cls = classifyCaptureFailure({
          issue: isPayPal ? (err as PayPalError).issue : null,
          status: isPayPal ? (err as PayPalError).status : null,
          networkError: !isPayPal,
        });
        await closeAttempt(admin, attempt?.id, {
          status: cls.attemptStatus,
          failureCategory: cls.category,
          failureCode: cls.code,
          failureMessageSafe: cls.safeMessage,
          failureMessageInternal: (err as Error).message?.slice(0, 900) ?? null,
        });
        await admin.from("payment_records").update({
          payment_status: cls.category === "terminal" ? "declined" : record.payment_status,
          last_error: { code: cls.code, category: cls.category },
        }).eq("id", record.id);
        await recordOrderEvent(admin, {
          paymentRecordId: record.id,
          code: "capture_failed",
          title: "Payment attempt did not complete",
          description: cls.safeMessage,
          visibility: "buyer",
        });
        safeLog("retry_capture_failed", { reference: record.reference, code: cls.code });
        return jsonResponse(cls.category === "terminal" ? 402 : 503, {
          code: cls.category === "terminal" ? "payment_declined" : "capture_unconfirmed",
          error: cls.safeMessage,
          retryable: cls.category === "retryable",
          payable: true,
          order_preserved: true,
        });
      }
    }

    const facts = extractCaptureFacts(captured);
    if (!facts) {
      await closeAttempt(admin, attempt?.id, {
        status: "capture_failed_retryable",
        failureCategory: "retryable",
        failureCode: "unconfirmed",
        failureMessageSafe: "We couldn't confirm the payment yet. Your order is still saved.",
      });
      return jsonResponse(503, {
        code: "capture_unconfirmed",
        error: "We couldn't confirm the payment yet. Your order is still saved. Please retry or wait while we check the transaction status.",
        retryable: true,
        payable: true,
        order_preserved: true,
      });
    }

    const updated = await finalizeCapture(admin, record, facts, "capture_endpoint");
    await closeAttempt(admin, attempt?.id, { status: "captured", providerCaptureId: facts.captureId });
    await recordOrderEvent(admin, {
      paymentRecordId: record.id,
      code: "payment_retried",
      title: "Payment completed on retry",
      description: "Your payment went through — no new order was created.",
      visibility: "buyer",
      dedupeKey: `retry-captured:${facts.captureId}`,
    });
    await deliverOrderReceipt(admin, updated.id);

    await auditPayment(admin, {
      actorId: user.id,
      actorRole: "user",
      actorIp: requestIp(req),
      provider: "paypal",
      action: "order.retry_captured",
      entityType: "payment_record",
      entityId: record.id,
      reference: record.reference,
      captureId: facts.captureId,
      newValue: { payment_status: updated.payment_status },
    });

    return jsonResponse(200, settledPayload(updated, "captured"));
  } catch (err) {
    return unknownErrorResponse(err);
  }
});

function settledPayload(record: Record<string, any>, outcome: string) {
  const presentation = presentPaymentStatus({
    paymentStatus: record.payment_status,
    internalStatus: record.internal_status,
    disputeStatus: record.dispute_status,
    refundedCents: record.refunded_cents,
    grossAmountCents: record.gross_amount_cents,
  });
  return {
    outcome,
    status: presentation.code,
    label: presentation.label,
    message: presentation.description,
    payable: false,
    order_id: record.id,
    reference: record.reference,
    capture_id: record.paypal_capture_id ?? null,
  };
}

async function markExpired(admin: any, record: Record<string, any>, code: string) {
  await admin.from("payment_records").update({
    last_error: { code, category: "terminal" },
  }).eq("id", record.id);
  const attempt = await latestAttempt(admin, record.id);
  if (attempt && !attempt.completed_at) {
    await closeAttempt(admin, attempt.id, {
      status: "expired",
      failureCategory: "terminal",
      failureCode: code,
      failureMessageSafe: "This PayPal payment session expired. Your order is still saved.",
    });
  }
}
