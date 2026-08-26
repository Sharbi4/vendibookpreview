/**
 * Provider-agnostic payment contract.
 *
 * NO business logic anywhere in the codebase should import a provider SDK or
 * call a provider REST endpoint directly. Everything goes through a
 * `PaymentProvider` implementation obtained from `_shared/payments/index.ts`.
 *
 * Adding a provider (Dwolla, Finix, Adyen, a reinstated Stripe) means writing
 * one file that satisfies this interface and registering it — no caller changes.
 */

export type ProviderName = "paypal" | "dwolla" | "stripe" | "finix" | "adyen";

export type ProviderEnvironment = "sandbox" | "live";

/** Thrown when a provider does not (yet) implement a capability. */
export class UnsupportedOperationError extends Error {
  constructor(provider: ProviderName, operation: string) {
    super(`${provider} does not support ${operation}.`);
    this.name = "UnsupportedOperationError";
  }
}

/** Normalised, provider-independent failure. */
export class PaymentProviderError extends Error {
  provider: ProviderName;
  status: number;
  code: string;
  debugId?: string;
  retryable: boolean;
  constructor(opts: {
    provider: ProviderName;
    message: string;
    status?: number;
    code?: string;
    debugId?: string;
    retryable?: boolean;
  }) {
    super(opts.message);
    this.name = "PaymentProviderError";
    this.provider = opts.provider;
    this.status = opts.status ?? 502;
    this.code = opts.code ?? "provider_error";
    this.debugId = opts.debugId;
    this.retryable = opts.retryable ?? (opts.status === undefined || opts.status >= 500);
  }
}

// ------------------------------------------------------------------ money

export interface Money {
  /** Always integer minor units. Floats never cross this boundary. */
  amountCents: number;
  currency: string;
}

export type NormalizedPaymentStatus =
  | "created"
  | "approved"
  | "pending"
  | "completed"
  | "declined"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | "reversed";

// ------------------------------------------------------------------ orders

export interface CreateOrderRequest {
  /** Server-derived amount. Callers must never pass a browser-supplied value. */
  amount: Money;
  /** Internal reference. Doubles as invoice id and idempotency key. */
  reference: string;
  description: string;
  breakdown?: {
    itemTotalCents?: number;
    taxCents?: number;
    shippingCents?: number;
    discountCents?: number;
  };
  softDescriptor?: string;
  /** Overrides the default reference-derived idempotency key. */
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  /**
   * CAPTURE (default) charges on payer approval. AUTHORIZE places a temporary
   * hold that must later be captured or voided explicitly.
   */
  intent?: "CAPTURE" | "AUTHORIZE";
}

export interface ProviderOrder {
  providerOrderId: string;
  status: NormalizedPaymentStatus;
  reference: string;
  amount: Money;
  raw: unknown;
}

export interface CaptureResult {
  providerOrderId: string;
  captureId: string;
  status: NormalizedPaymentStatus;
  amount: Money;
  payerId?: string | null;
  paymentSource?: string | null;
  raw: unknown;
}

/** Normalized lifecycle of a temporary hold (PayPal authorization). */
export type NormalizedAuthorizationStatus =
  | "created"
  | "pending"
  | "partially_captured"
  | "captured"
  | "voided"
  | "expired"
  | "denied";

export interface ProviderAuthorization {
  providerOrderId: string;
  authorizationId: string;
  status: NormalizedAuthorizationStatus;
  amount: Money;
  /** Last moment this hold may still be captured, ISO. */
  expiresAt: string | null;
  payerId?: string | null;
  paymentSource?: string | null;
  raw: unknown;
}

/**
 * Optional provider capability. A provider that cannot place temporary holds
 * simply does not implement this, and the policy layer falls back to capture.
 */
export interface AuthorizationCapableProvider {
  /** Turn an approved AUTHORIZE order into a temporary hold. */
  authorizeOrder(
    providerOrderId: string,
    idempotencyKey: string,
  ): Promise<ProviderAuthorization>;
  getAuthorization(authorizationId: string): Promise<ProviderAuthorization>;
  /** Capture (all or part of) an existing hold. Money moves here, not before. */
  captureAuthorization(
    authorizationId: string,
    idempotencyKey: string,
    amount?: Money,
  ): Promise<CaptureResult>;
  /** Release a hold without charging. */
  voidAuthorization(authorizationId: string): Promise<void>;
}

export function supportsAuthorization(
  provider: unknown,
): provider is PaymentProvider & AuthorizationCapableProvider {
  const p = provider as Partial<AuthorizationCapableProvider> | null;
  return (
    typeof p?.authorizeOrder === "function" &&
    typeof p?.captureAuthorization === "function" &&
    typeof p?.voidAuthorization === "function"
  );
}


export interface RefundRequest {
  captureId: string;
  /** Omit for a full refund. */
  amount?: Money;
  reason?: string;
  idempotencyKey: string;
}

