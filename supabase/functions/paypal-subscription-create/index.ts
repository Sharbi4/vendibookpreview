import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  alreadyEntitledError,
  corsHeaders,
  jsonError,
  jsonResponse,
  unknownErrorResponse,
} from "../_shared/jsonError.ts";
import { getPaymentProvider, type ProviderName } from "../_shared/payments/index.ts";
import { auditPayment, requestIp } from "../_shared/paymentAudit.ts";
import { safeLog } from "../_shared/paypal.ts";
import { classifyProduct } from "../_shared/productEntitlement.ts";
import { ensureProviderPlan } from "../_shared/ensureProviderPlan.ts";

/**
 * Starts a recurring membership. The plan (and therefore the price) is always
 * resolved server-side from `monetization_product_plans` — the browser only
 * names a product slug and an interval.
 *
 * Recurring purchases require a recorded clickwrap consent (ROSCA / CA AB 2863).
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
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in to subscribe.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");

    const body = await req.json().catch(() => ({}));
    const productSlug = String(body.product_slug ?? "");
    const interval = String(body.billing_interval ?? "monthly");
    const consentId = body.consent_id ? String(body.consent_id) : null;
    const providerName = (body.provider ?? "paypal") as ProviderName;

    if (!productSlug) return jsonError(400, "missing_fields", "Missing product.");
    if (!["monthly", "quarterly", "annual"].includes(interval)) {
      return jsonError(400, "invalid_interval", "Choose a monthly, quarterly or annual plan.");
    }

    const provider = getPaymentProvider(providerName);
    if (!provider.isConfigured()) {
      return jsonError(503, "provider_unavailable", "Payments are temporarily unavailable. Please try again shortly.");
    }

    // ---- product + plan (server-side pricing) --------------------------
    const { data: product } = await admin.from("monetization_products")
      .select("*").eq("slug", productSlug).eq("is_active", true).maybeSingle();
    if (!product) return jsonError(404, "not_found", "That membership is no longer available.");
    if (product.billing_type !== "recurring") {
      return jsonError(400, "not_recurring", "That product isn't a subscription.");
    }

    // Plans are seeded by the admin catalog sync, but a missing plan must not
    // dead-end a paying member: create it on demand from the catalog price
    // (deterministic idempotency key → no duplicate provider plans).
    const { plan, error: planError } = await ensureProviderPlan({
      admin,
      provider,
      providerName,
      product,
      interval: interval as "monthly" | "quarterly" | "annual",
    });
    if (!plan?.paypal_plan_id) {
      safeLog("plan_provision_failed", { slug: productSlug, interval, message: planError });
      return jsonError(
        409,
        "plan_unavailable",
        "That billing option isn't set up yet. Please pick another or contact support.",
      );
    }


    // ---- consent (required for recurring billing) ----------------------
    if (!consentId) {
      return jsonError(
        400,
        "consent_required",
        "Please accept the recurring billing terms before subscribing.",
      );
    }
    const { data: consent } = await admin.from("user_consents")
      .select("id, user_id, revoked_at").eq("id", consentId).maybeSingle();
    if (!consent || consent.user_id !== user.id || consent.revoked_at) {
      return jsonError(400, "consent_invalid", "We couldn't verify your billing consent. Please try again.");
    }

    // ---- double-subscribe guard ----------------------------------------
    const { data: existingSub } = await admin.from("paypal_subscriptions")
      .select("id, status, paypal_subscription_id, tier")
      .eq("user_id", user.id)
      .in("status", ["active", "approval_pending", "approved"])
      .maybeSingle();
    if (existingSub?.status === "active") {
      return alreadyEntitledError({
        current: existingSub.tier,
        message: "You already have an active membership. Manage or change it from your account.",
      });
    }

    const tier = classifyProduct(product).grantsTier ?? "starter";
    const origin = req.headers.get("origin") ?? "https://vendibook.com";
    const returnUrl = `${origin}${body.return_path ?? "/account/subscription?subscribed=1"}`;
    const cancelUrl = `${origin}${body.cancel_path ?? "/pricing?cancelled=1"}`;

    const { data: profile } = await admin.from("profiles")
      .select("full_name").eq("id", user.id).maybeSingle();

    const subscription = await provider.createSubscription({
      planId: plan.paypal_plan_id,
      subscriberEmail: user.email,
      subscriberName: profile?.full_name ?? null,
      returnUrl,
      cancelUrl,
      customId: user.id,
      idempotencyKey: `sub:${user.id}:${plan.id}`,
    });

    if (!subscription.approveUrl) {
      return jsonError(502, "approval_link_missing", "We couldn't start that subscription. Please try again.");
    }

    const { data: row, error: insertError } = await admin.from("paypal_subscriptions").insert({
      user_id: user.id,
      tier,
      billing_interval: interval,
      paypal_product_id: product.paypal_product_id,
      paypal_plan_id: plan.paypal_plan_id,
      paypal_subscription_id: subscription.providerSubscriptionId,
      status: subscription.status,
      recurring_amount_cents: plan.price_cents,
      currency: plan.currency,
      next_billing_time: subscription.nextBillingTime,
      consent_id: consentId,
      metadata: { product_slug: product.slug, product_id: product.id, plan_id: plan.id },
    }).select().maybeSingle();
    if (insertError) {
      safeLog("subscription_row_insert_failed", { message: insertError.message });
    }

    await auditPayment(admin, {
      actorId: user.id,
      actorRole: "user",
      actorIp: requestIp(req),
      provider: providerName,
      action: "subscription.created",
      entityType: "subscription",
      entityId: row?.id ?? subscription.providerSubscriptionId,
      reference: subscription.providerSubscriptionId,
      newValue: {
        tier,
        interval,
        plan_id: plan.id,
        amount_cents: plan.price_cents,
        status: subscription.status,
      },
    });

    return jsonResponse(200, {
      subscription_id: subscription.providerSubscriptionId,
      approve_url: subscription.approveUrl,
      status: subscription.status,
      tier,
      amount_cents: plan.price_cents,
      currency: plan.currency,
      billing_interval: interval,
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
