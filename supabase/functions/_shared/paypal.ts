import { cardPaymentSource } from "./paypalCardPolicy.ts";
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

// NOTE: the Connected Path rollout flag lives in ./paypalMultiparty.ts. It is
// intentionally NOT imported here — this layer creates first-party orders only.


import { logPayPalApiCall } from "./paypalApiLog.ts";
import { assertionIssuerClientId, buildAuthAssertionToken } from "./paypalAssertion.ts";


const LIVE_BASE = "https://api-m.paypal.com";

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

export type PayPalEnvironment = "sandbox" | "live";

/**
 * Canonical marketplace checkout contract. Approval returns the buyer to
 * Vendibook for a final review; only their Submit payment click captures.
 * PayPal AUTHORIZE is reserved for separate, explicit hold workflows.
 */
export const PAYPAL_CHECKOUT_INTENT = "CAPTURE" as const;
export const PAYPAL_CHECKOUT_USER_ACTION = "CONTINUE" as const;

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
  // Sandbox: prefer the sandbox-specific id. Without the id that matches the
  // webhook PayPal is actually calling, every event fails signature
  // verification and is dropped — the "silent payments" symptom.
  return Deno.env.get("PAYPAL_WEBHOOK_ID_SANDBOX") ?? Deno.env.get("PAYPAL_WEBHOOK_ID") ?? null;
}

/** Which env var supplied the webhook id — never the id itself. */
export function paypalWebhookIdSource(): string | null {
  if (paypalEnvironment() === "live") {
    if (Deno.env.get("PAYPAL_WEBHOOK_ID_LIVE")) return "PAYPAL_WEBHOOK_ID_LIVE";
  } else if (Deno.env.get("PAYPAL_WEBHOOK_ID_SANDBOX")) {
    return "PAYPAL_WEBHOOK_ID_SANDBOX";
  }
  return Deno.env.get("PAYPAL_WEBHOOK_ID") ? "PAYPAL_WEBHOOK_ID" : null;
}

export function paypalConfigStatus() {
  const clientId = paypalPublicClientId();
  return {
    environment: paypalEnvironment(),
    intent: PAYPAL_CHECKOUT_INTENT,
    user_action: PAYPAL_CHECKOUT_USER_ACTION,
    client_id_configured: !!clientId,
    client_id_prefix: clientId ? clientId.slice(0, 8) : null,
    client_secret_configured: !!(paypalEnvironment() === "sandbox"
      ? Deno.env.get("PAYPAL_SANDBOX_CLIENT_SECRET") ?? Deno.env.get("PAYPAL_CLIENT_SECRET")
      : Deno.env.get("PAYPAL_CLIENT_SECRET")),
    webhook_id_configured: !!paypalWebhookId(),
    webhook_id_source: paypalWebhookIdSource(),
  };
}

/**
 * Public client id is safe to hand to the browser SDK.
 *
 * MUST match the environment the server creates orders in: a live client id
 * in the browser while the server talks to sandbox opens PayPal against
 * production, where the order token does not exist and checkout fails.
 */
