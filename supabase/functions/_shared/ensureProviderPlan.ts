/**
 * Resolve (and if necessary create) the provider billing plan behind a
 * recurring product.
 *
 * The database catalog stays the source of truth: price, currency, interval
 * and trial all come from `monetization_products` / `monetization_product_plans`.
 * Nothing here is read from the browser. If the plan row exists but was never
 * pushed to the provider — or was never seeded at all — we create it on the
 * fly with a deterministic idempotency key so repeated calls reuse the same
 * provider plan instead of minting duplicates.
 */
// deno-lint-ignore-file no-explicit-any

export type PlanInterval = "monthly" | "quarterly" | "annual";

export interface EnsuredPlan {
  id?: string;
  product_id: string;
  billing_interval: PlanInterval;
  price_cents: number;
  currency: string;
  trial_days: number | null;
  provider: string;
  environment: string;
  paypal_plan_id: string;
  is_active: boolean;
}

export async function ensureProviderPlan(opts: {
  admin: any;
  provider: any;
  providerName: string;
  product: any;
  interval: PlanInterval;
}): Promise<{ plan: EnsuredPlan | null; error?: string }> {
  const { admin, provider, providerName, product, interval } = opts;
  const environment = provider.environment;

  const { data: existing } = await admin
    .from("monetization_product_plans")
    .select("*")
    .eq("product_id", product.id)
    .eq("billing_interval", interval)
    .eq("provider", providerName)
    .eq("environment", environment)
    .maybeSingle();

  if (existing?.paypal_plan_id && existing.is_active !== false) {
    return { plan: existing as EnsuredPlan };
  }

  const priceCents = existing?.price_cents ?? product.price_cents;
  const currency = existing?.currency ?? product.currency ?? "USD";
  if (!Number.isInteger(priceCents) || priceCents <= 0) {
    return { plan: null, error: "This membership has no price configured." };
  }

  try {
    let providerProductId: string | null = product.paypal_product_id ?? null;
    if (!providerProductId) {
      const created = await provider.createCatalogProduct({
        name: product.name,
        description: product.description,
        idempotencyKey: `catalog-product:${product.id}`,
      });
      providerProductId = created.providerProductId;
      await admin
        .from("monetization_products")
        .update({ paypal_product_id: providerProductId })
        .eq("id", product.id);
    }

    const createdPlan = await provider.createCatalogPlan({
      providerProductId,
      name: `${product.name} — ${interval}`,
      description: product.description,
      interval,
      price: { amountCents: priceCents, currency },
      trialDays: existing?.trial_days ?? null,
      taxable: product.is_taxable ?? false,
      idempotencyKey: `catalog-plan:${product.id}:${interval}:${priceCents}`,
    });

    const payload = {
      product_id: product.id,
      billing_interval: interval,
      price_cents: priceCents,
      currency,
      trial_days: existing?.trial_days ?? null,
      provider: providerName,
      environment,
      paypal_plan_id: createdPlan.providerPlanId,
      external_status: "active",
      is_active: true,
    };

    const { data: row } = existing
      ? await admin.from("monetization_product_plans").update(payload)
        .eq("id", existing.id).select().maybeSingle()
      : await admin.from("monetization_product_plans").insert(payload).select().maybeSingle();

    return { plan: (row ?? payload) as EnsuredPlan };
  } catch (err) {
    return { plan: null, error: (err as Error).message };
  }
}
