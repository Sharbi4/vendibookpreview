import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { capturePayPalOrder, getPayPalOrder, PayPalError, safeLog } from "../_shared/paypal.ts";
import { extractCaptureFacts, finalizeCapture } from "../_shared/paypalFinalize.ts";
import { auditPayment, requestIp } from "../_shared/paymentAudit.ts";

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
