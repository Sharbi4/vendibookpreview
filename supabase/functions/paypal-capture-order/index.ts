import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { capturePayPalOrder, getPayPalOrder, PayPalError, safeLog } from "../_shared/paypal.ts";
import { extractCaptureFacts, finalizeCapture } from "../_shared/paypalFinalize.ts";
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
        const alreadyCaptured = providerOrder?.status === "COMPLETED";

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

    let order: any;
    try {
      order = await capturePayPalOrder(order_id, `capture:${record.reference}`);
    } catch (err) {
      if (err instanceof PayPalError && err.issue === "ORDER_ALREADY_CAPTURED") {
        order = await getPayPalOrder(order_id);
      } else if (err instanceof PayPalError && err.status < 500) {
        await admin.from("payment_records").update({
          payment_status: "declined",
          internal_status: "declined",
          last_error: { issue: err.issue ?? "declined" },
        }).eq("id", record.id);
        return jsonError(402, "payment_declined", declineMessage(err.issue));
      } else {
        throw err;
      }
    }

    const facts = extractCaptureFacts(order);
    if (!facts) {
      return jsonError(
        502,
        "capture_unverified",
        `We couldn't verify the payment. Contact support with reference ${record.reference}.`,
      );
    }

    const updated = await finalizeCapture(admin, record, facts, "capture_endpoint");
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
      pending: facts.status === "PENDING",
    });
  } catch (err) {
    if (err instanceof PayPalError) {
      return jsonError(502, "paypal_error", "We couldn't reach PayPal. Please try again.");
    }
    return unknownErrorResponse(err);
  }
});

function declineMessage(issue?: string): string {
  switch (issue) {
    case "INSTRUMENT_DECLINED":
      return "That payment method was declined. Please choose another one in PayPal.";
    case "PAYER_ACTION_REQUIRED":
      return "PayPal needs one more step from you. Please complete it and try again.";
    case "ORDER_NOT_APPROVED":
      return "Your payment was not completed. Nothing has been confirmed.";
    default:
      return "Your payment was not completed. No booking or order has been confirmed.";
  }
}
