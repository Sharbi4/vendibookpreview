/**
 * PayPal Catalog Products + Billing Plans + Invoicing.
 *
 * Our admin UI is the source of truth: rows in `monetization_products` /
 * `monetization_product_plans` are authored here and pushed up to PayPal.
 * Nothing in this file reads PayPal as the master record.
 */
import { paypalRequest } from "./paypal.ts";

const money = (cents: number, currency: string) => ({
  currency_code: (currency || "USD").toUpperCase(),
  value: (cents / 100).toFixed(2),
});

/** PayPal only accepts DAY | WEEK | MONTH | YEAR + a count. */
export function intervalToPayPal(interval: "monthly" | "quarterly" | "annual") {
  switch (interval) {
    case "monthly":
      return { interval_unit: "MONTH", interval_count: 1 };
    case "quarterly":
      return { interval_unit: "MONTH", interval_count: 3 };
    case "annual":
      return { interval_unit: "YEAR", interval_count: 1 };
  }
}

export async function createCatalogProduct(opts: {
  name: string;
  description?: string | null;
  category?: string;
  idempotencyKey: string;
}) {
  return await paypalRequest("/v1/catalogs/products", {
    method: "POST",
    idempotencyKey: opts.idempotencyKey,
    body: {
      name: opts.name.slice(0, 127),
      description: (opts.description ?? "").slice(0, 256) || undefined,
      type: "SERVICE",
      category: opts.category ?? "SOFTWARE",
    },
  });
}

export async function updateCatalogProduct(productId: string, patch: {
  description?: string | null;
}) {
  const ops: Record<string, unknown>[] = [];
  if (patch.description !== undefined) {
    ops.push({ op: "replace", path: "/description", value: (patch.description ?? "").slice(0, 256) });
  }
  if (!ops.length) return;
  await paypalRequest(`/v1/catalogs/products/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    body: ops,
    retries: 1,
  });
}

export async function createBillingPlan(opts: {
  productId: string;
  name: string;
  description?: string | null;
  interval: "monthly" | "quarterly" | "annual";
  priceCents: number;
  currency?: string;
  trialDays?: number | null;
  taxable?: boolean;
  idempotencyKey: string;
}) {
  const currency = (opts.currency ?? "USD").toUpperCase();
  const cycles: Record<string, unknown>[] = [];
  let sequence = 1;

  if (opts.trialDays && opts.trialDays > 0) {
    cycles.push({
      frequency: { interval_unit: "DAY", interval_count: opts.trialDays },
      tenure_type: "TRIAL",
      sequence: sequence++,
      total_cycles: 1,
      pricing_scheme: { fixed_price: money(0, currency) },
    });
  }

  cycles.push({
    frequency: intervalToPayPal(opts.interval),
    tenure_type: "REGULAR",
    sequence,
    // 0 = bill until cancelled.
    total_cycles: 0,
    pricing_scheme: { fixed_price: money(opts.priceCents, currency) },
  });

  return await paypalRequest("/v1/billing/plans", {
    method: "POST",
    idempotencyKey: opts.idempotencyKey,
    body: {
      product_id: opts.productId,
      name: opts.name.slice(0, 127),
      description: (opts.description ?? "").slice(0, 127) || undefined,
      status: "ACTIVE",
      billing_cycles: cycles,
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CANCEL",
        payment_failure_threshold: 2,
      },
      ...(opts.taxable ? { taxes: { percentage: "0", inclusive: false } } : {}),
    },
  });
}

/**
 * PayPal plan prices are immutable in practice — changing the price of a live
 * plan re-prices existing subscribers. We therefore deactivate and create a
 * new plan instead, and only expose deactivate here.
 */
export async function deactivateBillingPlan(planId: string) {
  await paypalRequest(`/v1/billing/plans/${encodeURIComponent(planId)}/deactivate`, {
    method: "POST",
    body: {},
    retries: 1,
  });
}

export async function activateBillingPlan(planId: string) {
  await paypalRequest(`/v1/billing/plans/${encodeURIComponent(planId)}/activate`, {
    method: "POST",
    body: {},
    retries: 1,
  });
}

export async function createSubscription(opts: {
  planId: string;
  subscriberEmail?: string | null;
  subscriberName?: string | null;
  returnUrl: string;
  cancelUrl: string;
  customId?: string;
  idempotencyKey: string;
}) {
  const [givenName, ...rest] = (opts.subscriberName ?? "").trim().split(/\s+/);
  return await paypalRequest("/v1/billing/subscriptions", {
    method: "POST",
    idempotencyKey: opts.idempotencyKey,
    body: {
      plan_id: opts.planId,
      ...(opts.customId ? { custom_id: opts.customId.slice(0, 127) } : {}),
      ...(opts.subscriberEmail || givenName
        ? {
          subscriber: {
            ...(opts.subscriberEmail ? { email_address: opts.subscriberEmail } : {}),
            ...(givenName
              ? { name: { given_name: givenName, surname: rest.join(" ") || givenName } }
              : {}),
          },
        }
        : {}),
      application_context: {
        brand_name: "Vendibook",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
      },
    },
  });
}

// ------------------------------------------------------------------ invoices

export async function createInvoice(opts: {
  amountCents: number;
  currency?: string;
  reference: string;
  description: string;
  buyerEmail?: string | null;
  dueDate?: string | null;
}) {
  const currency = (opts.currency ?? "USD").toUpperCase();
  const draft = await paypalRequest("/v2/invoicing/invoices", {
    method: "POST",
    idempotencyKey: `invoice:${opts.reference}`,
    body: {
      detail: {
        invoice_number: opts.reference.slice(0, 127),
        currency_code: currency,
        note: opts.description.slice(0, 4000),
        ...(opts.dueDate ? { payment_term: { due_date: opts.dueDate.slice(0, 10) } } : {}),
      },
      ...(opts.buyerEmail
        ? { primary_recipients: [{ billing_info: { email_address: opts.buyerEmail } }] }
        : {}),
      items: [{
        name: opts.description.slice(0, 200),
        quantity: "1",
        unit_amount: money(opts.amountCents, currency),
      }],
    },
  });

  const invoiceId: string = draft?.id ?? String(draft?.href ?? "").split("/").pop();
  if (!invoiceId) throw new Error("PayPal did not return an invoice id");

  await paypalRequest(`/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}/send`, {
    method: "POST",
    body: { send_to_invoicer: false },
    retries: 1,
  });

  const sent = await paypalRequest(`/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}`);
  const url = sent?.detail?.metadata?.recipient_view_url
    ?? sent?.links?.find((l: any) => l.rel === "payer-view")?.href
    ?? null;

  return { invoiceId, url, status: sent?.status ?? "SENT", raw: sent };
}
