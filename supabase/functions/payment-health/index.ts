import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { getPayPalAccessToken, paypalConfigStatus, safeLog } from "../_shared/paypal.ts";
import { getPaymentProvider } from "../_shared/payments/index.ts";
import { ensureProviderPlan, intervalForProduct } from "../_shared/ensureProviderPlan.ts";

/**
 * Secret-free payment diagnostics + idempotent membership catalog bootstrap.
 *
 * Everything it reports is a boolean/status token — never a credential value.
 * The optional `?seed=1` action only ever mirrors server-authoritative catalog
 * rows up to PayPal; it takes no input from the caller, so it is safe to run
 * without an admin session and no-ops once every plan exists.
 *
 * Diagnostic states are deliberately distinguishable:
 *   credentials_missing | provider_unauthenticated | provider_unavailable |
 *   catalog_plans_missing | webhook_delivery_unproven | ok
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const seed = url.searchParams.get("seed") === "1" || req.method === "POST";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const config = paypalConfigStatus();

    // ---- provider OAuth health -----------------------------------------
    let oauth: "ok" | "unauthenticated" | "unreachable" | "not_configured" = "not_configured";
    let oauthDetail: Record<string, unknown> | null = null;
    if (config.client_id_configured && config.client_secret_configured) {
      try {
        await getPayPalAccessToken();
        oauth = "ok";
      } catch (err) {
        const status = (err as { status?: number }).status;
        oauthDetail = {
          http_status: status ?? null,
          issue: (err as { issue?: string }).issue ?? null,
          message: (err as Error).message,
        };
        oauth = status && status >= 500 ? "unreachable" : "unauthenticated";
      }
    }

    // ---- catalog ---------------------------------------------------------
    const { data: products } = await admin
      .from("monetization_products")
      .select("*")
      .eq("billing_type", "recurring")
      .eq("is_active", true)
      .order("slug");

    const environment = config.environment;
    const seeded: Record<string, unknown>[] = [];

    if (seed && oauth === "ok") {
      const provider = getPaymentProvider("paypal");
      for (const product of products ?? []) {
        const interval = intervalForProduct(product);
        const { plan, error } = await ensureProviderPlan({
          admin,
          provider,
          providerName: "paypal",
          product,
          interval,
        });
        if (!plan?.paypal_plan_id) {
          safeLog("catalog_bootstrap_failed", { slug: product.slug, interval, message: error });
        }
        seeded.push({
          slug: product.slug,
          interval,
          price_cents: plan?.price_cents ?? product.price_cents,
          currency: plan?.currency ?? String(product.currency ?? "USD").toUpperCase(),
          plan_id: plan?.paypal_plan_id ?? null,
          error: plan?.paypal_plan_id ? null : (error ?? "unknown"),
        });
      }
    }

    const { data: plans } = await admin
      .from("monetization_product_plans")
      .select("product_id, billing_interval, price_cents, currency, paypal_plan_id, is_active, environment")
      .eq("provider", "paypal")
      .eq("environment", environment);

    const planByProduct = new Map<string, unknown>();
    for (const p of plans ?? []) planByProduct.set(`${p.product_id}:${p.billing_interval}`, p);

    const catalog = (products ?? []).map((product: Record<string, unknown>) => {
      const interval = intervalForProduct(product as never);
      const plan = planByProduct.get(`${product.id}:${interval}`) as
        | { paypal_plan_id?: string; price_cents?: number; currency?: string; is_active?: boolean }
        | undefined;
      return {
        slug: product.slug,
        name: product.name,
        interval,
        price_cents: product.price_cents,
        provider_product_configured: !!product.paypal_product_id,
        plan_configured: !!plan?.paypal_plan_id,
        plan_price_cents: plan?.price_cents ?? null,
        plan_currency: plan?.currency ?? null,
        plan_active: plan?.is_active ?? null,
      };
    });

    const missingPlans = catalog.filter((c) => !c.plan_configured).map((c) => c.slug);

    // ---- webhook delivery proof -----------------------------------------
    const [{ count: webhookCount }, lastEvent] = await Promise.all([
      admin.from("paypal_webhook_events").select("id", { count: "exact", head: true }),
      admin.from("paypal_webhook_events")
        .select("event_type, received_at, processed, verification_status")
        .order("received_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    let state = "ok";
    if (!config.client_id_configured || !config.client_secret_configured) state = "credentials_missing";
    else if (oauth === "unauthenticated") state = "provider_unauthenticated";
    else if (oauth === "unreachable") state = "provider_unavailable";
    else if (missingPlans.length) state = "catalog_plans_missing";
    else if (!webhookCount) state = "webhook_delivery_unproven";

    return jsonResponse(200, {
      state,
      environment,
      credentials: {
        client_id_configured: config.client_id_configured,
        client_secret_configured: config.client_secret_configured,
        webhook_id_configured: config.webhook_id_configured,
      },
      oauth,
      oauth_detail: oauthDetail,
      catalog,
      missing_plans: missingPlans,
      seeded: seed ? seeded : undefined,
      webhook: {
        events_recorded: webhookCount ?? 0,
        last_event_type: lastEvent.data?.event_type ?? null,
        last_event_at: lastEvent.data?.received_at ?? null,
        delivery_proven: (webhookCount ?? 0) > 0,
      },
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
