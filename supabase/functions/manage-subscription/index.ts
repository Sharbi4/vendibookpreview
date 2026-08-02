/**
 * manage-subscription — in-app cancel / reactivate for host subscriptions.
 *
 * Actions:
 *   - cancel:     sets cancel_at_period_end = true on the active subscription.
 *                 Access continues until current_period_end.
 *   - reactivate: clears cancel_at_period_end so the sub renews normally.
 *
 * DOES NOT change price, tier, or proration — plan changes go through the
 * Stripe Customer Portal (which supports switch + proration natively).
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Legacy Stripe members only. New memberships bill through PayPal and are
    // managed by `paypal-subscription-cancel`.
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonError(
        409,
        "provider_retired",
        "Memberships are now managed through PayPal. Please reload the page and try again.",
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "You must be signed in.");
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) {
      return jsonError(401, "unauthenticated", userErr?.message ?? "Not authenticated");
    }
    const user = userData.user;

    let payload: { action?: string } = {};
    try { payload = await req.json(); } catch { /* empty body */ }
    const action = payload.action;
    if (action !== "cancel" && action !== "reactivate") {
      return jsonError(400, "invalid_action", "action must be 'cancel' or 'reactivate'.");
    }

    const { data: sub } = await supabase
      .from("host_subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", user.id)
      .not("stripe_subscription_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      return jsonError(404, "no_subscription", "No active subscription found for this account.");
    }
    if (sub.status === "canceled") {
      return jsonError(409, "already_canceled", "This subscription is already fully canceled.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: action === "cancel",
    });

    // Optimistic local mirror — the webhook remains the source of truth.
    await supabase
      .from("host_subscriptions")
      .update({
        cancel_at_period_end: action === "cancel",
        cancel_at: action === "cancel" && updated.cancel_at
          ? new Date(updated.cancel_at * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", sub.stripe_subscription_id);

    return jsonResponse(200, {
      action,
      cancel_at_period_end: updated.cancel_at_period_end,
      cancel_at: updated.cancel_at,
      current_period_end: (updated as unknown as { current_period_end?: number }).current_period_end ?? null,
    });
  } catch (err) {
    console.error("[MANAGE-SUBSCRIPTION]", err);
    return unknownErrorResponse(err);
  }
});
