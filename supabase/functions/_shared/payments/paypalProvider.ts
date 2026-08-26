/**
 * PayPal implementation of the PaymentProvider contract.
 *
 * This is the ONLY place PayPal REST helpers are wired into the generic
 * payment interface. Callers depend on `PaymentProvider`, never on this file.
 */
import {
  authorizePayPalOrder,
  cancelPayPalSubscription,
  capturePayPalAuthorization,
  capturePayPalOrder,
  centsFromPayPalAmount,
  createPayPalOrder,
  getPayPalAuthorization,
  getPayPalOrder,
  getPayPalSubscription,
  paypalConfigStatus,
  paypalEnvironment,
  paypalRequest,
  PayPalError,
  refundPayPalCapture,
  suspendPayPalSubscription,
  verifyPayPalWebhook,
  voidPayPalAuthorization,
} from "../paypal.ts";
import {
  activateBillingPlan,
  createBillingPlan,
  createCatalogProduct as ppCreateCatalogProduct,
  createInvoice as ppCreateInvoice,
  createSubscription as ppCreateSubscription,
  deactivateBillingPlan,
} from "../paypalCatalog.ts";
import { ensureSellerPayable } from "../paypalAccounting.ts";
import {
  type CaptureResult,
  type CatalogPlanRequest,
  type CatalogProductRequest,
  type CreateOrderRequest,
  type CreateSubscriptionRequest,
  defaultMarketplaceFees,
  type MarketplaceFeeInput,
  type AuthorizationCapableProvider,
  type NormalizedAuthorizationStatus,
  type NormalizedPaymentStatus,
  type PaymentLinkRequest,
  type PaymentLinkResult,
  type PaymentProvider,
  PaymentProviderError,
  type ProviderAuthorization,
  type ProviderOrder,
  type ProviderSubscription,
  type QueuePayoutInput,
  type RefundRequest,
  type RefundResult,
  UnsupportedOperationError,
  type WebhookVerification,
} from "./types.ts";

function normalizeStatus(status: string | undefined): NormalizedPaymentStatus {
  switch ((status ?? "").toUpperCase()) {
    case "CREATED":
      return "created";
    case "SAVED":
    case "APPROVED":
    case "PAYER_ACTION_REQUIRED":
      return "approved";
    case "COMPLETED":
      return "completed";
    case "PENDING":
      return "pending";
    case "DECLINED":
      return "declined";
    case "FAILED":
      return "failed";
    case "VOIDED":
      return "cancelled";
    case "REFUNDED":
      return "refunded";
    case "PARTIALLY_REFUNDED":
      return "partially_refunded";
    case "REVERSED":
      return "reversed";
    default:
      return "pending";
  }
}

function wrap(err: unknown): never {
  if (err instanceof PayPalError) {
    throw new PaymentProviderError({
      provider: "paypal",
      message: err.message,
      status: err.status,
      code: err.issue ?? "paypal_error",
      debugId: (err as { debugId?: string }).debugId,
    });
  }
  throw err;
}

/** PayPal authorization states → normalized hold lifecycle. */
function normalizeAuthorizationStatus(
  status: string | undefined,
): NormalizedAuthorizationStatus {
  switch ((status ?? "").toUpperCase()) {
    case "CREATED":
      return "created";
    case "PENDING":
      return "pending";
    case "PARTIALLY_CAPTURED":
      return "partially_captured";
    case "CAPTURED":
      return "captured";
    case "VOIDED":
      return "voided";
    case "EXPIRED":
      return "expired";
    case "DENIED":
      return "denied";
    default:
      return "pending";
  }
}

export class PayPalProvider implements PaymentProvider, AuthorizationCapableProvider {
  readonly name = "paypal" as const;

  get environment() {
    return paypalEnvironment();
  }

  isConfigured(): boolean {
    // paypalConfigStatus() reports snake_case flags — read those directly.
    // (An older camelCase lookup here silently evaluated to false and made
    // every subscription attempt return "provider_unavailable".)
    const status = paypalConfigStatus();
    return Boolean(status.client_id_configured && status.client_secret_configured);
  }

  // ------------------------------------------------------------- orders

