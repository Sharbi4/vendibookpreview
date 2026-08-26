import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { getPayPalOrder, PayPalError, safeLog } from "../_shared/paypal.ts";
import { getPaymentProvider, PaymentProviderError } from "../_shared/payments/index.ts";
import { supportsAuthorization } from "../_shared/payments/types.ts";
import { applyAuthorization } from "../_shared/paypalAuthorization.ts";
import { auditPayment, requestIp } from "../_shared/paymentAudit.ts";
import { getListingPurchaseState, LISTING_UNAVAILABLE_MESSAGE } from "../_shared/listingGuard.ts";

/**
 * Turns a buyer-approved AUTHORIZE order into a temporary PayPal hold.
 *
 * NOTHING is charged here. The buyer's funds are reserved by PayPal until a
 * later, explicit capture (seller accepts / booking is confirmed) or a void.
 * The browser's onApprove callback is never treated as proof of anything —
 * the hold is always verified against PayPal server-side.
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

    // Idempotent: a double click or a webhook that landed first is a success.
    if (record.payment_status === "completed") {
      return jsonResponse(200, {
        status: "completed",
        already_completed: true,
        reference: record.reference,
      });
    }
    if (record.paypal_authorization_id) {
      return jsonResponse(200, {
        status: "authorized",
        already_authorized: true,
        reference: record.reference,
        authorization_id: record.paypal_authorization_id,
        expires_at: record.authorization_expires_at,
      });
    }

    // The listing may have been withdrawn while the buyer was in PayPal.
    // Do not place a hold on something that can no longer be transacted.
    if (record.listing_id) {
      const state = await getListingPurchaseState(admin, record.listing_id);
      if (!state.purchasable) {
        await admin.from("payment_records").update({
          payment_status: "cancelled",
          internal_status: "cancelled_listing_unavailable",
          last_error: { reason: "listing_unavailable", listing_status: state.status },
        }).eq("id", record.id);
        return jsonError(409, "listing_unavailable", LISTING_UNAVAILABLE_MESSAGE);
      }
    }

    const provider = getPaymentProvider();
    if (!supportsAuthorization(provider)) {
      return jsonError(
        503,
        "provider_not_configured",
        "Payment holds aren't available right now. Please try again shortly.",
      );
    }

    let authorization;
    try {
      authorization = await provider.authorizeOrder(order_id, `authorize:${record.reference}`);
    } catch (err) {
      // Reconcile: PayPal may have created the hold before the error surfaced.
      const order = await getPayPalOrder(order_id).catch(() => null);
      const existing = order?.purchase_units?.[0]?.payments?.authorizations?.[0];
      if (!existing?.id) {
        if (err instanceof PayPalError && err.status < 500) {
          await admin.from("payment_records").update({
            payment_status: "declined",
            internal_status: "authorization_declined",
            last_error: { issue: err.issue ?? "declined" },
          }).eq("id", record.id);
          return jsonError(
            402,
            "payment_declined",
            "PayPal couldn't authorize that payment method. Nothing was charged — please try another one.",
          );
        }
        throw err;
      }
      authorization = {
        authorizationId: existing.id,
        status: String(existing.status ?? "CREATED").toLowerCase(),
        amount: {
          amountCents: record.gross_amount_cents,
          currency: record.currency ?? "USD",
        },
        expiresAt: existing.expiration_time ?? null,
      } as any;
    }

    const updated = await applyAuthorization(admin, record, {
      authorizationId: authorization.authorizationId,
      status: authorization.status,
      amountCents: authorization.amount.amountCents,
      currency: authorization.amount.currency,
      expiresAt: authorization.expiresAt,
    }, "authorize_endpoint");

    await auditPayment(admin, {
      actorId: user.id,
      actorRole: "user",
      actorIp: requestIp(req),
      provider: provider.name,
      action: "order.authorized",
      entityType: "payment_record",
      entityId: record.id,
      reference: record.reference,
      newValue: {
        authorization_id: authorization.authorizationId,
        amount_cents: authorization.amount.amountCents,
        expires_at: authorization.expiresAt,
      },
    });

    safeLog("order_authorized", { reference: record.reference });

    return jsonResponse(200, {
      status: "authorized",
      reference: updated.reference,
      authorization_id: authorization.authorizationId,
      amount_cents: authorization.amount.amountCents,
      currency: authorization.amount.currency,
      expires_at: authorization.expiresAt,
      message:
        "Payment authorized — you have not been charged yet. PayPal is holding these funds until the transaction is confirmed.",
    });
  } catch (err) {
    if (err instanceof PaymentProviderError || err instanceof PayPalError) {
      return jsonError(
        502,
        "provider_error",
        "We couldn't reach PayPal. Nothing was charged — please try again in a moment.",
      );
    }
    return unknownErrorResponse(err);
  }
});
