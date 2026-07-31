import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { getPayPalSubscription, paypalEnvironment, PayPalError, safeLog } from "../_shared/paypal.ts";

/**
 * Verifies a PayPal subscription server-side after the buyer approves it in
 * the SDK, then activates the internal membership. Membership access is NEVER
 * granted from a frontend callback alone.
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

    const { subscription_id, tier, billing_interval, consent_id } = await req.json().catch(() => ({}));
    if (!subscription_id) return jsonError(400, "missing_fields", "Missing subscription id.");

    // Already recorded (double click / refresh / webhook arrived first).
    const { data: existingSame } = await admin.from("paypal_subscriptions").select("*")
      .eq("paypal_subscription_id", subscription_id).maybeSingle();
    if (existingSame) {
      return jsonResponse(200, {
        status: existingSame.status,
        tier: existingSame.tier,
        already_recorded: true,
        next_billing_time: existingSame.next_billing_time,
      });
    }

    // Block overlapping active memberships.
    const { data: activeSub } = await admin.from("paypal_subscriptions").select("tier, status")
      .eq("user_id", user.id)
      .in("status", ["active", "approval_pending", "pending", "suspended", "past_due"])
      .maybeSingle();
    if (activeSub) {
      return jsonError(409, "already_subscribed", "This membership is already active on your account.");
    }

    const subscription = await getPayPalSubscription(subscription_id);
    const paypalStatus: string = subscription?.status ?? "APPROVAL_PENDING";
    const planId: string = subscription?.plan_id ?? "";

    // The plan must be one Vendibook configured — never trust a client plan id.
    const { data: mapping } = await admin.from("paypal_plan_mappings").select("*")
      .eq("paypal_plan_id", planId)
      .eq("environment", paypalEnvironment())
      .eq("is_active", true)
      .maybeSingle();

    if (!mapping) {
      safeLog("subscription_unknown_plan", { planId });
      return jsonError(
        409,
        "unknown_plan",
        "We couldn't match that plan. Contact support before being charged again.",
      );
    }
    if (tier && mapping.tier !== tier) {
      return jsonError(409, "plan_mismatch", "The selected plan doesn't match the PayPal plan.");
    }

    const internalStatus = mapStatus(paypalStatus);

    const { data: inserted, error: insertErr } = await admin.from("paypal_subscriptions").insert({
      user_id: user.id,
      tier: mapping.tier,
      billing_interval: mapping.billing_interval ?? billing_interval ?? "month",
      paypal_product_id: mapping.paypal_product_id,
      paypal_plan_id: planId,
      paypal_subscription_id: subscription_id,
      paypal_subscriber_id: subscription?.subscriber?.payer_id ?? null,
      status: internalStatus,
      recurring_amount_cents: mapping.price_cents,
      currency: mapping.currency ?? "USD",
      start_time: subscription?.start_time ?? null,
      next_billing_time: subscription?.billing_info?.next_billing_time ?? null,
      consent_id: consent_id ?? null,
    }).select().maybeSingle();

    if (insertErr && insertErr.code !== "23505") {
      safeLog("subscription_insert_failed", { message: insertErr.message });
      return jsonError(500, "record_failed", "We couldn't record your membership. Contact support.");
    }

    if (internalStatus === "active") {
      await mirrorEntitlement(admin, user.id, mapping.tier, "active", inserted?.next_billing_time, subscription_id);
    }

    return jsonResponse(200, {
      status: internalStatus,
      tier: mapping.tier,
      recurring_amount_cents: mapping.price_cents,
      billing_interval: mapping.billing_interval,
      next_billing_time: subscription?.billing_info?.next_billing_time ?? null,
      pending: internalStatus !== "active",
    });
  } catch (err) {
    if (err instanceof PayPalError) {
      return jsonError(502, "paypal_error", "We couldn't verify the membership with PayPal yet. It will update automatically.");
    }
    return unknownErrorResponse(err);
  }
});

function mapStatus(paypalStatus: string): string {
  switch (paypalStatus) {
    case "ACTIVE":
      return "active";
    case "APPROVAL_PENDING":
      return "approval_pending";
    case "APPROVED":
      return "pending";
    case "SUSPENDED":
      return "suspended";
    case "CANCELLED":
      return "cancelled";
    case "EXPIRED":
      return "expired";
    default:
      return "pending";
  }
}

async function mirrorEntitlement(
  admin: any,
  userId: string,
  tier: string,
  status: string,
  periodEnd: string | null | undefined,
  paypalSubId: string,
) {
  const { data: existing } = await admin.from("host_subscriptions").select("id")
    .eq("user_id", userId).maybeSingle();
  const payload = {
    user_id: userId,
    tier,
    status,
    payment_provider: "paypal",
    paypal_subscription_id: paypalSubId,
    current_period_end: periodEnd ?? null,
    updated_at: new Date().toISOString(),
  };
  if (existing) await admin.from("host_subscriptions").update(payload).eq("id", existing.id);
  else await admin.from("host_subscriptions").insert(payload);
}