export interface RefundResult {
  refundId: string;
  status: string;
  amount: Money;
  raw: unknown;
}

// ------------------------------------------------------------ subscriptions

export type BillingInterval = "monthly" | "quarterly" | "annual";

export interface CreateSubscriptionRequest {
  /** Provider plan identifier resolved from monetization_product_plans. */
  planId: string;
  subscriberEmail?: string | null;
  subscriberName?: string | null;
  returnUrl: string;
  cancelUrl: string;
  customId?: string;
  idempotencyKey: string;
}

export interface ProviderSubscription {
  providerSubscriptionId: string;
  status: string;
  approveUrl: string | null;
  nextBillingTime: string | null;
  raw: unknown;
}

// --------------------------------------------------------------- catalog

export interface CatalogProductRequest {
  name: string;
  description?: string | null;
  /** Provider product id when updating an existing catalog entry. */
  providerProductId?: string | null;
  category?: string;
  idempotencyKey: string;
}

export interface CatalogPlanRequest {
  providerProductId: string;
  name: string;
  description?: string | null;
  interval: BillingInterval;
  price: Money;
  trialDays?: number | null;
  taxable?: boolean;
  idempotencyKey: string;
}

// ------------------------------------------------------- invoices & links

export interface PaymentLinkRequest {
  amount: Money;
  reference: string;
  description: string;
  buyerEmail?: string | null;
  /** ISO date the link stops being payable. */
  expiresAt?: string | null;
}

export interface PaymentLinkResult {
  linkId: string;
  url: string;
  status: string;
  raw: unknown;
}

// ------------------------------------------------------------- marketplace

export interface MarketplaceFeeInput {
  grossCents: number;
  transactionType: string;
  /** Platform commission rate as a percentage, e.g. 12.9. */
  commissionPercent: number;
  taxCents?: number;
  refundReserveCents?: number;
}

export interface MarketplaceFeeResult {
  grossCents: number;
  platformFeeCents: number;
  taxCents: number;
  refundReserveCents: number;
  sellerProceedsCents: number;
}

export interface QueuePayoutInput {
  paymentRecordId: string;
  sellerId: string;
  netPayoutCents: number;
  currency: string;
  releaseAt: string | null;
}

// ------------------------------------------------------------- webhooks

export interface WebhookVerification {
  verified: boolean;
  eventId: string | null;
  eventType: string | null;
  reason?: string;
}

// ------------------------------------------------------------- interface

export interface PaymentProvider {
  readonly name: ProviderName;
  readonly environment: ProviderEnvironment;

  /** True only when every credential this provider needs is present. */
  isConfigured(): boolean;

  createOrder(req: CreateOrderRequest): Promise<ProviderOrder>;
  getOrder(providerOrderId: string): Promise<ProviderOrder>;
  captureOrder(providerOrderId: string, idempotencyKey: string): Promise<CaptureResult>;
  cancelOrder(providerOrderId: string, reason?: string): Promise<void>;
  refundOrder(req: RefundRequest): Promise<RefundResult>;

  createSubscription(req: CreateSubscriptionRequest): Promise<ProviderSubscription>;
  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;
  cancelSubscription(providerSubscriptionId: string, reason: string): Promise<void>;
  suspendSubscription(providerSubscriptionId: string, reason: string): Promise<void>;

  createCatalogProduct(req: CatalogProductRequest): Promise<{ providerProductId: string; raw: unknown }>;
  createCatalogPlan(req: CatalogPlanRequest): Promise<{ providerPlanId: string; raw: unknown }>;
  deactivateCatalogPlan(providerPlanId: string): Promise<void>;

  createInvoice(req: PaymentLinkRequest): Promise<PaymentLinkResult>;
  createPaymentLink(req: PaymentLinkRequest): Promise<PaymentLinkResult>;

  verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookVerification>;

  calculateMarketplaceFees(input: MarketplaceFeeInput): MarketplaceFeeResult;
  queueSellerPayout(supabase: unknown, input: QueuePayoutInput): Promise<{ payableId: string | null }>;
}

/**
 * Shared, provider-independent fee math. Providers may override, but the
 * default is the single source of truth so a provider swap cannot silently
 * change what a seller is owed.
 */
export function defaultMarketplaceFees(input: MarketplaceFeeInput): MarketplaceFeeResult {
  const grossCents = Math.max(0, Math.round(input.grossCents));
  const taxCents = Math.max(0, Math.round(input.taxCents ?? 0));
  const refundReserveCents = Math.max(0, Math.round(input.refundReserveCents ?? 0));
  const platformFeeCents = Math.max(
    0,
    Math.round((grossCents - taxCents) * (input.commissionPercent / 100)),
  );
  const sellerProceedsCents = Math.max(
    0,
    grossCents - taxCents - platformFeeCents - refundReserveCents,
  );
  return { grossCents, platformFeeCents, taxCents, refundReserveCents, sellerProceedsCents };
}
