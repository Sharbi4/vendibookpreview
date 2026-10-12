import { deriveStatus } from "./paypalSellerStatus.ts";

/** Fresh merchant-integration response only; cached capability names are not proof. */
export function invoiceSellerReadiness(
  raw: unknown,
  expectedMerchantId: string,
  partnerClientId: string | null,
  environment: string,
) {
  const record = raw as Record<string, any> | null;
  const status = deriveStatus(record, partnerClientId);
  const reasons = [...status.reasons];
  if (environment !== "live") reasons.push("live_environment_required");
  if (!partnerClientId) reasons.push("partner_client_id_missing");
  if (!expectedMerchantId || status.merchantId !== expectedMerchantId) reasons.push("merchant_mismatch");
  const capabilities = Array.isArray(record?.capabilities) ? record.capabilities : [];
  for (const name of ["PARTNER_FEE", "DELAY_FUNDS_DISBURSEMENT"]) {
    // A name without an ACTIVE status, or conflicting entries, is unverified.
    const matches = capabilities.filter((c: any) => c?.name === name);
    if (!matches.length || !matches.every((c: any) => c.status === "ACTIVE")) {
      reasons.push(name.toLowerCase() + "_not_active");
    }
  }
  return { ready: status.status === "ready" && reasons.length === 0, reasons };
}

/** Opt-in only after the live PayPal partner app is approved for these features. */
export function sellerReferralFeatures(invoiceDisbursementEnabled: boolean): string[] {
  return [
    "PAYMENT", "REFUND", "ACCESS_MERCHANT_INFORMATION", "BILLING_AGREEMENT",
    ...(invoiceDisbursementEnabled ? ["PARTNER_FEE", "DELAY_FUNDS_DISBURSEMENT"] : []),
  ];
}
