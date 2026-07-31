import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { getPayPalAccessToken, paypalConfigStatus, paypalEnvironment } from "../_shared/paypal.ts";

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

    return jsonResponse(200, {
      paypal: {
        environment: config.environment,
        client_id_configured: config.client_id_configured,
        client_secret_configured: config.client_secret_configured,
        webhook_id_configured: config.webhook_id_configured,
        api_connectivity: apiConnectivity,
        one_time_ready: apiConnectivity === "ok",
        subscriptions_ready: apiConnectivity === "ok" &&
          (planMappings.data ?? []).some((m: any) => !!m.paypal_plan_id),
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
