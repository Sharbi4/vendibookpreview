/**
 * Turns a Vendibook quote into the item-level detail PayPal requires on every
 * order.
 *
 * Why this exists: PayPal only supports item-level disputes when
 * `purchase_units[].items` is present, and the Tracking API rejects any SKU
 * that was not on the original order. So every order gets real lines with
 * stable SKUs, and those SKUs are persisted on the payment record.
 *
 * Arithmetic rule: item_total + tax_total + shipping - discount must equal the
 * charged total. Delivery and freight lines are classified as shipping, credits
 * as discount, everything else as an item.
 */
// deno-lint-ignore-file no-explicit-any

export interface PayPalItemLine {
  name: string;
  unitAmountCents: number;
  quantity: number;
  description: string;
  sku: string;
  category: "DIGITAL_GOODS" | "PHYSICAL_GOODS";
}

export interface OrderDetailResult {
  items: PayPalItemLine[];
  itemTotalCents: number;
  shippingCents: number;
  discountCents: number;
  taxCents: number;
}

const SHIPPING_LABEL = /freight|delivery|shipping/i;

/** Slug used as the SKU body so a SKU is readable in PayPal's UI. */
function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) ||
    "item";
}

export function buildOrderDetail(
  quote: {
    reference: string;
    description: string;
    breakdown: Array<{ label: string; amountCents: number; kind?: string }>;
    taxCents: number;
    grossCents: number;
  },
  opts: { physical?: boolean } = {},
): OrderDetailResult {
  const category = opts.physical ? "PHYSICAL_GOODS" as const : "DIGITAL_GOODS" as const;
  let shippingCents = 0;
  let discountCents = 0;
  const items: PayPalItemLine[] = [];

  for (const line of quote.breakdown ?? []) {
    const amount = Math.round(line.amountCents);
    if (!amount) continue;
    if (line.kind === "tax") continue;
    if (amount < 0 || line.kind === "credit") {
      discountCents += Math.abs(amount);
      continue;
    }
    if (SHIPPING_LABEL.test(line.label)) {
      shippingCents += amount;
      continue;
    }
    items.push({
      name: line.label.slice(0, 127),
      unitAmountCents: amount,
      quantity: 1,
      description: line.label.slice(0, 127),
      sku: `${quote.reference}-${slug(line.label)}`.slice(0, 127),
      category,
    });
  }

  // A quote with no positive non-shipping line still needs one item, or PayPal
  // has nothing to dispute at item level.
  const taxCents = Math.max(0, Math.round(quote.taxCents ?? 0));
  const derivedItemTotal = Math.max(
    0,
    quote.grossCents - taxCents - shippingCents + discountCents,
  );
  if (!items.length) {
    items.push({
      name: quote.description.slice(0, 127),
      unitAmountCents: derivedItemTotal,
      quantity: 1,
      description: quote.description.slice(0, 127),
      sku: `${quote.reference}-1`.slice(0, 127),
      category,
    });
  }

  let itemTotalCents = items.reduce((sum, i) => sum + i.unitAmountCents * i.quantity, 0);

  // Rounding in a quote line (or a fee folded into the total) can leave a small
  // difference. Absorb it on the last item so the order always reconciles
  // rather than failing at PayPal in front of the buyer.
  const drift = derivedItemTotal - itemTotalCents;
  if (drift !== 0) {
    const last = items[items.length - 1];
    last.unitAmountCents = Math.max(0, last.unitAmountCents + drift);
    itemTotalCents = items.reduce((sum, i) => sum + i.unitAmountCents * i.quantity, 0);
  }

  return { items, itemTotalCents, shippingCents, discountCents, taxCents };
}

/** Parses "123 Main St, Sioux Falls, SD 57104" into PayPal's address shape. */
export function parseShippingAddress(
  raw: string | null | undefined,
  fallback: { city?: string | null; state?: string | null } = {},
): {
  addressLine1: string;
  adminArea2: string;
  adminArea1: string;
  postalCode: string;
  countryCode: string;
} | null {
  if (!raw || !raw.trim()) return null;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const last = parts[parts.length - 1] ?? "";
  const stateZip = last.match(/([A-Za-z]{2})\s+(\d{5})(?:-\d{4})?/);
  const postalCode = stateZip?.[2] ?? (raw.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? "");
  const adminArea1 = (stateZip?.[1] ?? fallback.state ?? "").toUpperCase();
  const adminArea2 = parts.length >= 3 ? parts[parts.length - 2] : (fallback.city ?? "");
  const addressLine1 = parts[0];
  if (!addressLine1 || !adminArea1 || !postalCode || !adminArea2) return null;
  return {
    addressLine1: addressLine1.slice(0, 300),
    adminArea2: adminArea2.slice(0, 120),
    adminArea1: adminArea1.slice(0, 2),
    postalCode: postalCode.slice(0, 60),
    countryCode: "US",
  };
}

/**
 * Soft descriptor shown on the buyer's statement. PayPal allows 22 characters;
 * we lead with VB* and then the seller's business name so a buyer recognises
 * the charge instead of opening a needless dispute.
 */
export function buildSoftDescriptor(sellerName?: string | null): string {
  const clean = (sellerName ?? "").replace(/[^A-Za-z0-9 ]/g, "").trim();
  if (!clean) return "VENDIBOOK";
  return `VB*${clean}`.slice(0, 22).trim();
}
