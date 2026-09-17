/**
 * Vendibook PayPal service layer.
 *
 * The ONLY place PayPal REST is called from. Every edge function goes through
 * these helpers so credentials, environment switching, retries, idempotency
 * and logging stay consistent.
 *
 * Secrets (server-side only, never sent to the browser):
 *   PAYPAL_CLIENT_ID
 *   PAYPAL_CLIENT_SECRET
 *   PAYPAL_WEBHOOK_ID
 *   PAYPAL_ENVIRONMENT   'sandbox' | 'live'  (defaults to 'sandbox')
 */

const LIVE_BASE = "https://api-m.paypal.com";
const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

export type PayPalEnvironment = "sandbox" | "live";

export function paypalEnvironment(): PayPalEnvironment {
  const raw = (Deno.env.get("PAYPAL_ENVIRONMENT") ?? "sandbox").toLowerCase();
  return raw === "live" || raw === "production" ? "live" : "sandbox";
}

export function paypalApiBase(): string {
  return paypalEnvironment() === "live" ? LIVE_BASE : SANDBOX_BASE;
}

export function paypalWebhookId(): string | null {
  // In live we prefer the live-specific id so a leftover sandbox
  // PAYPAL_WEBHOOK_ID can never be used to verify a live event.
  if (paypalEnvironment() === "live") {
    return Deno.env.get("PAYPAL_WEBHOOK_ID_LIVE") ?? Deno.env.get("PAYPAL_WEBHOOK_ID") ?? null;
  }
  return Deno.env.get("PAYPAL_WEBHOOK_ID") ?? null;
}

export function paypalConfigStatus() {
  return {
    environment: paypalEnvironment(),
    client_id_configured: !!Deno.env.get("PAYPAL_CLIENT_ID"),
    client_secret_configured: !!Deno.env.get("PAYPAL_CLIENT_SECRET"),
    webhook_id_configured: !!paypalWebhookId(),
  };
}

/** Public client id is safe to hand to the browser SDK. */
export function paypalPublicClientId(): string | null {
  return Deno.env.get("PAYPAL_CLIENT_ID") ?? null;
}

export class PayPalError extends Error {
  status: number;
  debugId?: string;
  issue?: string;
  constructor(message: string, status: number, issue?: string, debugId?: string) {
    super(message);
    this.name = "PayPalError";
    this.status = status;
    this.issue = issue;
    this.debugId = debugId;
  }
}

/**
 * Redact everything except a small, safe subset before logging.
 * Blocks credentials, auth assertions, card data and payer PII so diagnostics
 * stay PCI/PII-safe while keeping the PayPal debug id we need for support.
 */
const UNSAFE_LOG_KEY =
  /secret|token|authorization|password|assertion|card|cvv|cvc|pan|number|email|phone|payer_name|address|ssn|dob/i;

export function safeLog(step: string, details?: Record<string, unknown>) {
  const clean = details
    ? Object.fromEntries(
      Object.entries(details).filter(([k]) => !UNSAFE_LOG_KEY.test(k)),
    )
    : undefined;
  console.log(`[PAYPAL] ${step}${clean ? ` - ${JSON.stringify(clean)}` : ""}`);
}


// ---------------------------------------------------------------- auth
let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.value;

  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new PayPalError("PayPal is not configured on this environment.", 503, "NOT_CONFIGURED");
  }

  const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    // Keep the upstream status/issue (never the credential) so diagnostics can
    // tell "wrong credentials" apart from "PayPal is down".
    let issue = "AUTH_FAILED";
    try {
      const body = await res.json();
      issue = String(body?.error ?? body?.name ?? issue);
    } catch { /* non-JSON error body */ }
    safeLog("oauth_failed", { http_status: res.status, issue, environment: paypalEnvironment() });
    throw new PayPalError(
      `PayPal rejected the client credentials (HTTP ${res.status}).`,
      res.status >= 500 ? 502 : 401,
      issue,
    );
  }
  const json = await res.json();
  cachedToken = {
    value: json.access_token,
    expiresAt: now + (Number(json.expires_in ?? 3000) * 1000),
  };
  return cachedToken.value;
}

