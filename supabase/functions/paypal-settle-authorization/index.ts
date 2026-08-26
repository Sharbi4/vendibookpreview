import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { PayPalError, safeLog } from "../_shared/paypal.ts";
import { PaymentProviderError } from "../_shared/payments/index.ts";
import { CaptureRejectedError, captureHold, voidHold } from "../_shared/paypalAuthorization.ts";
import { auditPayment, requestIp } from "../_shared/paymentAudit.ts";

/**
 * Settles an existing temporary PayPal hold: either captures it (money moves)
 * or voids it (hold released, nothing charged).
 *
 * Authorization rules:
 *  - capture: only the counterparty who confirms the deal (seller on a sale,
 *    host on a rental) or an admin. Buyers can never capture their own hold.
 *  - void:    either party or an admin. Releasing a hold is always safe.
 *
 * Idempotent: repeat calls after a completed capture return the same result.
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
    const paymentRecordId = body?.payment_record_id ? String(body.payment_record_id) : null;
    const action = String(body?.action ?? "");
    const reason = String(body?.reason ?? action).slice(0, 60);

    if (!paymentRecordId) return jsonError(400, "missing_fields", "Missing payment id.");
    if (action !== "capture" && action !== "void") {
      return jsonError(400, "invalid_action", "Unsupported settlement action.");
    }

    const { data: record } = await admin
      .from("payment_records")
      .select("*")
      .eq("id", paymentRecordId)
      .maybeSingle();
    if (!record) return jsonError(404, "not_found", "We couldn't find that payment.");

    const { data: adminRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRole;
    const isSeller = record.seller_id === user.id;
    const isBuyer = record.buyer_id === user.id;

    if (action === "capture" && !(isAdmin || isSeller)) {
      return jsonError(403, "forbidden", "Only the seller or host can complete this payment.");
    }
    if (action === "void" && !(isAdmin || isSeller || isBuyer)) {
      return jsonError(403, "forbidden", "This payment belongs to another account.");
    }

    let outcome;
    try {
      outcome = action === "capture"
        ? await captureHold(admin, record, { reason })
        : await voidHold(admin, record, reason);
    } catch (err) {
      if (err instanceof CaptureRejectedError) {
        safeLog("authorization_capture_rejected", { reference: record.reference, reason: err.reason });
        return jsonError(409, err.reason, err.message);
      }
      if (err instanceof PayPalError && err.status < 500) {
        await admin.from("payment_records").update({
          last_error: { issue: err.issue ?? "settle_failed", action },
        }).eq("id", record.id);
        return jsonError(
          409,
          "settlement_failed",
          action === "capture"
            ? "PayPal couldn't complete this charge. The hold may have expired — the buyer can pay again."
            : "PayPal couldn't release this hold right now. Please try again shortly.",
        );
      }
      throw err;
    }

    await auditPayment(admin, {
      actorId: user.id,
      actorRole: isAdmin ? "admin" : "user",
      actorIp: requestIp(req),
      provider: "paypal",
      action: action === "capture" ? "authorization.captured" : "authorization.voided",
      entityType: "payment_record",
      entityId: record.id,
      reference: record.reference,
      newValue: { outcome: outcome.action, reason },
    });

    return jsonResponse(200, {
      action: outcome.action,
      reference: record.reference,
      ...(outcome.action === "captured" ? { capture_id: outcome.captureId } : {}),
      ...(outcome.action === "noop" ? { reason: outcome.reason } : {}),
    });
  } catch (err) {
    if (err instanceof PaymentProviderError || err instanceof PayPalError) {
      return jsonError(502, "provider_error", "We couldn't reach PayPal. Please try again.");
    }
    return unknownErrorResponse(err);
  }
});
