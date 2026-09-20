import { captureFailure, captureFromOrder } from "../_shared/paypalCaptureOutcome.ts";
import { cardAuthenticationReady } from "../_shared/paypalCardPolicy.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { capturePayPalOrder, getPayPalOrder, PayPalError, safeLog } from "../_shared/paypal.ts";
import { CaptureRejectedError, extractCaptureFacts, finalizeCapture } from "../_shared/paypalFinalize.ts";
import { auditPayment, requestIp } from "../_shared/paymentAudit.ts";
import { getListingPurchaseState, LISTING_UNAVAILABLE_MESSAGE } from "../_shared/listingGuard.ts";
import { recordOrderEvent } from "../_shared/orders/orderEvents.ts";
import { notifyUser } from "../_shared/notify.ts";


/**
 * Captures an approved PayPal order and verifies it server-side.
 * A frontend approval callback is never treated as proof of payment.
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

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return jsonError(400, "missing_fields", "Missing order id.");

    const { data: record } = await admin
      .from("payment_records")
      .select("*")
      .eq("paypal_order_id", order_id)
      .maybeSingle();

    if (!record) return jsonError(404, "not_found", "We couldn't find that payment.");
    if (record.buyer_id !== user.id) {
      return jsonError(403, "forbidden", "This payment belongs to another account.");
    }

    // Already finalised (capture endpoint raced the webhook) — return success.
    if (record.payment_status === "completed") {
      return jsonResponse(200, {
        status: "completed",
        already_completed: true,
        reference: record.reference,
        capture_id: record.paypal_capture_id,
      });
    }

    // --------------------------------------------------------------- race
    // The listing may have been paused, removed, sold, archived, suspended or
    // deleted while the buyer was inside the PayPal approval window. Re-check
    // the canonical state immediately before capturing.
    if (record.listing_id) {
      const state = await getListingPurchaseState(admin, record.listing_id);
      if (!state.purchasable) {
        // Reconcile the ambiguous provider state before deciding.
        let providerOrder: any = null;
        try {
          providerOrder = await getPayPalOrder(order_id);
        } catch (_err) {
          providerOrder = null;
        }
        const providerFacts = extractCaptureFacts(providerOrder);
        if (!providerOrder || providerFacts?.status === "PENDING") {
          return jsonResponse(200, { status: "pending", pending: true, reference: record.reference, message: "Payment verification is pending. Do not submit another payment." });
        }
        const alreadyCaptured = providerFacts?.status === "COMPLETED";

        await admin.from("payment_records").update({
          // `paypal_payment_status` stays factual; fulfillment is blocked via
          // `internal_status`, which the payout/fulfilment paths respect.
          payment_status: alreadyCaptured ? "completed" : "cancelled",
          internal_status: alreadyCaptured
            ? "refund_review_listing_unavailable"
            : "cancelled_listing_unavailable",
          last_error: {
            reason: "listing_unavailable",
            listing_reason: state.reason,
            listing_status: state.status,
          },
        }).eq("id", record.id);

        await recordOrderEvent(admin, {
          paymentRecordId: record.id,
          code: alreadyCaptured ? "refund_requested" : "capture_failed",
          title: alreadyCaptured
            ? "Listing became unavailable — refund review opened"
            : "Listing became unavailable — payment not captured",
          description: alreadyCaptured
            ? "The listing was withdrawn after payment was captured. Fulfillment is blocked and a refund is being processed."
            : LISTING_UNAVAILABLE_MESSAGE,
          actorRole: "system",
          visibility: "both",
          dedupeKey: `listing_unavailable:${record.id}`,
          metadata: { listing_reason: state.reason, listing_status: state.status },
        });

        await auditPayment(admin, {
          actorId: user.id,
          actorRole: "user",
          actorIp: requestIp(req),
          provider: "paypal",
          action: alreadyCaptured ? "capture.blocked_refund_required" : "capture.blocked",
          entityType: "payment_record",
          entityId: record.id,
          reference: record.reference,
          newValue: { listing_reason: state.reason, listing_status: state.status },
        });

        await notifyUser(admin, {
          userId: record.buyer_id,
          type: "payment",
          title: alreadyCaptured ? "Refund on the way" : "Listing no longer available",
          message: alreadyCaptured
            ? `The listing for order ${record.reference} was withdrawn after your payment. Nothing will be fulfilled and a refund is being processed.`
            : `${LISTING_UNAVAILABLE_MESSAGE} Order ${record.reference} was not completed.`,
          link: `/orders/${record.id}`,
          dedupeKey: `listing_unavailable:${record.id}`,
        });

        return jsonError(409, "listing_unavailable", LISTING_UNAVAILABLE_MESSAGE, {
          refund_pending: alreadyCaptured,
          reference: record.reference,
        });
      }
    }

    if (record.fee_breakdown?.checkout_source === "card_fields") {
      // Read the actual card authentication result; never trust SDK callbacks
      // or a browser-supplied liabilityShift when deciding whether to capture.
      const approvedOrder = await getPayPalOrder(order_id);
      const capture = captureFromOrder(approvedOrder);
      if (!capture && (approvedOrder.status !== "APPROVED" ||
        !approvedOrder.payment_source?.card || !cardAuthenticationReady(approvedOrder.payment_source.card))) {
        return jsonError(409, "card_verification_required", "Card verification is incomplete or was not successful. Use a different payment method or try the card again.", {
          reference: record.reference,
          recoverable: true,
        });
      }
    }

    if (record.booking_request_id) {
      const { error: lockError } = await admin.rpc("claim_rental_capture", { p_record: record.id });
      if (lockError) return jsonError(409, "rental_payment_not_ready", lockError.message);
    }
    let order: any;
    try {
      order = await capturePayPalOrder(order_id, `capture:${record.reference}`);
    } catch (err) {
      if (err instanceof PayPalError && err.issue === "ORDER_ALREADY_CAPTURED") {
        order = await getPayPalOrder(order_id).catch(() => null);
      } else if (err instanceof PayPalError && err.status < 500 && err.status !== 429) {
        const failure = captureFailure(err.issue, err.status);
        await admin.from("payment_records").update({
          payment_status: failure.status,
          internal_status: failure.code,
          last_error: { issue: err.issue ?? null, reason: failure.message, debug_id: err.debugId ?? null },
        }).eq("id", record.id).neq("payment_status", "completed");
        if (record.booking_request_id) {
          // Definitive provider refusal: no capture. Ambiguous errors retain the lock.
          await admin.from("booking_requests").update({ payment_lock_record_id: null })
            .eq("id", record.booking_request_id).eq("payment_lock_record_id", record.id).neq("payment_status", "paid");
        }
        // PAYER_ACTION_REQUIRED: PayPal returns a HATEOAS `payer-action` link
        // the buyer must complete. Hand it to the client instead of dead-ending.
        let payerActionUrl: string | null = null;
        if (err.issue === "PAYER_ACTION_REQUIRED") {
          const pending = await getPayPalOrder(order_id).catch(() => null);
          payerActionUrl =
            (pending?.links ?? []).find((l: any) => l?.rel === "payer-action")?.href ?? null;
        }
        // INSTRUMENT_DECLINED is recoverable on a Buttons checkout: the payer
        // can pick another funding source via actions.restart().
        return jsonError(failure.status === "declined" ? 402 : 409, failure.code, failure.message, {
          reference: record.reference,
          issue: err.issue ?? null,
          debug_id: err.debugId ?? null,
          recoverable: err.issue === "INSTRUMENT_DECLINED",
          ...(payerActionUrl ? { payer_action_url: payerActionUrl } : {}),
        });

      } else {
        {
          await admin.from("payment_records").update({ payment_status: "pending", internal_status: "capture_verification_pending" }).eq("id", record.id).neq("payment_status", "completed");
          if (record.booking_request_id) await admin.from("booking_requests").update({ payment_status: "pending" }).eq("id", record.booking_request_id).eq("payment_lock_record_id", record.id).neq("payment_status", "paid");
          return jsonResponse(200, { status: "pending", pending: true, reference: record.reference, message: "PayPal confirmation is pending. Do not submit another payment." });
        }
      }
    }

    const facts = extractCaptureFacts(order);
    if (!facts) {
      {
        await admin.from("payment_records").update({ payment_status: "pending", internal_status: "capture_verification_pending" }).eq("id", record.id).neq("payment_status", "completed");
        if (record.booking_request_id) await admin.from("booking_requests").update({ payment_status: "pending" }).eq("id", record.booking_request_id).eq("payment_lock_record_id", record.id).neq("payment_status", "paid");
        return jsonResponse(200, { status: "pending", pending: true, reference: record.reference, message: "Payment verification is pending. Check this payment before trying again." });
      }

    }

    let updated;
    try {
      updated = await finalizeCapture(admin, record, facts, "capture_endpoint");
    } catch (err) {
      if (err instanceof CaptureRejectedError) {
        // Money may have moved at PayPal, but nothing was fulfilled and the
        // record is flagged for review. Never report this as a success.
        safeLog("capture_rejected", { reference: record.reference, reason: err.reason });
        return jsonError(409, err.reason, err.message);
      }
      throw err;
    }
    safeLog("capture_finalized", { reference: record.reference, status: facts.status });

    await auditPayment(admin, {
      actorId: user.id,
      actorRole: "user",
      actorIp: requestIp(req),
      provider: "paypal",
      action: "order.captured",
      entityType: "payment_record",
      entityId: record.id,
      reference: record.reference,
      captureId: facts.captureId,
      oldValue: { payment_status: record.payment_status },
      newValue: {
        payment_status: updated.payment_status,
        amount_cents: facts.amountCents,
        currency: facts.currency,
      },
    });


    return jsonResponse(200, {
      status: updated.payment_status,
      reference: updated.reference,
      capture_id: facts.captureId,
      amount_cents: updated.gross_amount_cents,
      currency: updated.currency,
      pending: updated.payment_status === "pending",
      ...(updated.payment_status === "declined" || updated.payment_status === "failed" ? { message: `PayPal reported capture status ${facts.status}. Choose another payment method.`, issue: facts.status } : {}),
    });
  } catch (err) {
    if (err instanceof PayPalError) {
      return jsonError(502, "paypal_error", "We couldn't reach PayPal. Please try again.");
    }
    return unknownErrorResponse(err);
  }
});
