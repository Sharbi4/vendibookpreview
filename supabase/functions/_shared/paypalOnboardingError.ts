/** Classify referral failures without exposing credentials or blaming the seller. */
export function referralFailure(error: {status:number;issue?:string}, action:string) {
  if (action !== "create_referral") return null;
  if (error.status === 401 || error.status === 403 ||
      ["NOT_AUTHORIZED","AUTHORIZATION_ERROR","USER_BUSINESS_ERROR"].includes(error.issue ?? "")) {
    return {
      status: 503, code: "paypal_partner_access_required",
      message: "PayPal connection is temporarily unavailable because Vendibook's PayPal integration needs authorization. Please contact Vendibook support; retrying your seller details will not resolve this.",
    };
  }
  return null;
}