// ------------------------------------------------- partner attribution
/**
 * Mandatory PayPal Partner attribution (BN code) for Vendibook LC.
 * Sent on every REST call and handed to the browser SDK by `paypal-config`.
 */
export const PARTNER_ATTRIBUTION_ID = Deno.env.get("PAYPAL_BN_CODE") ?? "VENDIBOOK_SP_PPCP";

/**
 * `PayPal-Auth-Assertion` lets Vendibook act on an onboarded seller's behalf.
 * Unsigned JWT (alg none) — PayPal authenticates the partner via the access
 * token; the assertion only names the merchant.
 */
export function buildAuthAssertion(merchantId: string): string | null {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  if (!clientId || !merchantId) return null;
  const b64 = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64({ alg: "none" })}.${b64({ iss: clientId, payer_id: merchantId })}.`;
}

// ---------------------------------------------------------------- request
interface PayPalRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
  /** number of retries for transient (5xx / network) failures */
  retries?: number;
  timeoutMs?: number;
  /** Onboarded seller merchant id — adds PayPal-Auth-Assertion. */
  actAsMerchantId?: string | null;
  /** Additional non-auth headers required by a specific endpoint. */
  extraHeaders?: Record<string, string>;
  /** Vendibook payment/order reference, logged for reconciliation. */
  reference?: string | null;
}

export async function paypalRequest<T = any>(
  path: string,
  opts: PayPalRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    idempotencyKey,
    retries = 2,
    timeoutMs = 20_000,
    actAsMerchantId,
    extraHeaders,
    reference,
  } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    try {
      const token = await getPayPalAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        // Mandatory partner attribution — central, never per-call.
        "PayPal-Partner-Attribution-Id": PARTNER_ATTRIBUTION_ID,
        ...(extraHeaders ?? {}),
      };
      if (idempotencyKey) headers["PayPal-Request-Id"] = idempotencyKey;
      if (actAsMerchantId) {
        const assertion = buildAuthAssertion(actAsMerchantId);
        // The assertion itself is never logged — only the merchant it names.
        if (assertion) headers["PayPal-Auth-Assertion"] = assertion;
      }

      const res = await fetch(`${paypalApiBase()}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      // PayPal's correlation id — required for support/certification debugging.
      const correlationId = res.headers.get("paypal-debug-id") ??
        res.headers.get("correlation-id") ?? undefined;

      // Certification diagnostics. Metadata only — no tokens, no card data,
      // no payer PII, no request/response bodies.
      const diagnostics = {
        path,
        method,
        status: res.status,
        debugId: json?.debug_id ?? correlationId,
        latencyMs: Date.now() - startedAt,
        environment: paypalEnvironment(),
        attempt,
        ...(reference ? { reference } : {}),
        ...(idempotencyKey ? { requestId: idempotencyKey } : {}),
        ...(actAsMerchantId ? { onBehalfOf: actAsMerchantId } : {}),
      };

      if (res.ok) {
        safeLog("api_ok", diagnostics);
        return json as T;
      }

      const issue = json?.details?.[0]?.issue ?? json?.name;
      const debugId = json?.debug_id ?? correlationId;
      safeLog("api_error", { ...diagnostics, issue });




      // 4xx is deterministic — do not retry.
      if (res.status < 500 && res.status !== 429) {
        throw new PayPalError(
          json?.message ?? "PayPal rejected the request.",
          res.status,
          issue,
          debugId,
        );
      }
      lastError = new PayPalError(
        json?.message ?? "PayPal is temporarily unavailable.",
        res.status,
        issue,
        debugId,
      );
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof PayPalError && err.status < 500 && err.status !== 429) throw err;
      lastError = err;
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }

  if (lastError instanceof PayPalError) throw lastError;
  throw new PayPalError("PayPal did not respond in time. Please try again.", 504, "TIMEOUT");
}

// ---------------------------------------------------------------- orders
export interface OrderLineItem {
  name: string;
  /** Unit price in cents. */
  unitAmountCents: number;
  quantity?: number;
  description?: string;
  sku?: string;
  category?: "DIGITAL_GOODS" | "PHYSICAL_GOODS" | "DONATION";
}

