/**
 * Provider-agnostic payment operations for Vendibook.
 *
 * Vendibook processes money through PayPal only. Stripe (and Stripe Connect /
 * Stripe Identity) is permanently retired: no code path in this project may
 * import a Stripe SDK, read a Stripe key, or call the Stripe API.
 *
 * Historical rows created while Stripe was live still exist for accounting.
 * Those records are READ-ONLY: any refund, capture, or release against them
 * resolves to a `manual` outcome that an administrator settles by hand. They
 * never trigger an outbound API call.
 */

import {
  capturePayPalAuthorization,
  getPayPalAuthorization,
  refundPayPalCapture,
  voidPayPalAuthorization,
} from "./paypal.ts";

/** Legacy identifiers minted by the retired processor. */
const LEGACY_ID_PREFIXES = ["pi_", "ch_", "py_", "re_", "cs_", "seti_"];

export function isLegacyPaymentReference(
  paymentReference: string | null | undefined,
  provider?: string | null,
): boolean {
  if (provider && provider.toLowerCase() === "paypal") return false;
  if (!paymentReference) return true;
  return LEGACY_ID_PREFIXES.some((p) => paymentReference.startsWith(p));
}

export const LEGACY_MANUAL_MESSAGE =
  "This payment was taken on our retired processor and can't be adjusted automatically. " +
  "Our team will settle it manually — no further action is needed from you.";

export type PaymentOpResult = {
  success: boolean;
  /** True when the record predates PayPal and needs an administrator. */
  manual?: boolean;
  provider: "paypal" | "legacy";
  id?: string;
  status?: string;
  amountCents?: number;
  error?: string;
};

function amountCentsFrom(node: any): number | undefined {
  const value = node?.amount?.value ?? node?.seller_receivable_breakdown?.gross_amount?.value;
  if (value === undefined) return undefined;
  const cents = Math.round(Number(value) * 100);
  return Number.isFinite(cents) ? cents : undefined;
}

/**
 * Refunds a captured PayPal payment.
 *
 * @param paymentReference PayPal capture id (stored in `payment_intent_id`).
 * @param amountCents      Omit for a full refund.
 */
export async function refundPayment(opts: {
  paymentReference: string | null | undefined;
  provider?: string | null;
  amountCents?: number;
  currency?: string;
  reason?: string;
  idempotencyKey: string;
}): Promise<PaymentOpResult> {
  if (isLegacyPaymentReference(opts.paymentReference, opts.provider)) {
    return {
      success: false,
      manual: true,
      provider: "legacy",
      error: LEGACY_MANUAL_MESSAGE,
    };
  }

  try {
    const refund = await refundPayPalCapture({
      captureId: opts.paymentReference as string,
      amountCents: opts.amountCents,
      currency: opts.currency,
      reason: opts.reason,
      idempotencyKey: opts.idempotencyKey,
    });
    return {
      success: true,
      provider: "paypal",
      id: refund?.id,
      status: refund?.status,
      amountCents: amountCentsFrom(refund) ?? opts.amountCents,
    };
  } catch (err) {
    return {
      success: false,
      provider: "paypal",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Captures a held PayPal authorization (the deposit/hold flow). */
export async function captureHeldPayment(opts: {
  authorizationId: string | null | undefined;
  provider?: string | null;
  amountCents: number;
  currency?: string;
  invoiceId?: string;
  idempotencyKey: string;
}): Promise<PaymentOpResult> {
  if (isLegacyPaymentReference(opts.authorizationId, opts.provider)) {
    return {
      success: false,
      manual: true,
      provider: "legacy",
      error: LEGACY_MANUAL_MESSAGE,
    };
  }

  try {
    const capture = await capturePayPalAuthorization({
      authorizationId: opts.authorizationId as string,
      amountCents: opts.amountCents,
      currency: opts.currency,
      invoiceId: opts.invoiceId,
      idempotencyKey: opts.idempotencyKey,
    });
    return {
      success: true,
      provider: "paypal",
      id: capture?.id,
      status: capture?.status,
      amountCents: amountCentsFrom(capture) ?? opts.amountCents,
    };
  } catch (err) {
    return {
      success: false,
      provider: "paypal",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Releases a held PayPal authorization without charging the payer. */
export async function releaseHeldPayment(opts: {
  authorizationId: string | null | undefined;
  provider?: string | null;
  idempotencyKey: string;
}): Promise<PaymentOpResult> {
  if (isLegacyPaymentReference(opts.authorizationId, opts.provider)) {
    return {
      success: false,
      manual: true,
      provider: "legacy",
      error: LEGACY_MANUAL_MESSAGE,
    };
  }

  try {
    const existing = await getPayPalAuthorization(opts.authorizationId as string)
      .catch(() => null);
    if (existing && ["VOIDED", "CAPTURED", "EXPIRED"].includes(String(existing.status))) {
      return {
        success: true,
        provider: "paypal",
        id: opts.authorizationId as string,
        status: String(existing.status),
      };
    }

    await voidPayPalAuthorization(opts.authorizationId as string, opts.idempotencyKey);
    return {
      success: true,
      provider: "paypal",
      id: opts.authorizationId as string,
      status: "VOIDED",
    };
  } catch (err) {
    return {
      success: false,
      provider: "paypal",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
