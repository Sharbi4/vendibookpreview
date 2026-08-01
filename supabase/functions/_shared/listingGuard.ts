// Canonical server-side listing availability gate.
//
// Every payment, booking, offer, boost or add-on path MUST call
// `assertListingPurchasable` immediately before it does anything irreversible
// (creating a provider order, capturing, inserting a booking, etc.).
// Hiding buttons in the UI is never sufficient.

import { jsonError } from "./jsonError.ts";

export const LISTING_UNAVAILABLE_MESSAGE =
  "This listing is no longer available and no payment was created.";

export type ListingPurchaseState = {
  purchasable: boolean;
  reason: string;
  status: string | null;
  host_id?: string | null;
  title?: string | null;
};

/**
 * Reads the canonical purchasability state from the database
 * (`public.listing_purchase_state`). Uses a service-role client so the
 * check is not affected by the caller's RLS visibility.
 */
export async function getListingPurchaseState(
  admin: any,
  listingId: string | null | undefined,
): Promise<ListingPurchaseState> {
  if (!listingId) {
    return { purchasable: false, reason: "not_found", status: null };
  }
  const { data, error } = await admin.rpc("listing_purchase_state", {
    _listing_id: listingId,
  });
  if (error) {
    // Fail closed: an unreadable listing is treated as unavailable.
    return { purchasable: false, reason: "lookup_failed", status: null };
  }
  return (data ?? { purchasable: false, reason: "not_found", status: null }) as ListingPurchaseState;
}

/**
 * Returns a ready-to-send 409 Response when the listing may not be
 * transacted on, or `null` when the transaction may proceed.
 */
export async function assertListingPurchasable(
  admin: any,
  listingId: string | null | undefined,
): Promise<Response | null> {
  const state = await getListingPurchaseState(admin, listingId);
  if (state.purchasable) return null;
  return jsonError(409, "listing_unavailable", LISTING_UNAVAILABLE_MESSAGE, {
    reason: state.reason,
    listing_status: state.status,
  });
}
