import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { centsFromPayPalAmount, PayPalError, refundPayPalCapture, safeLog } from "../_shared/paypal.ts";
import { appendLedgerEntry, recalculatePayableAfterRefund } from "../_shared/paypalAccounting.ts";
import { notifyOrderParties } from "../_shared/notify.ts";
import { auditPayment, requestIp } from "../_shared/paymentAudit.ts";

/**
 * PayPal refund, callable by a Vendibook administrator or by the seller on
 * their own order. Always calls PayPal — never a DB-only status flip.
 *
 * Commission on refunds follows the published Payments Terms: the Vendibook
 * commission is recalculated against the amount the buyer actually kept, so a
 * full refund returns the full commission and a partial refund keeps
 * commission only on the retained amount (see recalculatePayableAfterRefund).
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
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired.");

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });

    const { payment_record_id, amount_cents, reason } = await req.json().catch(() => ({}));
    if (!payment_record_id) return jsonError(400, "missing_fields", "Missing payment record id.");

    const { data: record } = await admin.from("payment_records").select("*")
      .eq("id", payment_record_id).maybeSingle();
    if (!record) return jsonError(404, "not_found", "Payment record not found.");

    // Sellers may refund their own orders; everyone else needs admin rights.
    const isSeller = !!record.seller_id && record.seller_id === user.id;
    if (!isAdmin && !isSeller) {
      return jsonError(403, "forbidden", "You can only refund your own orders.");
    }
    const actorRole = isAdmin ? "admin" : "seller";
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
      // Connected Path captures live in the seller's PayPal account, so the
      // refund must be issued on their behalf.
      actAsMerchantId: (record.metadata as any)?.multiparty?.merchant_id ?? null,
    });

    const refundedNow = centsFromPayPalAmount(refund?.amount?.value) || requested;
    const totalRefunded = (record.refunded_cents ?? 0) + refundedNow;

    await appendLedgerEntry(admin, {
      paymentRecordId: record.id,
      entryType: "refund",
      amountCents: refundedNow,
      currency: record.currency,
      direction: "debit",
      description: reason
        ? `${isAdmin ? "Admin" : "Seller"} refund — ${reason}`
        : `${isAdmin ? "Admin" : "Seller"} refund`,
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
        // Connected Path: PayPal already settled this into the seller's own
        // account, so the payout status stays completed — but the refund must
        // still be visible on the payout record in the Payments UI.
        await admin.from("seller_payables").update({
          refunded_cents: totalRefunded,
          hold_reason:
            `Refund of ${(totalRefunded / 100).toFixed(2)} issued after this payout settled — under recovery review.`,
        }).eq("id", payable.id);
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
      actorRole,
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

    await notifyOrderParties(admin, record, {
      type: "refund_initiated",
      buyer: {
        title: "Refund on the way",
        message: `A refund of ${(refundedNow / 100).toLocaleString("en-US", { style: "currency", currency: record.currency ?? "USD" })} was issued for order ${record.reference}. It can take a few business days to appear.`,
      },
      seller: {
        title: "A refund was issued",
        message: `Order ${record.reference} was refunded. Your payout has been recalculated.`,
      },
      dedupeKey: `refund-initiated:${refund?.id ?? idempotencyKey}`,
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
      const issue = String((err as any).issue ?? "").toUpperCase();
      // The most common real-world failure: the seller's PayPal balance can't
      // cover the refund. This is recoverable — tell them exactly what to do
      // instead of a dead end.
      if (issue.includes("INSUFFICIENT") || issue.includes("SENDER_RESTRICTED")) {
        return jsonError(
          409,
          "insufficient_paypal_balance",
          "PayPal declined the refund because the account balance can't cover it right now. Add funds to your PayPal balance or link a backup funding source, then try the refund again.",
        );
      }
      if (issue.includes("CANNOT_BE_REFUNDED") || issue.includes("REFUND_TIME_LIMIT")) {
        return jsonError(
          409,
          "refund_not_allowed",
          "PayPal can no longer refund this payment automatically. Contact support@vendibook.com and we'll help you settle it with the buyer.",
        );
      }
      return jsonError(502, "paypal_error", "PayPal could not process this refund right now. Nothing was charged or changed — please try again in a moment.");
    }
    return unknownErrorResponse(err);
  }
});