  async createOrder(req: CreateOrderRequest): Promise<ProviderOrder> {
    try {
      const order = await createPayPalOrder({
        amountCents: req.amount.amountCents,
        currency: (req.amount.currency || "USD").toUpperCase(),
        reference: req.reference,
        description: req.description,
        breakdown: req.breakdown,
        softDescriptor: req.softDescriptor,
        idempotencyKey: req.idempotencyKey ?? `order:${req.reference}`,
        intent: req.intent,
      });
      return {
        providerOrderId: order.id,
        status: normalizeStatus(order.status),
        reference: req.reference,
        amount: req.amount,
        raw: order,
      };
    } catch (err) {
      wrap(err);
    }
  }

  async getOrder(providerOrderId: string): Promise<ProviderOrder> {
    try {
      const order = await getPayPalOrder(providerOrderId);
      const unit = order?.purchase_units?.[0];
      return {
        providerOrderId: order.id,
        status: normalizeStatus(order.status),
        reference: unit?.invoice_id ?? unit?.reference_id ?? "",
        amount: {
          amountCents: centsFromPayPalAmount(unit?.amount?.value),
          currency: unit?.amount?.currency_code ?? "USD",
        },
        raw: order,
      };
    } catch (err) {
      wrap(err);
    }
  }

  async captureOrder(providerOrderId: string, idempotencyKey: string): Promise<CaptureResult> {
    try {
      const order = await capturePayPalOrder(providerOrderId, idempotencyKey);
      const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
      if (!capture) {
        throw new PaymentProviderError({
          provider: "paypal",
          message: "PayPal returned no capture record.",
          code: "capture_unverified",
          status: 502,
        });
      }
      return {
        providerOrderId,
        captureId: capture.id,
        status: normalizeStatus(capture.status),
        amount: {
          amountCents: centsFromPayPalAmount(capture.amount?.value),
          currency: capture.amount?.currency_code ?? "USD",
        },
        payerId: order?.payer?.payer_id ?? order?.payment_source?.paypal?.account_id ?? null,
        paymentSource: order?.payment_source ? Object.keys(order.payment_source)[0] : null,
        raw: order,
      };
    } catch (err) {
      wrap(err);
    }
  }

  // ----------------------------------------------- authorizations (holds)

  /**
   * Converts an approved AUTHORIZE order into a temporary hold. No money
   * moves here — the payer's funds are reserved by PayPal until we capture
   * or void. Never described to buyers as escrow.
   */
  async authorizeOrder(
    providerOrderId: string,
    idempotencyKey: string,
  ): Promise<ProviderAuthorization> {
    try {
      const order = await authorizePayPalOrder(providerOrderId, idempotencyKey);
      const auth = order?.purchase_units?.[0]?.payments?.authorizations?.[0];
      if (!auth?.id) {
        throw new PaymentProviderError({
          provider: "paypal",
          message: "PayPal did not return an authorization. Nothing was charged.",
          code: "authorization_unverified",
          status: 502,
        });
      }
      return {
        providerOrderId,
        authorizationId: auth.id,
        status: normalizeAuthorizationStatus(auth.status),
        amount: {
          amountCents: centsFromPayPalAmount(auth.amount?.value),
          currency: auth.amount?.currency_code ?? "USD",
        },
        expiresAt: auth.expiration_time ?? null,
        payerId: order?.payer?.payer_id ?? order?.payment_source?.paypal?.account_id ?? null,
        paymentSource: order?.payment_source ? Object.keys(order.payment_source)[0] : null,
        raw: order,
      };
    } catch (err) {
      wrap(err);
    }
  }

  async getAuthorization(authorizationId: string): Promise<ProviderAuthorization> {
    try {
      const auth = await getPayPalAuthorization(authorizationId);
      return {
        providerOrderId: auth?.supplementary_data?.related_ids?.order_id ?? "",
        authorizationId: auth.id,
        status: normalizeAuthorizationStatus(auth.status),
        amount: {
          amountCents: centsFromPayPalAmount(auth.amount?.value),
          currency: auth.amount?.currency_code ?? "USD",
        },
        expiresAt: auth.expiration_time ?? null,
        raw: auth,
      };
    } catch (err) {
      wrap(err);
    }
  }

