/**
 * Taxed checkout quotes shared by the payment functions and the Campus
 * Partner code endpoint, so the total a shopper is shown is computed exactly
 * the way the processor charge is.
 */
import { applyTaxToQuote, quoteBookingRequest, quoteSaleTransaction, type QuoteResult } from "./paypalAccounting.ts";
import { resolveProStatus } from "./proEligibility.ts";
import { parseStateZipFromAddress, quoteSalesTax, type TaxDestination } from "./tax.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

/**
 * Sale tax destination: delivery/freight are taxed where the goods land,
 * pickup/on-site where the listing sits. `tx.listing` must carry
 * (city, state, address).
 */
export function saleTaxDestination(tx: Record<string, any>): TaxDestination {
  const listingLoc = tx.listing ?? {};
  const listingLocParsed = parseStateZipFromAddress(listingLoc.address);
  const delivers = tx.fulfillment_type === "delivery" || tx.fulfillment_type === "vendibook_freight";
  const parsed = delivers ? parseStateZipFromAddress(tx.delivery_address) : { state: null, zip: null };
  return {
    state: parsed.state ?? listingLoc.state ?? null,
    zip: parsed.zip ?? listingLocParsed.zip ?? null,
    city: listingLoc.city ?? null,
  };
}

/** Rentals are taxed where the rental happens: the listing's location. */
export function rentalTaxDestination(booking: Record<string, any>): TaxDestination {
  const loc = parseStateZipFromAddress(booking.listing?.address);
  return { state: booking.listing?.state ?? null, zip: loc.zip ?? null, city: booking.listing?.city ?? null };
}

/** Server-side rental quote: trusted booking row + Pro fee + sales tax. */
export async function rentalQuoteWithTax(admin: Admin, booking: Record<string, any>) {
  const locked = booking.host_platform_fee !== null && booking.host_platform_fee !== undefined;
  const hostPro = locked ? { isPro: !!booking.pro_fee_applied } : { isPro: (await resolveProStatus(admin, booking.host_id)).isPro };
  const quote: QuoteResult = quoteBookingRequest(booking, booking.listing?.title ?? "Listing", hostPro);
  const tax = await quoteSalesTax({ amountCents: quote.taxableBaseCents, destination: rentalTaxDestination(booking), kind: "rental" });
  applyTaxToQuote(quote, tax);
  return { quote, tax };
}

/** Server-side sale quote: trusted sale row + freight payer + sales tax. */
export async function saleQuoteWithTax(tx: Record<string, any>) {
  const freightPayer = tx.listing?.freight_payer === "seller" ? "seller" : "buyer";
  const quote: QuoteResult = quoteSaleTransaction(tx, tx.listing?.title ?? "Listing", { freightPayer });
  const tax = await quoteSalesTax({ amountCents: quote.taxableBaseCents, destination: saleTaxDestination(tx), kind: "sale" });
  applyTaxToQuote(quote, tax);
  return { quote, tax };
}
