import { extractCaptureFacts, finalizeCapture } from "../_shared/paypalFinalize.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { getPayPalOrder, safeLog } from "../_shared/paypal.ts";

/**
 * Reconciling finalizer for a buyer who came back from PayPal.
 *
 * Used by the redirect/app-switch return page and as the recovery path when an
 * in-page authorize/capture call failed after the payer already approved. It
 * never moves money itself: it looks the order up, and delegates to the
 * canonical `paypal-capture-order` / `paypal-authorize-order` endpoints, which
 * are both idempotent. Its job is to answer one question truthfully — is this
 * payment actually completed/authorized, or does the buyer need to try again?
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

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    if (!orderId && !reference) {
      return jsonError(400, "missing_fields", "Missing payment reference.");
    }

    let query = admin.from("payment_records").select("*").eq("buyer_id", user.id);
    query = orderId ? query.eq("paypal_order_id", orderId) : query.eq("reference", reference);
    const { data: record } = await query.maybeSingle();

    if (!record) {
      return jsonError(404, "not_found", "We couldn't find that payment on your account.");
    }

    const done = (status: string, extra: Record<string, unknown> = {}) =>
      jsonResponse(200, {
        status,
        reference: record.reference,
        transaction_type: record.transaction_type,
        sale_transaction_id: record.sale_transaction_id,
        booking_request_id: record.booking_request_id,
        ...extra,
      });

    // Already settled — a refresh, a duplicate return, or a webhook that won.
    if (record.payment_status === "completed") return done("completed");
    if (record.paypal_authorization_id && record.payment_status !== "cancelled") {
      return done("authorized");
    }

    const providerOrderId = record.paypal_order_id ?? orderId;
    if (!providerOrderId) {
      return done("incomplete", {
        message: "This payment was never started at PayPal. Nothing has been charged.",
      });
    }

    // Ask PayPal what actually happened before deciding anything.
    const order = await getPayPalOrder(providerOrderId).catch(() => null);
    const payPalStatus = String(order?.status ?? "").toUpperCase();

    if (payPalStatus === "CREATED" || payPalStatus === "PAYER_ACTION_REQUIRED") {
      return done("incomplete", {
        message:
          "This payment wasn't approved at PayPal, so nothing has been charged. You can try again.",
      });
    }
    if (payPalStatus === "VOIDED") {
      return done("cancelled", {
        message: "PayPal cancelled this checkout. Nothing has been charged.",
      });
    }

    // Rental recovery is read-only at PayPal: only reconcile a capture that
    // already exists. An APPROVED order must return to the buyer's final review.
    if (record.booking_request_id) {
      const facts = order ? extractCaptureFacts(order) : null;
      if (facts) {
        const verified = await finalizeCapture(admin, record, facts, "capture_endpoint");
        return done(verified.payment_status, { pending: verified.payment_status === "pending" });
      }
      if (!order || record.payment_status === "pending") return done("pending", { pending: true, message: "Payment verification is pending. Do not pay again." });
      return done("review_required", { message: "Return to the final payment review to submit payment." });
    }

    // APPROVED (or COMPLETED but not recorded yet): run the canonical endpoint.
    const intent = String(record.payment_intent ?? "CAPTURE").toUpperCase();
    const fn = intent === "AUTHORIZE" ? "paypal-authorize-order" : "paypal-capture-order";
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
      body: JSON.stringify({ order_id: providerOrderId }),
    });
    const payload = await res.json().catch(() => ({} as Record<string, unknown>));

    safeLog("order_finalize", { reference: record.reference, fn, ok: res.ok });

    if (res.ok && (payload.status === "completed" || payload.status === "authorized")) {
      return done(String(payload.status), { message: payload.message ?? null });
    }
    if (res.ok && (payload.pending || payload.status === "pending")) {
      return done("pending", { message: payload.message ?? null });
    }

    // Final read: the delegate may have failed after the record was updated.
    const { data: fresh } = await admin
      .from("payment_records")
      .select("payment_status, paypal_authorization_id")
      .eq("id", record.id)
      .maybeSingle();
    if (fresh?.payment_status === "completed") return done("completed");
    if (fresh?.payment_status === "pending") return done("pending", { pending: true });
    if (fresh?.paypal_authorization_id) return done("authorized");

    return done("failed", {
      message: typeof payload.message === "string"
        ? payload.message
        : "We couldn't finish this payment. Nothing has been charged — please try again.",
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
