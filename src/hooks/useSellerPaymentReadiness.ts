/**
 * Seller PayPal payment-readiness gate.
 *
 * NOTE: this is a safe placeholder implementation. It intentionally never
 * gates checkout (`gatingActive` is always `false`) so existing purchase
 * flows are unaffected until the real readiness check (owned by another
 * workstream) lands with this exact signature. Once that lands it can
 * fully replace this file without any caller changes.
 */
export interface SellerPaymentReadiness {
  loading: boolean;
  gatingActive: boolean;
  ready: boolean;
  reasons: string[];
}

export function useSellerPaymentReadiness(_sellerId?: string | null): SellerPaymentReadiness {
  return { loading: false, gatingActive: false, ready: true, reasons: [] };
}

export default useSellerPaymentReadiness;
