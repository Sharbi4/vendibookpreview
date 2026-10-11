/**
 * Seller delivery pricing, shared by the checkout UI and the server so the
 * amount a buyer sees and the amount charged use the same rule.
 * - flat: one charge per delivery
 * - per_mile: rate x one-way distance to the buyer's address
 */

export type DeliveryFeeType = "flat" | "per_mile";

export function normalizeDeliveryFeeType(value: unknown): DeliveryFeeType {
  return value === "per_mile" ? "per_mile" : "flat";
}

export function computeDeliveryFee(
  rate: number | null | undefined,
  feeType: unknown,
  distanceMiles?: number | null,
): number {
  const base = Number(rate) || 0;
  if (base <= 0) return 0;
  if (normalizeDeliveryFeeType(feeType) !== "per_mile") return base;
  if (!distanceMiles || distanceMiles <= 0) return 0;
  return Math.round(base * distanceMiles * 100) / 100;
}
