import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import {
  PAYPAL_CHECKOUT_INTENT,
  getPayPalAccessToken,
  paypalConfigStatus,
  paypalEnvironment,
} from "../_shared/paypal.ts";

/** Administrator-only payment system health panel. Never exposes secret values. */
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
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return jsonError(403, "forbidden", "Administrator access required.");

    const config = paypalConfigStatus();

    let apiConnectivity: "ok" | "unauthenticated" | "not_configured" = "not_configured";
    if (config.client_id_configured && config.client_secret_configured) {
      try {
        await getPayPalAccessToken();
        apiConnectivity = "ok";
      } catch {
        apiConnectivity = "unauthenticated";
      }
    }

    const [
      lastCheckoutWebhook,
      lastSubscriptionWebhook,
      webhookErrors,
      planMappings,
      pendingPayables,
      needsReview,
      lastOrderCall,
      volume,
    ] = await Promise.all([
      admin.from("paypal_webhook_events").select("event_type, received_at")
        .like("event_type", "PAYMENT.%").eq("processed", true)
        .order("received_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("paypal_webhook_events").select("event_type, received_at")
        .like("event_type", "BILLING.%").eq("processed", true)
        .order("received_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("paypal_webhook_events").select("event_id, event_type, processing_error, received_at")
        .not("processing_error", "is", null)
        .order("received_at", { ascending: false }).limit(10),
      admin.from("paypal_plan_mappings").select("*").eq("environment", paypalEnvironment()),
      admin.from("seller_payables").select("id", { count: "exact", head: true })
        .in("status", ["eligible_for_review", "payout_approved", "payout_processing", "payout_failed"]),
      admin.from("payment_records").select("id", { count: "exact", head: true })
        .eq("internal_status", "needs_review"),
      admin.from("paypal_api_logs")
        .select("environment, created_at, endpoint, request_body")
        .eq("endpoint", "/v2/checkout/orders")
        .eq("method", "POST")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("payment_records")
        .select("payment_status, gross_amount_cents")
        .eq("provider", "paypal")
        .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
    ]);

    const rows = volume.data ?? [];
    const tally = (status: string) => rows.filter((r: any) => r.payment_status === status).length;

    const missingPlanIds = (planMappings.data ?? [])
      .filter((m: any) => !m.paypal_plan_id)
      .map((m: any) => `${m.tier}/${m.billing_interval}`);

    const lastOrderEnvironment = lastOrderCall.data?.environment ?? null;
    const lastOrderIntent = String(lastOrderCall.data?.request_body?.intent ?? "").toUpperCase() || null;
    const environmentMismatch = !!lastOrderEnvironment && lastOrderEnvironment !== config.environment;
    const intentMismatch = !!lastOrderIntent && lastOrderIntent !== PAYPAL_CHECKOUT_INTENT;
    const agreementIssues = [
      environmentMismatch
        ? `SDK environment is ${config.environment}, but the most recent order used ${lastOrderEnvironment}.`
        : null,
      intentMismatch
        ? `SDK intent is ${PAYPAL_CHECKOUT_INTENT}, but the most recent order used ${lastOrderIntent}.`
        : null,
      apiConnectivity !== "ok"
        ? "The configured client ID and client secret did not authenticate together."
        : null,
    ].filter(Boolean);

    return jsonResponse(200, {
      paypal: {
        environment: config.environment,
        sdk_environment: config.environment,
        sdk_intent: PAYPAL_CHECKOUT_INTENT,
        client_id_prefix: config.client_id_prefix,
        client_id_configured: config.client_id_configured,
        client_secret_configured: config.client_secret_configured,
        webhook_id_configured: config.webhook_id_configured,
        api_connectivity: apiConnectivity,
        one_time_ready: apiConnectivity === "ok",
        subscriptions_ready: apiConnectivity === "ok" &&
          (planMappings.data ?? []).some((m: any) => !!m.paypal_plan_id),
        // Environment drift is what produced a production PayPal popup against
        // a sandbox order. Surface it loudly instead of leaving it implicit.
        last_order_environment: lastOrderEnvironment,
        last_order_intent: lastOrderIntent,
        last_order_call_at: lastOrderCall.data?.created_at ?? null,
        environment_mismatch: environmentMismatch,
        intent_mismatch: intentMismatch,
        sdk_and_orders_agree: agreementIssues.length === 0,
        sdk_and_orders_detail: agreementIssues.length === 0
          ? "SDK and orders agree on sandbox/live environment and CAPTURE intent; the configured client ID and secret authenticate as one app."
          : agreementIssues.join(" "),
        environment_mismatch_detail:
          environmentMismatch
            ? `Configured environment is ${config.environment} but the most recent order call ran against ${lastOrderEnvironment}. Buyers will be sent to the wrong PayPal environment.`
            : null,
        intent_mismatch_detail: intentMismatch
          ? `Configured SDK intent is ${PAYPAL_CHECKOUT_INTENT} but the most recent order used ${lastOrderIntent}. PayPal checkout will fail until they match.`
          : null,
        last_checkout_webhook_at: lastCheckoutWebhook.data?.received_at ?? null,
        last_subscription_webhook_at: lastSubscriptionWebhook.data?.received_at ?? null,
        missing_plan_mappings: missingPlanIds,
      },
      dwolla: {
        environment: "not_configured",
        api_ready: false,
        note: "Dwolla ACH payouts are recorded manually until API access is approved.",
      },
      volume_30d: {
        total: rows.length,
        completed: tally("completed"),
        pending: tally("pending"),
        declined: tally("declined") + tally("failed"),
        refunded: tally("refunded") + tally("partially_refunded"),
        gross_cents: rows
          .filter((r: any) => r.payment_status === "completed")
          .reduce((s: number, r: any) => s + (r.gross_amount_cents ?? 0), 0),
      },
      payouts_requiring_review: pendingPayables.count ?? 0,
      payments_needing_reconciliation: needsReview.count ?? 0,
      webhook_errors: webhookErrors.data ?? [],
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
