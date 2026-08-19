import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { cancelPayPalSubscription, PayPalError, safeLog } from "../_shared/paypal.ts";

/**
 * Cancels the member's PayPal subscription at PayPal FIRST, then records it
 * internally. Never leaves PayPal billing active after a local cancellation.
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

    const { reason } = await req.json().catch(() => ({}));

    const { data: sub } = await admin.from("paypal_subscriptions").select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "approval_pending", "pending", "suspended", "past_due"])
      .maybeSingle();

    if (!sub) return jsonError(404, "no_subscription", "You don't have an active membership to cancel.");

    try {
      await cancelPayPalSubscription(
        sub.paypal_subscription_id,
        reason || "Member requested cancellation",
      );
    } catch (err) {
      // Already cancelled at PayPal — continue and sync our record.
      if (!(err instanceof PayPalError && err.status === 422)) throw err;
    }

    // Idempotent: re-running on an already-cancelled row produces the same state.
    await admin.from("paypal_subscriptions").update({
      status: "cancelled",
      cancelled_at: sub.cancelled_at ?? new Date().toISOString(),
    }).eq("id", sub.id);

    const { data: hostSub } = await admin.from("host_subscriptions")
      .select("id, current_period_start, current_period_end")
      .eq("user_id", user.id).maybeSingle();

    // Cancel anytime → no future renewal, benefits stay live through the end of
    // the period the member already paid for.
    const period = resolveSubscriptionPeriod({
      providerStatus: "cancelled",
      nextBillingTime: sub.next_billing_time,
      lastPaymentAt: sub.last_payment_at,
      startTime: sub.start_time,
      existingPeriodEnd: hostSub?.current_period_end ?? null,
      existingPeriodStart: hostSub?.current_period_start ?? null,
    });

    await admin.from("host_subscriptions").update({
      status: period.status,
      cancel_at_period_end: true,
      cancel_at: period.cancel_at ?? new Date().toISOString(),
      current_period_start: period.current_period_start,
      current_period_end: period.current_period_end,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    safeLog("subscription_cancelled", { userId: user.id, entitled_until: period.current_period_end });

    return jsonResponse(200, {
      success: true,
      status: "cancelled",
      access_until: period.current_period_end,
      still_entitled: period.entitled,
      message: period.entitled
        ? "Your membership is cancelled. Access continues until the end of the paid period."
        : "Your membership is cancelled.",
    });
  } catch (err) {
    if (err instanceof PayPalError) {
      return jsonError(502, "paypal_error", "We couldn't reach PayPal to cancel. Please try again.");
    }
    return unknownErrorResponse(err);
  }
});
