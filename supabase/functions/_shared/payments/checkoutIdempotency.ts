/**
 * Deterministic idempotency keys for checkout operations.
 *
 * Rules (see incident: "Keys for idempotent requests can only be used with the
 * same parameters they were first used with"):
 *  - The key is derived ONLY from the immutable parameters that define the
 *    logical checkout operation (user, product, interval, price, currency,
 *    quantity, listing, promotion, return URLs, mode).
 *  - Identical parameters => identical key => a retry safely reuses the same
 *    provider operation.
 *  - ANY parameter change (plan, interval, price, quantity, promo, customer)
 *    => a different key => a brand new provider operation.
 *  - No time buckets, no account-scoped or plan-agnostic keys. A time bucket
 *    is what caused the incident: the same key was replayed with a different
 *    price/URL payload after a promo or member discount changed.
 */

export interface CheckoutOperationParams {
  userId: string;
  productId: string;
  productSlug: string;
  mode: "payment" | "subscription";
  amountCents: number;
  currency: string;
  quantity?: number;
  listingId?: string | null;
  discountCodeId?: string | null;
  discountAppliedCents?: number;
  customerRef?: string | null;
  priceRef?: string | null;
  billingInterval?: string | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
}

/** Stable, order-independent canonical string of the operation parameters. */
export function canonicalizeCheckoutParams(p: CheckoutOperationParams): string {
  const entries: Array<[string, string]> = [
    ["user", p.userId],
    ["product", p.productId],
    ["slug", p.productSlug],
    ["mode", p.mode],
    ["amount", String(p.amountCents)],
    ["currency", (p.currency || "usd").toLowerCase()],
    ["qty", String(p.quantity ?? 1)],
    ["listing", p.listingId ?? ""],
    ["discount", p.discountCodeId ?? ""],
    ["discount_cents", String(p.discountAppliedCents ?? 0)],
    ["customer", p.customerRef ?? ""],
    ["price_ref", p.priceRef ?? ""],
    ["interval", p.billingInterval ?? ""],
    ["success", p.successUrl ?? ""],
    ["cancel", p.cancelUrl ?? ""],
  ];
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return entries.map(([k, v]) => `${k}=${v}`).join("&");
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * `mon-<slug>-<sha256(params)>` — readable prefix for support, hash for
 * uniqueness. Max 64 chars so it fits provider key limits (Stripe: 255).
 */
export async function buildCheckoutIdempotencyKey(
  p: CheckoutOperationParams,
): Promise<string> {
  const hash = await sha256Hex(canonicalizeCheckoutParams(p));
  const slug = p.productSlug.replace(/[^a-z0-9_-]/gi, "").slice(0, 24);
  return `mon-${slug}-${hash.slice(0, 32)}`;
}

/** Short correlation id used to tie a client-visible error to server logs. */
export function newCorrelationId(): string {
  try {
    return globalThis.crypto.randomUUID().slice(0, 8);
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}