  async captureAuthorization(
    authorizationId: string,
    idempotencyKey: string,
    amount?: { amountCents: number; currency?: string },
    invoiceId?: string,
  ): Promise<CaptureResult> {
    try {
      const current = amount ?? (await this.getAuthorization(authorizationId)).amount;
      const capture = await capturePayPalAuthorization({
        authorizationId,
        amountCents: current.amountCents,
        currency: (current.currency || "USD").toUpperCase(),
        invoiceId,
        idempotencyKey,
      });
      if (!capture?.id) {
        throw new PaymentProviderError({
          provider: "paypal",
          message: "PayPal returned no capture record for this hold.",
          code: "capture_unverified",
          status: 502,
        });
      }
      return {
        providerOrderId: capture?.supplementary_data?.related_ids?.order_id ?? "",
        captureId: capture.id,
        status: normalizeStatus(capture.status),
        amount: {
          amountCents: centsFromPayPalAmount(capture.amount?.value),
          currency: capture.amount?.currency_code ?? "USD",
        },
        raw: capture,
      };
    } catch (err) {
      wrap(err);
    }
  }

  /** Releases a hold. Safe to call twice — an already-voided hold resolves. */
  async voidAuthorization(authorizationId: string): Promise<void> {
    try {
      await voidPayPalAuthorization(authorizationId, `void:${authorizationId}`);
    } catch (err) {
      if (err instanceof PayPalError && (err.status === 404 || err.status === 422)) return;
      wrap(err);
    }
  }

  async cancelOrder(_providerOrderId: string, _reason?: string): Promise<void> {
    // PayPal orders expire on their own; there is no void endpoint for an
    // uncaptured Orders v2 order. Intentionally a no-op.
  }


  async refundOrder(req: RefundRequest): Promise<RefundResult> {
    try {
      const refund = await refundPayPalCapture({
        captureId: req.captureId,
        amountCents: req.amount?.amountCents,
        currency: (req.amount?.currency || "USD").toUpperCase(),
        reason: req.reason,
        idempotencyKey: req.idempotencyKey,
      });
      return {
        refundId: refund.id,
        status: refund.status,
        amount: {
          amountCents: centsFromPayPalAmount(refund?.amount?.value),
          currency: refund?.amount?.currency_code ?? req.amount?.currency ?? "USD",
        },
        raw: refund,
      };
    } catch (err) {
      wrap(err);
    }
  }

  // -------------------------------------------------------- subscriptions

  async createSubscription(req: CreateSubscriptionRequest): Promise<ProviderSubscription> {
    try {
      const sub = await ppCreateSubscription({
        planId: req.planId,
        subscriberEmail: req.subscriberEmail,
        subscriberName: req.subscriberName,
        returnUrl: req.returnUrl,
        cancelUrl: req.cancelUrl,
        customId: req.customId,
        idempotencyKey: req.idempotencyKey,
      });
      return {
        providerSubscriptionId: sub.id,
        status: String(sub.status ?? "APPROVAL_PENDING").toLowerCase(),
        approveUrl: sub?.links?.find((l: any) => l.rel === "approve")?.href ?? null,
        nextBillingTime: sub?.billing_info?.next_billing_time ?? null,
        raw: sub,
      };
    } catch (err) {
      wrap(err);
    }
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    try {
      const sub = await getPayPalSubscription(providerSubscriptionId);
      return {
        providerSubscriptionId: sub.id,
        status: String(sub.status ?? "").toLowerCase(),
        approveUrl: sub?.links?.find((l: any) => l.rel === "approve")?.href ?? null,
        nextBillingTime: sub?.billing_info?.next_billing_time ?? null,
        raw: sub,
      };
    } catch (err) {
      wrap(err);
    }
  }

  async cancelSubscription(providerSubscriptionId: string, reason: string): Promise<void> {
    try {
      await cancelPayPalSubscription(providerSubscriptionId, reason);
    } catch (err) {
      wrap(err);
    }
  }

