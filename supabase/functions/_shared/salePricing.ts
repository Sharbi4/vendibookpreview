/**
 * Server-side pricing of a sale's fulfillment (seller delivery or Vendibook
 * Freight). Mirrors the checkout's rules (SaleCheckout: available options,
 * straight-line distance to 0.1 mile, delivery radius, freight origin) so the
 * charged amount matches what the buyer was shown, but nothing here trusts a
 * figure sent by the browser.
 */
import { computeDeliveryFee, normalizeDeliveryFeeType } from "./deliveryFee.ts";
import { freightQuote } from "./freightRates.ts";
import { type LatLng, coerceCoords, geocodeAddress, haversineMiles } from "./geo.ts";

export interface FulfillmentListing {
  fulfillment_type?: string | null;
  delivery_fee?: number | string | null;
  delivery_fee_type?: string | null;
  delivery_radius_miles?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  pickup_location_text?: string | null;
  vendibook_freight_enabled?: boolean | null;
}

export type FulfillmentPrice =
  | { deliveryFee: number; freightCost: number }
  | { error: string; code: string };

type Geocode = (address: string) => Promise<LatLng | null>;

/** Options the checkout offers for this listing. */
export function allowedFulfillment(listing: FulfillmentListing): string[] {
  const options: string[] = [];
  if (listing.vendibook_freight_enabled) options.push("vendibook_freight");
  const type = listing.fulfillment_type;
  if (type === "both") options.push("pickup", "delivery");
  else if (type === "delivery") options.push("delivery");
  else options.push("pickup");
  return options;
}

export async function priceFulfillment(
  listing: FulfillmentListing,
  fulfillment: string,
  deliveryAddress: unknown,
  geocode: Geocode = geocodeAddress,
): Promise<FulfillmentPrice> {
  if (!allowedFulfillment(listing).includes(fulfillment)) {
    return { code: "fulfillment_unavailable", error: "That delivery option isn't available for this listing." };
  }
  if (fulfillment === "pickup") return { deliveryFee: 0, freightCost: 0 };

  const address = typeof deliveryAddress === "string" ? deliveryAddress.trim() : "";
  if (address.length < 5) {
    return { code: "delivery_address_required", error: "Enter the delivery address to get the price." };
  }

  if (fulfillment === "delivery") {
    const rate = Number(listing.delivery_fee) || 0;
    if (normalizeDeliveryFeeType(listing.delivery_fee_type) !== "per_mile") {
      return { deliveryFee: computeDeliveryFee(rate, "flat"), freightCost: 0 };
    }
    const origin = coerceCoords({ lat: listing.latitude, lng: listing.longitude });
    const dest = await geocode(address);
    if (!origin || !dest) {
      return { code: "delivery_address_unresolved", error: "We couldn't locate that delivery address. Check it and try again." };
    }
    const miles = Math.round(haversineMiles(origin, dest) * 10) / 10;
    const radius = Number(listing.delivery_radius_miles) || 0;
    if (radius > 0 && miles > radius) {
      return { code: "outside_delivery_area", error: "That address is outside the seller's delivery area." };
    }
    return { deliveryFee: computeDeliveryFee(rate, "per_mile", miles), freightCost: 0 };
  }

  // Vendibook Freight: same origin the checkout estimate uses.
  const originText = listing.address ?? listing.pickup_location_text ??
    (listing.latitude != null && listing.longitude != null ? `${listing.latitude},${listing.longitude}` : null);
  const origin = originText ? await geocode(originText) : null;
  const dest = await geocode(address);
  if (!origin || !dest) {
    return { code: "freight_unavailable", error: "We couldn't price freight to that address. Check it and try again." };
  }
  return { deliveryFee: 0, freightCost: freightQuote(haversineMiles(origin, dest)).total_cost };
}
