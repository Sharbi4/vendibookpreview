import { resolveProStatus } from "./proEligibility.ts";
import { applyTaxToQuote, quoteBookingRequest, type QuoteResult } from "./paypalAccounting.ts";
import { parseStateZipFromAddress, quoteSalesTax } from "./tax.ts";
import { findActiveExemption } from "./taxExemption.ts";

/**
 * The single rental amount quote: trusted booking row (rental + renter service
 * fee) + refundable deposit + sales tax for the state the rental happens in.
 * Used by the Square charge and by every email/screen that quotes "due now",
 * so what renters are told always matches what they are charged.
 * `booking.listing` must carry { title, city, state, address }.
 */
// deno-lint-ignore no-explicit-any
export async function quoteRentalAmountDue(admin: any, booking: any) {
  const locked = booking.host_platform_fee !== null && booking.host_platform_fee !== undefined;
  const hostPro = locked ? { isPro: !!booking.pro_fee_applied } : { isPro: (await resolveProStatus(admin, booking.host_id)).isPro };
  const quote: QuoteResult = quoteBookingRequest(booking, booking.listing?.title ?? "Listing", hostPro);
  const loc = parseStateZipFromAddress(booking.listing?.address);
  const state = booking.listing?.state || loc.state;
  const tax = await quoteSalesTax({
    amountCents: quote.taxableBaseCents,
    destination: { state, zip: loc.zip ?? null, city: booking.listing?.city ?? null },
    kind: "rental",
    requireDestination: true,
    // The renter's own certificate for the state the rental happens in.
    exemption: await findActiveExemption(admin, booking.shopper_id, state),
  });
  applyTaxToQuote(quote, tax);
  return { quote, tax };
}