/** Buyer shipping address for physical-goods orders. */
export interface OrderShippingAddress {
  fullName?: string;
  addressLine1: string;
  addressLine2?: string;
  adminArea2: string; // city
  adminArea1: string; // state
  postalCode: string;
  countryCode?: string;
}

export interface CreateOrderInput {
  /** Amount in cents — always computed server-side from trusted DB values. */
  amountCents: number;
  currency?: string;
  /** Unique per checkout attempt. Doubles as the PayPal invoice_id. */
  reference: string;
  description: string;
  /** Optional itemised breakdown, all in cents. */
  breakdown?: {
    itemTotalCents?: number;
    taxCents?: number;
    shippingCents?: number;
    discountCents?: number;
  };
  idempotencyKey: string;
  softDescriptor?: string;
  /** Defaults to CAPTURE. AUTHORIZE creates a temporary hold instead. */
  intent?: "CAPTURE" | "AUTHORIZE";
  /**
   * Line-item detail. When omitted a single line is derived from
   * `description` so every order still carries `purchase_units[].items`.
   */
  items?: OrderLineItem[];
  /** Physical goods: pass the buyer's address and PayPal collects/echoes it. */
  shipping?: OrderShippingAddress | null;
  /** Multiparty: the onboarded seller who receives the funds. */
  payeeMerchantId?: string | null;
  /** Multiparty: Vendibook's commission taken as a PayPal Partner Fee. */
  platformFeeCents?: number | null;
}



const money = (cents: number, currency: string) => ({
  currency_code: (currency || "USD").toUpperCase(),
  value: (cents / 100).toFixed(2),
});

/**
 * PayPal requires `purchase_units[].items` for certification. Callers may pass
 * lines, but they are only used when they reconcile exactly with the order
 * total PayPal will charge — otherwise PayPal rejects the order with 422. When
 * they do not reconcile (or are absent) a single line is derived from the
 * description, which always reconciles.
 */
function buildItems(input: CreateOrderInput, currency: string, itemTotalCents: number) {
  const physical = !!input.shipping;
  const supplied = input.items ?? [];
  const suppliedTotal = supplied.reduce(
    (sum, line) => sum + Math.round(line.unitAmountCents) * Math.max(1, Math.round(line.quantity ?? 1)),
    0,
  );
  const lines = supplied.length && suppliedTotal === itemTotalCents
    ? supplied
    : [{
      name: input.description.slice(0, 127),
      unitAmountCents: itemTotalCents,
      quantity: 1,
      category: physical ? "PHYSICAL_GOODS" as const : "DIGITAL_GOODS" as const,
    }];

  return lines.map((line) => ({
    name: (line.name || "Vendibook").slice(0, 127),
    quantity: String(Math.max(1, Math.round(line.quantity ?? 1))),
    unit_amount: money(line.unitAmountCents, currency),
    category: line.category ?? (physical ? "PHYSICAL_GOODS" : "DIGITAL_GOODS"),
    ...(line.description ? { description: line.description.slice(0, 127) } : {}),
    ...(line.sku ? { sku: line.sku.slice(0, 127) } : {}),
  }));
}

function buildShipping(address?: OrderShippingAddress | null) {
  if (!address) return undefined;
  return {
    ...(address.fullName ? { name: { full_name: address.fullName.slice(0, 300) } } : {}),
    address: {
      address_line_1: address.addressLine1,
      ...(address.addressLine2 ? { address_line_2: address.addressLine2 } : {}),
      admin_area_2: address.adminArea2,
      admin_area_1: address.adminArea1,
      postal_code: address.postalCode,
      country_code: address.countryCode ?? "US",
    },
  };
}

/**
 * Multiparty routing (Connected Path). DORMANT: it is only reachable when the
 * server-side `PAYPAL_MULTIPARTY_ENABLED` environment switch is explicitly
 * "true", which it is not in any current environment. With the switch off,
 * a payee/platform fee passed by any caller is refused outright rather than
 * silently ignored, so money routing cannot drift by accident.
 */
