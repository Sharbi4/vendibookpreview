export type DeliveryFeeType = 'flat' | 'per_mile';

export function normalizeDeliveryFeeType(value: unknown): DeliveryFeeType {
  return value === 'per_mile' ? 'per_mile' : 'flat';
}

/**
 * Seller-set delivery pricing.
 * - flat: one charge per delivery
 * - per_mile: rate x one-way distance to the buyer's address
 */
export function computeDeliveryFee(
  rate: number | null | undefined,
  feeType: unknown,
  distanceMiles?: number | null,
): number {
  const base = Number(rate) || 0;
  if (base <= 0) return 0;
  if (normalizeDeliveryFeeType(feeType) !== 'per_mile') return base;
  if (!distanceMiles || distanceMiles <= 0) return 0;
  return Math.round(base * distanceMiles * 100) / 100;
}

export function deliveryRateLabel(
  rate: number | null | undefined,
  feeType: unknown,
): string | null {
  const base = Number(rate) || 0;
  if (base <= 0) return null;
  return normalizeDeliveryFeeType(feeType) === 'per_mile'
    ? `$${base.toLocaleString()}/mile`
    : `$${base.toLocaleString()} per delivery`;
}

/** Straight-line distance underestimates real driving distance. */
export const ROAD_DISTANCE_FACTOR = 1.2;
/** ZIP centroids + routing variance, applied around the road-distance estimate. */
export const DISTANCE_VARIANCE = 0.12;

export type DeliveryEstimate = {
  /** straight-line miles between origin and destination */
  straightLineMiles: number;
  /** expected driving miles */
  roadMiles: number;
  minMiles: number;
  maxMiles: number;
  /** fee at the expected driving distance */
  fee: number;
  minFee: number;
  maxFee: number;
  isRange: boolean;
};

/**
 * Range-based delivery estimate from the seller's configured rate.
 * Flat rates are exact; per-mile rates produce a low/high band because
 * ZIP-centroid distance is approximate and roads aren't straight lines.
 */
export function estimateDelivery(
  rate: number | null | undefined,
  feeType: unknown,
  straightLineMiles: number,
): DeliveryEstimate {
  const miles = Math.max(0, straightLineMiles);
  const roadMiles = Math.round(miles * ROAD_DISTANCE_FACTOR);
  const minMiles = Math.max(1, Math.round(roadMiles * (1 - DISTANCE_VARIANCE)));
  const maxMiles = Math.max(minMiles, Math.round(roadMiles * (1 + DISTANCE_VARIANCE)));
  const perMile = normalizeDeliveryFeeType(feeType) === 'per_mile';

  const fee = computeDeliveryFee(rate, feeType, roadMiles);
  const minFee = perMile ? computeDeliveryFee(rate, feeType, minMiles) : fee;
  const maxFee = perMile ? computeDeliveryFee(rate, feeType, maxMiles) : fee;

  return {
    straightLineMiles: Math.round(miles),
    roadMiles,
    minMiles,
    maxMiles,
    fee,
    minFee,
    maxFee,
    isRange: perMile && maxFee > minFee,
  };
}

export function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}
