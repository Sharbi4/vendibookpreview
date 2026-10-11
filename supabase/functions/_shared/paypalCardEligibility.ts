import { getMerchantIntegrationStatus, paypalEnvironment } from "./paypal.ts";
import { sellerMultipartyReady, multipartyEnabled } from "./paypalMultiparty.ts";
import { advancedCardsReady } from "./paypalCardPolicy.ts";
import { deriveStatus } from "./paypalSellerStatus.ts";

export async function cardEligibility(admin: any, sellerId?: string | null) {
  const routing = await sellerMultipartyReady(admin, sellerId);
  // Preserve first-party routing. The SDK and Orders API determine the
  // platform account's card eligibility when no seller routing is enabled.
  if (!routing.enabled || !routing.merchantId) {
    const unavailableSeller = !!sellerId && await multipartyEnabled(admin);
    return { eligible: !unavailableSeller, merchantId: null, routing };
  }
  const raw = await getMerchantIntegrationStatus(routing.merchantId, { environment: paypalEnvironment() });
  return {
    eligible: deriveStatus(raw).status === "ready" && advancedCardsReady(raw),
    merchantId: routing.merchantId,
    routing,
  };
}