function buildMultiparty(input: CreateOrderInput, currency: string) {
  if (!input.payeeMerchantId && !input.platformFeeCents) return {};
  if (!multipartyEnvEnabled()) {
    throw new PayPalError(
      "Multiparty payouts are not enabled in this environment.",
      500,
      "MULTIPARTY_DISABLED",
    );
  }
  if (!input.payeeMerchantId) return {};
  const fee = Math.max(0, Math.round(input.platformFeeCents ?? 0));
  return {
    payee: { merchant_id: input.payeeMerchantId },
    ...(fee > 0
      ? {
        payment_instruction: {
          disbursement_mode: "INSTANT",
          platform_fees: [{ amount: money(fee, currency) }],
        },
      }
      : {}),
  };
}

export async function createPayPalOrder(input: CreateOrderInput) {
  const currency = (input.currency ?? "USD").toUpperCase();
  const b = input.breakdown;
  const taxCents = b?.taxCents ?? 0;
  const shippingCents = b?.shippingCents ?? 0;
  const discountCents = b?.discountCents ?? 0;
  // Always derive the item total from the charged amount so the breakdown can
  // never disagree with `amount.value` (PayPal 422 otherwise).
  const itemTotalCents = Math.max(
    0,
    input.amountCents - taxCents - shippingCents + discountCents,
  );

  const amount: Record<string, unknown> = money(input.amountCents, currency);
  amount.breakdown = {
    item_total: money(itemTotalCents, currency),
    ...(taxCents ? { tax_total: money(taxCents, currency) } : {}),
    ...(shippingCents ? { shipping: money(shippingCents, currency) } : {}),
    ...(discountCents ? { discount: money(discountCents, currency) } : {}),
  };

  // AUTHORIZE places a temporary hold on approval; nothing is charged until
  // an explicit capture. CAPTURE (the default) charges on approval.
  const intent = input.intent === "AUTHORIZE" ? "AUTHORIZE" : "CAPTURE";
  const shipping = buildShipping(input.shipping);

  return await paypalRequest("/v2/checkout/orders", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    reference: input.reference,
    body: {
      intent,
      purchase_units: [{
        reference_id: input.reference,
        invoice_id: input.reference,
        description: input.description.slice(0, 127),
        custom_id: input.reference,
        amount,
        items: buildItems(input, currency, itemTotalCents),
        ...(shipping ? { shipping } : {}),
        ...buildMultiparty(input, currency),
        ...(input.softDescriptor
          ? { soft_descriptor: input.softDescriptor.slice(0, 22) }
          : {}),
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Vendibook",
            // Physical assets that Vendibook ships need a real address;
            // everything else is a service/digital line with no shipping.
            shipping_preference: shipping ? "SET_PROVIDED_ADDRESS" : "NO_SHIPPING",
            user_action: intent === "AUTHORIZE" ? "CONTINUE" : "PAY_NOW",
            landing_page: "LOGIN",
          },
        },
      },
    },

  });
}


export async function getPayPalOrder(orderId: string) {
  return await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
}

export async function capturePayPalOrder(orderId: string, idempotencyKey: string) {
  return await paypalRequest(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    { method: "POST", idempotencyKey, body: {} },
  );
}

export async function refundPayPalCapture(opts: {
  captureId: string;
  amountCents?: number;
  currency?: string;
  reason?: string;
  idempotencyKey: string;
}) {
  const body: Record<string, unknown> = {};
  if (opts.amountCents !== undefined) {
    body.amount = money(opts.amountCents, opts.currency ?? "USD");
  }
  if (opts.reason) body.note_to_payer = opts.reason.slice(0, 255);

  return await paypalRequest(
    `/v2/payments/captures/${encodeURIComponent(opts.captureId)}/refund`,
    { method: "POST", idempotencyKey: opts.idempotencyKey, body },
  );
}

// ------------------------------------------------- authorize / capture later
/**
 * Creates an order with intent AUTHORIZE. Nothing is charged when the payer
 * approves — funds are only held until an explicit capture or void.
 *
 * Used by flows where Vendibook must confirm an off-PayPal outcome (e.g. an
 * identity check) before taking the money.
 */