export function paypalPublicClientId(): string | null {
  if (paypalEnvironment() === "sandbox") {
    return Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID") ?? Deno.env.get("PAYPAL_CLIENT_ID") ?? null;
  }
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
// Tokens are cached and reused until shortly before expiry (PayPal requires
// access-token reuse). The cache is keyed by environment so a sandbox-scoped
// onboarding token (PAYPAL_ONBOARDING_ENV=sandbox) never invalidates the live
// token used by checkout.
const tokenCache = new Map<PayPalEnvironment, { value: string; expiresAt: number }>();

function clientCredentials(
  env: PayPalEnvironment,
): { id: string | null; secret: string | null } {
  if (env === "sandbox") {
    return {
      id: Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID") ?? Deno.env.get("PAYPAL_CLIENT_ID") ?? null,
      secret: Deno.env.get("PAYPAL_SANDBOX_CLIENT_SECRET") ??
        Deno.env.get("PAYPAL_CLIENT_SECRET") ?? null,
    };
  }
  return {
    id: Deno.env.get("PAYPAL_CLIENT_ID") ?? null,
    secret: Deno.env.get("PAYPAL_CLIENT_SECRET") ?? null,
  };
}

export async function getPayPalAccessTokenForEnv(env: PayPalEnvironment): Promise<string> {
  const now = Date.now();
  const cached = tokenCache.get(env);
  if (cached && cached.expiresAt > now + 60_000) return cached.value;

  const { id: clientId, secret: clientSecret } = clientCredentials(env);
  if (!clientId || !clientSecret) {
    throw new PayPalError("PayPal is not configured on this environment.", 503, "NOT_CONFIGURED");
  }

  const base = env === "live" ? LIVE_BASE : SANDBOX_BASE;
  const res = await fetch(`${base}/v1/oauth2/token`, {
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
    safeLog("oauth_failed", { http_status: res.status, issue, environment: env });
    throw new PayPalError(
      `PayPal rejected the client credentials (HTTP ${res.status}).`,
      res.status >= 500 ? 502 : 401,
      issue,
    );
  }
  const json = await res.json();
  const entry = {
    value: json.access_token,
    expiresAt: now + (Number(json.expires_in ?? 3000) * 1000),
  };
  tokenCache.set(env, entry);
  return entry.value;
}

/** Default-environment token — unchanged behavior for all existing callers. */
export async function getPayPalAccessToken(): Promise<string> {
  return getPayPalAccessTokenForEnv(paypalEnvironment());
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
 *
 * `iss` MUST be the platform client id for the same environment as the access
 * token being sent, so the environment is always resolved explicitly here.
 */
export function buildAuthAssertion(
  merchantId: string,
  environment?: PayPalEnvironment,
): string | null {
  const env = environment ?? paypalEnvironment();
  const clientId = assertionIssuerClientId(env, {
    sandboxClientId: Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID"),
    liveClientId: Deno.env.get("PAYPAL_CLIENT_ID"),
  });
  return buildAuthAssertionToken(clientId, merchantId);
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
  /** Seller this call is about — stored on the API log row. */
  sellerId?: string | null;
  /**
   * Call PayPal in a specific environment (e.g. sandbox onboarding while live
   * checkout runs). Defaults to the ambient PAYPAL_ENVIRONMENT.
   */
  environment?: PayPalEnvironment;
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
    sellerId,
    environment,
  } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    try {
      const env = environment ?? paypalEnvironment();
      const token = await getPayPalAccessTokenForEnv(env);
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        // Mandatory partner attribution — central, never per-call.
        "PayPal-Partner-Attribution-Id": PARTNER_ATTRIBUTION_ID,
        ...(extraHeaders ?? {}),
      };
      // Normal checkout must use PayPal's actual outcome. Legacy negative-test
      // secrets are intentionally ignored, including ALL_SANDBOX_ORDERS.
      // Also prevent a caller from accidentally reintroducing a mock response.
      for (const name of Object.keys(headers)) {
        if (name.toLowerCase() === "paypal-mock-response") delete headers[name];
      }
      if (idempotencyKey) headers["PayPal-Request-Id"] = idempotencyKey;
      // Identifies an onboarded seller on merchant-scoped calls (Step 2
      // onboarding/status). It never changes who is paid on an order — orders
      // stay first-party.
      if (actAsMerchantId) {
        const assertion = buildAuthAssertion(actAsMerchantId, env);
        // The assertion itself is never logged — only the merchant it names.
        if (assertion) headers["PayPal-Auth-Assertion"] = assertion;
      }



      const res = await fetch(`${env === "live" ? LIVE_BASE : SANDBOX_BASE}${path}`, {
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
        environment: env,
        attempt,
        ...(reference ? { reference } : {}),
        ...(idempotencyKey ? { requestId: idempotencyKey } : {}),
        ...(actAsMerchantId ? { onBehalfOf: actAsMerchantId } : {}),
      };

      logPayPalApiCall({
        path,
        method,
        environment: env,
        requestHeaders: headers,
        requestBody: body,
        responseStatus: res.status,
        responseBody: json,
        debugId: json?.debug_id ?? correlationId ?? null,
        latencyMs: Date.now() - startedAt,
        sellerId: sellerId ?? actAsMerchantId ?? null,
        orderId: (json?.id as string | undefined) ?? null,
        reference: reference ?? null,
      });

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
  /** Hosted Advanced Card Fields; never accepts raw card details. */
  cardFields?: boolean;
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
  /**
   * Buyer contact passed in `purchase_units[].shipping`. PayPal uses it to
   * prefill login and to drive the Contact Module, so the buyer is never asked
   * twice for something we already hold.
   */
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  /** Where PayPal returns the buyer after approval / cancellation. */
  returnUrl?: string | null;
  cancelUrl?: string | null;
  /** Seller id recorded on the API log row. */
  sellerId?: string | null;
  /**
   * Connected Path routing. When set, the seller's PayPal merchant id becomes
   * the payee and Vendibook's cut is taken as a platform fee. Resolved ONLY
   * server-side by `sellerMultipartyReady()`; nothing from the browser can
   * reach these fields.
   */
  payeeMerchantId?: string | null;
  /** Vendibook's fee in cents, disbursed to the partner account. */
  platformFeeCents?: number;
}

/** Vendibook's own merchant id — receives the platform fee on routed orders. */
export function paypalPartnerMerchantId(): string | null {
  const env = paypalEnvironment();
  if (env === "sandbox") {
    return Deno.env.get("PAYPAL_SANDBOX_PARTNER_MERCHANT_ID") ??
      Deno.env.get("PAYPAL_PARTNER_MERCHANT_ID") ?? null;
  }
  return Deno.env.get("PAYPAL_PARTNER_MERCHANT_ID") ?? null;
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
/**
 * `purchase_units[].items` is mandatory for Vendibook: item-level disputes and
 * the Tracking API both depend on it, and the Tracking API rejects any SKU that
 * was not present on the original order.
 *
 * The supplied lines must reconcile exactly with the item total PayPal will
 * charge. A mismatch is a bug in the caller's arithmetic, so it throws here
 * rather than letting PayPal answer 422 in front of a buyer.
 */
export class OrderArithmeticError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderArithmeticError";
  }
}

function buildItems(input: CreateOrderInput, currency: string, itemTotalCents: number) {
  const physical = !!input.shipping;
  const supplied = input.items ?? [];
  const suppliedTotal = supplied.reduce(
    (sum, line) => sum + Math.round(line.unitAmountCents) * Math.max(1, Math.round(line.quantity ?? 1)),
    0,
  );

  if (supplied.length && suppliedTotal !== itemTotalCents) {
    throw new OrderArithmeticError(
      `Order line items (${suppliedTotal}) do not sum to the item total (${itemTotalCents}) for ${input.reference}.`,
    );
  }

  const lines = supplied.length ? supplied : [{
    name: input.description.slice(0, 127),
    unitAmountCents: itemTotalCents,
    quantity: 1,
    sku: `${input.reference}-1`,
    category: physical ? "PHYSICAL_GOODS" as const : "DIGITAL_GOODS" as const,
  }];

  return lines.map((line, index) => ({
    name: (line.name || "Vendibook").slice(0, 127),
    quantity: String(Math.max(1, Math.round(line.quantity ?? 1))),
    unit_amount: money(line.unitAmountCents, currency),
    category: line.category ?? (physical ? "PHYSICAL_GOODS" : "DIGITAL_GOODS"),
    description: (line.description ?? line.name ?? "Vendibook order item").slice(0, 127),
    // A stable SKU is required: the Tracking API only accepts SKUs that were
    // present at order creation.
    sku: (line.sku ?? `${input.reference}-${index + 1}`).slice(0, 127),
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

/*
 * Connected Path (multiparty) order routing is intentionally NOT implemented
 * here. Every order created by Vendibook today is first-party: Vendibook is
 * the payee and sellers are paid by the existing manual payout process.
 * `purchase_units[].payee` and `payment_instruction.platform_fees` will be
 * added deliberately in Step 3, behind the server-side paypalMultiparty flag
 * and per-seller readiness. Do not reintroduce them earlier.
 */


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

  // Fail loudly here rather than letting PayPal reject the order in front of a
  // buyer: item_total + tax_total + shipping - discount must equal the total.
  const reconciled = itemTotalCents + taxCents + shippingCents - discountCents;
  if (reconciled !== input.amountCents) {
    throw new OrderArithmeticError(
      `Order breakdown does not sum to the total for ${input.reference}: ` +
        `${reconciled} != ${input.amountCents}.`,
    );
  }

  const amount: Record<string, unknown> = money(input.amountCents, currency);
  amount.breakdown = {
    item_total: money(itemTotalCents, currency),
    ...(taxCents ? { tax_total: money(taxCents, currency) } : {}),
    ...(shippingCents ? { shipping: money(shippingCents, currency) } : {}),
    ...(discountCents ? { discount: money(discountCents, currency) } : {}),
  };

  // Marketplace checkout always creates CAPTURE orders. `user_action` below
  // controls the final-review UI independently: approval itself does not call
  // capture; Vendibook captures only after the buyer submits the review step.
  const intent = PAYPAL_CHECKOUT_INTENT;
  const shipping = buildShipping(input.shipping);
  // Buyer contact rides on the shipping object so PayPal can prefill login and
  // run the Contact Module. It is sent even on NO_SHIPPING orders.
  const shippingBlock = (shipping || input.buyerEmail || input.buyerPhone)
    ? {
      ...(shipping ?? {}),
      ...(input.buyerEmail ? { email_address: input.buyerEmail } : {}),
      ...(input.buyerPhone
        ? {
          phone_number: {
            country_code: "1",
            national_number: input.buyerPhone.replace(/\D/g, "").slice(-10),
          },
        }
        : {}),
    }
    : undefined;

  // ---- Connected Path routing (off unless the caller resolved a ready seller)
  const payeeMerchantId = input.payeeMerchantId?.trim() || null;
  // The fee can never exceed the order, and a routed order always keeps at
  // least one cent moving to the seller.
  const platformFeeCents = payeeMerchantId
    ? Math.max(0, Math.min(Math.round(input.platformFeeCents ?? 0), input.amountCents - 1))
    : 0;
  const partnerMerchantId = paypalPartnerMerchantId();
  const paymentInstruction = payeeMerchantId
    ? {
      disbursement_mode: "INSTANT",
      ...(platformFeeCents > 0
        ? {
          platform_fees: [{
            amount: money(platformFeeCents, currency),
            ...(partnerMerchantId ? { payee: { merchant_id: partnerMerchantId } } : {}),
          }],
        }
        : {}),
    }
    : null;

  return await paypalRequest("/v2/checkout/orders", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    reference: input.reference,
    sellerId: input.sellerId ?? null,
    // Acting on the seller's behalf is required whenever they are the payee.
    actAsMerchantId: payeeMerchantId,
    body: {
      intent,
      purchase_units: [{
        reference_id: input.reference,
        invoice_id: input.reference,
        description: input.description.slice(0, 127),
        custom_id: input.reference,
        amount,
        items: buildItems(input, currency, itemTotalCents),
        ...(shippingBlock ? { shipping: shippingBlock } : {}),
        ...(payeeMerchantId ? { payee: { merchant_id: payeeMerchantId } } : {}),
        ...(paymentInstruction ? { payment_instruction: paymentInstruction } : {}),
        ...(input.softDescriptor
          ? { soft_descriptor: input.softDescriptor.slice(0, 22) }
          : {}),
      }],
      payment_source: input.cardFields ? cardPaymentSource(input.returnUrl, input.cancelUrl, !!shipping) : {
        paypal: {
          experience_context: {
            brand_name: "Vendibook",
            // Physical assets that Vendibook ships need a real address;
            // everything else is a service/digital line with no shipping.
            shipping_preference: shipping ? "SET_PROVIDED_ADDRESS" : "NO_SHIPPING",
            // CONTINUE: PayPal hands the payer back to Vendibook after they
            // approve, and Vendibook shows a final Review & authorize step
            // before anything is captured. Never PAY_NOW.
            user_action: PAYPAL_CHECKOUT_USER_ACTION,

            landing_page: "LOGIN",
            // Server half of App Switch. The SDK sets appSwitchWhenAvailable.
            // PayPal expects an object here — a bare boolean is rejected as
            // MALFORMED_REQUEST_JSON before the order is ever created.
            app_switch_preference: { launch_paypal_app: true },

            ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
            ...(input.cancelUrl ? { cancel_url: input.cancelUrl } : {}),
          },
        },
      },
    },

  });
}


/**
 * Updates an existing order when the buyer changes the purchase (amount,
 * shipping, items). PayPal requires a PATCH — creating a second order for the
 * same checkout is a certification failure.
 */
export async function patchPayPalOrder(
  orderId: string,
  patch: { amountCents: number; currency?: string; breakdown?: CreateOrderInput["breakdown"]; referenceId: string },
) {
  const currency = (patch.currency ?? "USD").toUpperCase();
  const taxCents = patch.breakdown?.taxCents ?? 0;
  const shippingCents = patch.breakdown?.shippingCents ?? 0;
  const discountCents = patch.breakdown?.discountCents ?? 0;
  const itemTotalCents = Math.max(0, patch.amountCents - taxCents - shippingCents + discountCents);
  const value: Record<string, unknown> = money(patch.amountCents, currency);
  value.breakdown = {
    item_total: money(itemTotalCents, currency),
    ...(taxCents ? { tax_total: money(taxCents, currency) } : {}),
    ...(shippingCents ? { shipping: money(shippingCents, currency) } : {}),
    ...(discountCents ? { discount: money(discountCents, currency) } : {}),
  };
  return await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    retries: 1,
    body: [{
      op: "replace",
      path: `/purchase_units/@reference_id=='${patch.referenceId}'/amount`,
      value,
    }],
  });
}

/**
 * Adds parcel tracking to a captured order. PayPal rejects any SKU that was
 * not present on the original order, so callers must pass the SKUs persisted
 * on the payment record at creation time.
 */
export async function addPayPalTracking(opts: {
  orderId: string;
  captureId: string;
  trackingNumber: string;
  carrier: string;
  items?: { name: string; sku: string; quantity?: number }[];
  notifyPayer?: boolean;
  actAsMerchantId?: string | null;
}) {
  return await paypalRequest(
    `/v2/checkout/orders/${encodeURIComponent(opts.orderId)}/track`,
    {
      method: "POST",
      retries: 1,
      actAsMerchantId: opts.actAsMerchantId ?? null,
      body: {
        capture_id: opts.captureId,
        tracking_number: opts.trackingNumber,
        carrier: opts.carrier,
        notify_payer: opts.notifyPayer ?? true,
        ...(opts.items?.length
          ? {
            items: opts.items.map((i) => ({
              name: i.name.slice(0, 127),
              sku: i.sku.slice(0, 127),
              quantity: String(Math.max(1, Math.round(i.quantity ?? 1))),
            })),
          }
          : {}),
      },
    },
  );
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
  /**
   * Seller merchant id when the capture was routed to their account
   * (Connected Path). PayPal refuses the refund without the assertion.
   */
  actAsMerchantId?: string | null;
}) {
  const body: Record<string, unknown> = {};
  if (opts.amountCents !== undefined) {
    body.amount = money(opts.amountCents, opts.currency ?? "USD");
  }
  if (opts.reason) body.note_to_payer = opts.reason.slice(0, 255);

  return await paypalRequest(
    `/v2/payments/captures/${encodeURIComponent(opts.captureId)}/refund`,
    {
      method: "POST",
      idempotencyKey: opts.idempotencyKey,
      body,
      actAsMerchantId: opts.actAsMerchantId ?? null,
    },
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

// ---------------------------------------------------------------- onboarding
// Step 2 — seller onboarding (Partner Referral / merchant-integration status).
// Sandbox-first: the onboarding flow can run in the sandbox while live
// checkout keeps using live credentials, because every call here is scoped to
// the onboarding environment and its own token cache entry.

/**
 * Environment the seller-onboarding flow runs in. Defaults to the ambient
 * PAYPAL_ENVIRONMENT so misconfiguration can never silently route live sellers
 * into a sandbox signup (or vice versa).
 */
export function paypalOnboardingEnvironment(): PayPalEnvironment {
  const raw = (Deno.env.get("PAYPAL_ONBOARDING_ENV") ?? "").toLowerCase();
  if (raw === "sandbox" || raw === "live") return raw;
  return paypalEnvironment();
}

/** Master switch for the seller connection UI/flow. Default OFF. */
export function sellerOnboardingEnabled(): boolean {
  return (Deno.env.get("PAYPAL_SELLER_ONBOARDING_ENABLED") ?? "").toLowerCase() === "true";
}

/** Vendibook's partner merchant id in the given environment. */
function partnerMerchantIdForEnv(env: PayPalEnvironment): string | null {
  if (env === "sandbox") {
    return Deno.env.get("PAYPAL_SANDBOX_PARTNER_MERCHANT_ID") ??
      Deno.env.get("PAYPAL_PARTNER_MERCHANT_ID") ?? null;
  }
  return Deno.env.get("PAYPAL_PARTNER_MERCHANT_ID") ?? null;
}

/**
 * Creates a Partner Referral and returns PayPal's action_url (the hosted
 * signup the seller is redirected to) plus the raw link set for diagnostics.
 */
/**
 * Vendibook sellers are BUSINESSES ONLY.
 * - The REST app "Intent" setting must be set to **Business** (PayPal app settings /
 *   account manager). Intent is not settable per-referral; it governs whether a seller
 *   is asked to sign up for, log in to, or upgrade to a Business account.
 * - products: ["PPCP"] is business-only (casual/progressive onboarding is NOT used and
 *   would not support card payments). Do not add EXPRESS_CHECKOUT casual variants.
 * - Features requested here must exactly match the REST app's toggled features, or
 *   onboarding errors. PARTNER_FEE is added only when Platform Fee is toggled on
 *   (Step 3 / multiparty routing).
 */
export async function createPartnerReferral(opts: {
  trackingId: string;
  returnUrl: string;
}): Promise<{ actionUrl: string | null; links: { rel: string; href: string }[] }> {
  const env = paypalOnboardingEnvironment();
  const result = await paypalRequest<{ links?: { rel: string; href: string }[] }>(
    "/v2/customer/partner-referrals",
    {
      method: "POST",
      environment: env,
      reference: opts.trackingId,
      body: {
        tracking_id: opts.trackingId,
        partner_config: {
          partner_notification_url: opts.returnUrl,
          return_url: opts.returnUrl,
        },
        operations: [{
          operation: "API_INTEGRATION",
          api_integration_preference: {
            rest_api_integration: {
              integration_method: "PAYPAL",
              integration_type: "THIRD_PARTY",
              third_party_details: {
                features: [
                  "PAYMENT",
                  "REFUND",
                  "ACCESS_MERCHANT_INFORMATION",
                  "BILLING_AGREEMENT",
                ],
              },
            },
          },
        }],
        products: ["PPCP"],
        legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
      },
    },
  );
  const actionUrl = (result?.links ?? []).find((l) => l.rel === "action_url")?.href ?? null;
  return { actionUrl, links: result?.links ?? [] };
}

/**
 * Fetches PayPal's merchant-integration record for an onboarded seller.
 * Accepts either the Vendibook tracking id (looked up via tracking_ids) or the
 * PayPal merchant id (path lookup). Returns PayPal's raw record.
 */
export async function getMerchantIntegrationStatus(
  trackingOrMerchantId: string,
  opts?: { environment?: PayPalEnvironment },
): Promise<Record<string, any>> {
  const env = opts?.environment ?? paypalOnboardingEnvironment();
  const partnerId = partnerMerchantIdForEnv(env);
  if (!partnerId) {
    throw new PayPalError("PayPal partner merchant id is not configured.", 503, "NOT_CONFIGURED");
  }
  const encoded = encodeURIComponent(trackingOrMerchantId);
  if (trackingOrMerchantId.startsWith("vb-")) {
    // PayPal's tracking lookup takes the SINGULAR `tracking_id` query param.
    // It answers with the merchant-integration object directly; older/partner
    // responses wrap it in `merchant_integrations`, so accept both shapes.
    const result = await paypalRequest<
      Record<string, any> & { merchant_integrations?: Record<string, any>[] }
    >(
      `/v1/customer/partners/${encodeURIComponent(partnerId)}/merchant-integrations` +
        `?tracking_id=${encoded}`,
      { environment: env },
    );
    const merchant = Array.isArray(result?.merchant_integrations) ? result.merchant_integrations.find((item: any) => item.tracking_id === trackingOrMerchantId) ?? result.merchant_integrations[0] : result;
    if (merchant?.merchant_id && !Array.isArray(merchant.oauth_integrations)) {
      return await getMerchantIntegrationStatus(merchant.merchant_id, { environment: env });
    }
    return merchant ?? {};
  }
  return await paypalRequest<Record<string, any>>(
    `/v1/customer/partners/${encodeURIComponent(partnerId)}/merchant-integrations/${encoded}`,
    { environment: env },
  );
}

/** Public client ID paired with the onboarding environment; never a secret. */
export function paypalOnboardingClientId(): string | null {
  return clientCredentials(paypalOnboardingEnvironment()).id || null;
}

