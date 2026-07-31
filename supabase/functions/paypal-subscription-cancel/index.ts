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

    await admin.from("paypal_subscriptions").update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    }).eq("id", sub.id);

    await admin.from("host_subscriptions").update({
      status: "canceled",
      cancel_at_period_end: true,
      cancel_at: sub.next_billing_time ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    safeLog("subscription_cancelled", { userId: user.id });

    return jsonResponse(200, {
      success: true,
      status: "cancelled",
      access_until: sub.next_billing_time,
      message: sub.next_billing_time
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