export async function createPayPalAuthorizeOrder(input: CreateOrderInput) {
  const currency = (input.currency ?? "USD").toUpperCase();
  return await paypalRequest("/v2/checkout/orders", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      intent: "AUTHORIZE",
      purchase_units: [{
        reference_id: input.reference,
        invoice_id: input.reference,
        description: input.description.slice(0, 127),
        custom_id: input.reference,
        amount: money(input.amountCents, currency),
        ...(input.softDescriptor
          ? { soft_descriptor: input.softDescriptor.slice(0, 22) }
          : {}),
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Vendibook",
            shipping_preference: "NO_SHIPPING",
            user_action: "CONTINUE",
            landing_page: "LOGIN",
          },
        },
      },
    },
  });
}

/** Turns an approved AUTHORIZE order into a held authorization. */
export async function authorizePayPalOrder(orderId: string, idempotencyKey: string) {
  return await paypalRequest(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/authorize`,
    { method: "POST", idempotencyKey, body: {}, retries: 1 },
  );
}

export async function getPayPalAuthorization(authorizationId: string) {
  return await paypalRequest(
    `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}`,
  );
}

export async function capturePayPalAuthorization(opts: {
  authorizationId: string;
  amountCents: number;
  currency?: string;
  invoiceId?: string;
  idempotencyKey: string;
}) {
  return await paypalRequest(
    `/v2/payments/authorizations/${encodeURIComponent(opts.authorizationId)}/capture`,
    {
      method: "POST",
      idempotencyKey: opts.idempotencyKey,
      retries: 1,
      body: {
        amount: money(opts.amountCents, opts.currency ?? "USD"),
        final_capture: true,
        ...(opts.invoiceId ? { invoice_id: opts.invoiceId } : {}),
      },
    },
  );
}

/** Releases a held authorization. PayPal returns 204 with an empty body. */
export async function voidPayPalAuthorization(
  authorizationId: string,
  idempotencyKey: string,
) {
  return await paypalRequest(
    `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/void`,
    { method: "POST", idempotencyKey, retries: 1 },
  );
}

// ---------------------------------------------------------------- subscriptions
export async function getPayPalSubscription(subscriptionId: string) {
  return await paypalRequest(
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
  );
}

export async function cancelPayPalSubscription(subscriptionId: string, reason: string) {
  return await paypalRequest(
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    { method: "POST", body: { reason: reason.slice(0, 127) }, retries: 1 },
  );
}

export async function suspendPayPalSubscription(subscriptionId: string, reason: string) {
  return await paypalRequest(
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/suspend`,
    { method: "POST", body: { reason: reason.slice(0, 127) }, retries: 1 },
  );
}

// ---------------------------------------------------------------- webhooks
/**
 * Verifies a webhook using PayPal's verify-webhook-signature endpoint.
 * Returns true only on an explicit SUCCESS verdict.
 */
export async function verifyPayPalWebhook(
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  const webhookId = paypalWebhookId();
  if (!webhookId) {
    safeLog("webhook_verify_skipped_no_id");
    return false;
  }

  const required = [
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-sig",
    "paypal-transmission-time",
  ];
  const values: Record<string, string> = {};
  for (const h of required) {
    const v = headers.get(h);
    if (!v) {
      safeLog("webhook_verify_missing_header", { header: h });
      return false;
    }
    values[h] = v;
  }

  try {
    const result = await paypalRequest<{ verification_status: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        retries: 1,
        body: {
          auth_algo: values["paypal-auth-algo"],
          cert_url: values["paypal-cert-url"],
          transmission_id: values["paypal-transmission-id"],
          transmission_sig: values["paypal-transmission-sig"],
          transmission_time: values["paypal-transmission-time"],
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody),
        },
      },
    );
    return result.verification_status === "SUCCESS";
  } catch (err) {
    safeLog("webhook_verify_error", { message: (err as Error).message });
    return false;
  }
}

// ---------------------------------------------------------------- helpers
/** Stable, collision-resistant internal reference for a checkout attempt. */
export function newPaymentReference(prefix = "VB"): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export function centsFromPayPalAmount(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  return Math.round(Number(value) * 100);
}
