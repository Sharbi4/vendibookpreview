/**
 * Dwolla placeholder.
 *
 * Registered so the abstraction is provably multi-provider and so the future
 * Dwolla + Plaid ACH payout migration is a matter of filling these methods in
 * — not rewriting call sites. Every method fails loudly rather than silently
 * doing nothing with money.
 */
import {
  type CaptureResult,
  type CatalogPlanRequest,
  type CatalogProductRequest,
  type CreateOrderRequest,
  type CreateSubscriptionRequest,
  defaultMarketplaceFees,
  type MarketplaceFeeInput,
  type PaymentLinkRequest,
  type PaymentLinkResult,
  type PaymentProvider,
  type ProviderEnvironment,
  type ProviderOrder,
  type ProviderSubscription,
  type QueuePayoutInput,
  type RefundRequest,
  type RefundResult,
  UnsupportedOperationError,
  type WebhookVerification,
} from "./types.ts";

const nope = (op: string): never => {
  throw new UnsupportedOperationError("dwolla", op);
};

export class DwollaProvider implements PaymentProvider {
  readonly name = "dwolla" as const;

  get environment(): ProviderEnvironment {
    return Deno.env.get("DWOLLA_ENVIRONMENT") === "live" ? "live" : "sandbox";
  }

  isConfigured(): boolean {
    return Boolean(Deno.env.get("DWOLLA_KEY") && Deno.env.get("DWOLLA_SECRET"));
  }

  createOrder(_req: CreateOrderRequest): Promise<ProviderOrder> {
    return nope("card orders");
  }
  getOrder(_id: string): Promise<ProviderOrder> {
    return nope("order lookup");
  }
  captureOrder(_id: string, _key: string): Promise<CaptureResult> {
    return nope("order capture");
  }
  cancelOrder(_id: string): Promise<void> {
    return nope("order cancellation");
  }
  refundOrder(_req: RefundRequest): Promise<RefundResult> {
    return nope("refunds");
  }
  createSubscription(_req: CreateSubscriptionRequest): Promise<ProviderSubscription> {
    return nope("subscriptions");
  }
  getSubscription(_id: string): Promise<ProviderSubscription> {
    return nope("subscriptions");
  }
  cancelSubscription(_id: string, _reason: string): Promise<void> {
    return nope("subscriptions");
  }
  suspendSubscription(_id: string, _reason: string): Promise<void> {
    return nope("subscriptions");
  }
  createCatalogProduct(_req: CatalogProductRequest): Promise<{ providerProductId: string; raw: unknown }> {
    return nope("catalog products");
  }
  createCatalogPlan(_req: CatalogPlanRequest): Promise<{ providerPlanId: string; raw: unknown }> {
    return nope("billing plans");
  }
  deactivateCatalogPlan(_id: string): Promise<void> {
    return nope("billing plans");
  }
  createInvoice(_req: PaymentLinkRequest): Promise<PaymentLinkResult> {
    return nope("invoices");
  }
  createPaymentLink(_req: PaymentLinkRequest): Promise<PaymentLinkResult> {
    return nope("payment links");
  }
  verifyWebhook(_headers: Headers, _rawBody: string): Promise<WebhookVerification> {
    return nope("webhooks");
  }

  /** Fee math is provider-independent and safe to answer today. */
  calculateMarketplaceFees(input: MarketplaceFeeInput) {
    return defaultMarketplaceFees(input);
  }

  queueSellerPayout(_supabase: unknown, _input: QueuePayoutInput): Promise<{ payableId: string | null }> {
    return nope("ACH payouts");
  }
}