  async suspendSubscription(providerSubscriptionId: string, reason: string): Promise<void> {
    try {
      await suspendPayPalSubscription(providerSubscriptionId, reason);
    } catch (err) {
      wrap(err);
    }
  }

  // -------------------------------------------------------------- catalog

  async createCatalogProduct(req: CatalogProductRequest) {
    try {
      const product = await ppCreateCatalogProduct({
        name: req.name,
        description: req.description,
        category: req.category,
        idempotencyKey: req.idempotencyKey,
      });
      return { providerProductId: product.id as string, raw: product };
    } catch (err) {
      wrap(err);
    }
  }

  async createCatalogPlan(req: CatalogPlanRequest) {
    try {
      const plan = await createBillingPlan({
        productId: req.providerProductId,
        name: req.name,
        description: req.description,
        interval: req.interval,
        priceCents: req.price.amountCents,
        currency: (req.price.currency || "USD").toUpperCase(),
        trialDays: req.trialDays,
        taxable: req.taxable,
        idempotencyKey: req.idempotencyKey,
      });
      return { providerPlanId: plan.id as string, raw: plan };
    } catch (err) {
      wrap(err);
    }
  }

  async deactivateCatalogPlan(providerPlanId: string): Promise<void> {
    try {
      await deactivateBillingPlan(providerPlanId);
    } catch (err) {
      wrap(err);
    }
  }

  async activateCatalogPlan(providerPlanId: string): Promise<void> {
    try {
      await activateBillingPlan(providerPlanId);
    } catch (err) {
      wrap(err);
    }
  }

  // ----------------------------------------------------- invoices & links

  async createInvoice(req: PaymentLinkRequest): Promise<PaymentLinkResult> {
    try {
      const inv = await ppCreateInvoice({
        amountCents: req.amount.amountCents,
        currency: (req.amount.currency || "USD").toUpperCase(),
        reference: req.reference,
        description: req.description,
        buyerEmail: req.buyerEmail,
        dueDate: req.expiresAt,
      });
      if (!inv.url) {
        throw new PaymentProviderError({
          provider: "paypal",
          message: "PayPal did not return a payable invoice link.",
          code: "invoice_link_missing",
        });
      }
      return { linkId: inv.invoiceId, url: inv.url, status: inv.status, raw: inv.raw };
    } catch (err) {
      wrap(err);
    }
  }

  /** PayPal has no standalone payment-link product; invoices fill that role. */
  createPaymentLink(req: PaymentLinkRequest): Promise<PaymentLinkResult> {
    return this.createInvoice(req);
  }

  // ------------------------------------------------------------- webhooks

  async verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookVerification> {
    let event: Record<string, unknown> = {};
    try {
      event = JSON.parse(rawBody);
    } catch {
      return { verified: false, eventId: null, eventType: null, reason: "invalid_json" };
    }
    const verified = await verifyPayPalWebhook(headers, rawBody);
    return {
      verified: Boolean(verified),
      eventId: (event.id as string) ?? null,
      eventType: (event.event_type as string) ?? null,
      ...(verified ? {} : { reason: "signature_invalid" }),
    };
  }

  // ---------------------------------------------------------- marketplace

  calculateMarketplaceFees(input: MarketplaceFeeInput) {
    return defaultMarketplaceFees(input);
  }

  async queueSellerPayout(supabase: unknown, input: QueuePayoutInput) {
    const payable = await ensureSellerPayable(
      supabase as any,
      {
        id: input.paymentRecordId,
        seller_id: input.sellerId,
        seller_proceeds_cents: input.netPayoutCents,
        currency: (input.currency || "USD").toUpperCase(),
      } as any,
      input.releaseAt,
    );
    return { payableId: (payable as { id?: string } | null)?.id ?? null };
  }

  /** Reserved for the Partner Marketplace onboarding phase. */
  onboardSeller(): never {
    throw new UnsupportedOperationError("paypal", "seller onboarding");
  }

  /** Raw escape hatch for endpoints not yet modelled here. */
  raw<T = unknown>(path: string, init?: Parameters<typeof paypalRequest>[1]) {
    return paypalRequest<T>(path, init);
  }
}
