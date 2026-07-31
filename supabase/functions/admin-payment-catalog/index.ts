import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { getPaymentProvider, type ProviderName } from "../_shared/payments/index.ts";
import { auditPayment, requestIp } from "../_shared/paymentAudit.ts";
import { safeLog } from "../_shared/paypal.ts";

/**
 * Admin-only product & plan catalog manager.
 *
 * Our database is the source of truth. Every mutation writes locally first,
 * then pushes the result to the payment provider's catalog. A provider push
 * failure is surfaced on the row (`external_status`) instead of silently
 * leaving the two out of sync.
 */

const VALID_INTERVALS = ["monthly", "quarterly", "annual"] as const;
type Interval = typeof VALID_INTERVALS[number];

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

const actorId = user.id;
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return jsonError(403, "forbidden", "Administrator access required.");

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const providerName = (body.provider ?? "paypal") as ProviderName;
    const provider = getPaymentProvider(providerName);
    const ip = requestIp(req);
    const auditBase = { actorId: user.id, actorRole: "admin", actorIp: ip, provider: providerName };

    switch (action) {
      case "upsert_product":
        return await upsertProduct();
      case "upsert_plan":
        return await upsertPlan();
      case "deactivate_plan":
        return await deactivatePlan();
      case "archive_product":
        return await archiveProduct();
      case "list_catalog":
        return await listCatalog();
      default:
        return jsonError(400, "unknown_action", `Unsupported action "${action}".`);
    }

    // ------------------------------------------------------------------

    async function upsertProduct() {
      const p = body.product ?? {};
      if (!p.slug || !p.name) {
        return jsonError(400, "missing_fields", "Product slug and name are required.");
      }
      if (p.price_cents != null && (!Number.isInteger(p.price_cents) || p.price_cents < 0)) {
        return jsonError(400, "invalid_price", "Price must be a whole number of cents.");
      }

      const { data: existing } = await admin
        .from("monetization_products").select("*").eq("slug", p.slug).maybeSingle();

      const payload = {
        slug: p.slug,
        name: p.name,
        category: p.category,
        description: p.description ?? null,
        billing_type: p.billing_type ?? "one_time",
        price_cents: p.price_cents ?? 0,
        currency: p.currency ?? "USD",
        features: p.features ?? [],
        refund_policy: p.refund_policy ?? null,
        duration_days: p.duration_days ?? null,
        display_order: p.display_order ?? 0,
        is_active: p.is_active ?? true,
        is_taxable: p.is_taxable ?? false,
        visibility: p.visibility ?? "public",
        metadata: p.metadata ?? {},
        created_by: existing?.created_by ?? actorId,
      };

      const { data: row, error } = existing
        ? await admin.from("monetization_products").update(payload)
          .eq("id", existing.id).select().single()
        : await admin.from("monetization_products").insert(payload).select().single();
      if (error) return jsonError(400, "write_failed", error.message);

      // Recurring products need a provider catalog product to hang plans off.
      let providerProductId = row.paypal_product_id as string | null;
      let externalError: string | null = null;
      if (row.billing_type === "recurring" && !providerProductId) {
        try {
          const created = await provider.createCatalogProduct({
            name: row.name,
            description: row.description,
            idempotencyKey: `catalog-product:${row.id}`,
          });
          providerProductId = created.providerProductId;
          await admin.from("monetization_products")
            .update({ paypal_product_id: providerProductId }).eq("id", row.id);
        } catch (err) {
          externalError = (err as Error).message;
          safeLog("catalog_product_push_failed", { slug: row.slug, message: externalError });
        }
      }

      await auditPayment(admin, {
        ...auditBase,
        action: existing ? "product.updated" : "product.created",
        entityType: "product",
        entityId: row.id,
        oldValue: existing ?? null,
        newValue: { ...row, paypal_product_id: providerProductId },
      });

      return jsonResponse(200, {
        product: { ...row, paypal_product_id: providerProductId },
        provider_synced: !externalError,
        ...(externalError ? { provider_error: externalError } : {}),
      });
    }

    async function upsertPlan() {
      const pl = body.plan ?? {};
      if (!pl.product_id || !pl.billing_interval) {
        return jsonError(400, "missing_fields", "Plan requires product_id and billing_interval.");
      }
      if (!VALID_INTERVALS.includes(pl.billing_interval as Interval)) {
        return jsonError(400, "invalid_interval", "Interval must be monthly, quarterly or annual.");
      }
      if (!Number.isInteger(pl.price_cents) || pl.price_cents <= 0) {
        return jsonError(400, "invalid_price", "Plan price must be a positive whole number of cents.");
      }

      const { data: product } = await admin
        .from("monetization_products").select("*").eq("id", pl.product_id).maybeSingle();
      if (!product) return jsonError(404, "not_found", "That product no longer exists.");

      let providerProductId = product.paypal_product_id as string | null;
      if (!providerProductId) {
        const created = await provider.createCatalogProduct({
          name: product.name,
          description: product.description,
          idempotencyKey: `catalog-product:${product.id}`,
        });
        providerProductId = created.providerProductId;
        await admin.from("monetization_products")
          .update({ paypal_product_id: providerProductId }).eq("id", product.id);
      }

      const environment = provider.environment;
      const { data: existing } = await admin
        .from("monetization_product_plans").select("*")
        .eq("product_id", product.id)
        .eq("billing_interval", pl.billing_interval)
        .eq("provider", providerName)
        .eq("environment", environment)
        .maybeSingle();

      // Provider plan prices are immutable — a price change retires the old
      // plan and mints a new one so existing subscribers keep their terms.
      const priceChanged = existing && existing.price_cents !== pl.price_cents;
      if (priceChanged && existing.paypal_plan_id) {
        try {
          await provider.deactivateCatalogPlan(existing.paypal_plan_id);
        } catch (err) {
          safeLog("plan_deactivate_failed", { plan: existing.id, message: (err as Error).message });
        }
      }

      let providerPlanId = priceChanged ? null : existing?.paypal_plan_id ?? null;
      let externalError: string | null = null;
      if (!providerPlanId) {
        try {
          const created = await provider.createCatalogPlan({
            providerProductId,
            name: `${product.name} — ${pl.billing_interval}`,
            description: product.description,
            interval: pl.billing_interval as Interval,
            price: { amountCents: pl.price_cents, currency: pl.currency ?? "USD" },
            trialDays: pl.trial_days ?? null,
            taxable: product.is_taxable ?? false,
            idempotencyKey: `catalog-plan:${product.id}:${pl.billing_interval}:${pl.price_cents}`,
          });
          providerPlanId = created.providerPlanId;
        } catch (err) {
          externalError = (err as Error).message;
        }
      }

      const payload = {
        product_id: product.id,
        billing_interval: pl.billing_interval,
        price_cents: pl.price_cents,
        currency: pl.currency ?? "USD",
        trial_days: pl.trial_days ?? null,
        provider: providerName,
        environment,
        paypal_plan_id: providerPlanId,
        external_status: externalError ? "sync_failed" : providerPlanId ? "active" : "pending",
        is_active: pl.is_active ?? true,
        display_order: pl.display_order ?? 0,
        metadata: pl.metadata ?? {},
      };

      const { data: row, error } = existing
        ? await admin.from("monetization_product_plans").update(payload)
          .eq("id", existing.id).select().single()
        : await admin.from("monetization_product_plans").insert(payload).select().single();
      if (error) return jsonError(400, "write_failed", error.message);

      await auditPayment(admin, {
        ...auditBase,
        action: existing ? "plan.updated" : "plan.created",
        entityType: "plan",
        entityId: row.id,
        oldValue: existing ?? null,
        newValue: row,
      });

      return jsonResponse(200, {
        plan: row,
        provider_synced: !externalError,
        ...(externalError ? { provider_error: externalError } : {}),
      });
    }

    async function deactivatePlan() {
      const planId = body.plan_id;
      if (!planId) return jsonError(400, "missing_fields", "Missing plan_id.");
      const { data: plan } = await admin
        .from("monetization_product_plans").select("*").eq("id", planId).maybeSingle();
      if (!plan) return jsonError(404, "not_found", "That plan no longer exists.");

      if (plan.paypal_plan_id) {
        try {
          await provider.deactivateCatalogPlan(plan.paypal_plan_id);
        } catch (err) {
          safeLog("plan_deactivate_failed", { plan: planId, message: (err as Error).message });
        }
      }
      const { data: row } = await admin.from("monetization_product_plans")
        .update({ is_active: false, external_status: "inactive" })
        .eq("id", planId).select().single();

      await auditPayment(admin, {
        ...auditBase,
        action: "plan.deactivated",
        entityType: "plan",
        entityId: planId,
        oldValue: plan,
        newValue: row,
      });
      return jsonResponse(200, { plan: row });
    }

    async function archiveProduct() {
      const productId = body.product_id;
      if (!productId) return jsonError(400, "missing_fields", "Missing product_id.");
      const { data: product } = await admin
        .from("monetization_products").select("*").eq("id", productId).maybeSingle();
      if (!product) return jsonError(404, "not_found", "That product no longer exists.");

      const { data: plans } = await admin.from("monetization_product_plans")
        .select("*").eq("product_id", productId).eq("is_active", true);
      for (const plan of plans ?? []) {
        if (plan.paypal_plan_id) {
          try {
            await provider.deactivateCatalogPlan(plan.paypal_plan_id);
          } catch (err) {
            safeLog("plan_deactivate_failed", { plan: plan.id, message: (err as Error).message });
          }
        }
      }
      await admin.from("monetization_product_plans")
        .update({ is_active: false, external_status: "inactive" }).eq("product_id", productId);

      const { data: row } = await admin.from("monetization_products")
        .update({ is_active: false, archived_at: new Date().toISOString() })
        .eq("id", productId).select().single();

      await auditPayment(admin, {
        ...auditBase,
        action: "product.archived",
        entityType: "product",
        entityId: productId,
        oldValue: product,
        newValue: row,
      });
      return jsonResponse(200, { product: row, plans_deactivated: plans?.length ?? 0 });
    }

    async function listCatalog() {
      const { data: products } = await admin.from("monetization_products")
        .select("*").order("display_order");
      const { data: plans } = await admin.from("monetization_product_plans")
        .select("*").order("display_order");
      return jsonResponse(200, {
        products: products ?? [],
        plans: plans ?? [],
        environment: provider.environment,
        provider: providerName,
        provider_configured: provider.isConfigured(),
      });
    }
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
