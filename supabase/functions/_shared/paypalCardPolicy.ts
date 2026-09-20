/** PayPal's Advanced Card eligibility is separate from wallet readiness. */
export function advancedCardsReady(raw: any): boolean {
  const product = Array.isArray(raw?.products)
    ? raw.products.find((p: any) => p?.name === "PPCP_CUSTOM") : null;
  const capability = Array.isArray(raw?.capabilities)
    ? raw.capabilities.find((c: any) => c?.name === "CUSTOM_CARD_PROCESSING") : null;
  return raw?.payments_receivable === true && raw?.primary_email_confirmed === true &&
    product?.vetting_status === "SUBSCRIBED" && capability?.status === "ACTIVE" &&
    (!capability.limits || (Array.isArray(capability.limits) && capability.limits.length === 0));
}

/** Never reuse a wallet order for hosted card entry (or vice versa). */
export function sameCheckoutSource(fees: any, cardFields: boolean): boolean {
  return (fees?.checkout_source ?? "buttons") === (cardFields ? "card_fields" : "buttons");
}

/** Follow PayPal's server-side 3DS table; absent results mean SCA was not required. */
export function cardAuthenticationReady(source: any): boolean {
  const result = source?.authentication_result;
  if (!result) return true;
  const enrollment = result.three_d_secure?.enrollment_status;
  const authentication = result.three_d_secure?.authentication_status;
  if (result.liability_shift === "UNKNOWN") return false;
  if (["N", "R", "U", "C", "D"].includes(authentication)) return false;
  if (enrollment === "Y") return ["Y", "A"].includes(authentication) && result.liability_shift === "POSSIBLE";
  return !authentication && ["N", "U", "B"].includes(enrollment) && result.liability_shift === "NO";
}

/** No PAN/CVV touches our server. PayPal's SDK supplies card details directly. */
export function cardPaymentSource(returnUrl?: string | null, cancelUrl?: string | null, shipping = false) {
  return {
    card: {
      attributes: { verification: { method: "SCA_WHEN_REQUIRED" } },
      experience_context: {
        shipping_preference: shipping ? "SET_PROVIDED_ADDRESS" : "NO_SHIPPING",
        ...(returnUrl ? { return_url: returnUrl } : {}),
        ...(cancelUrl ? { cancel_url: cancelUrl } : {}),
      },
    },
  };
}
