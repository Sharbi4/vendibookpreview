import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SellerPaymentReadiness {
  loading: boolean;
  /** True only when Vendibook routes marketplace money to connected seller accounts. */
  gatingActive: boolean;
  ready: boolean;
  reasons: string[];
  /** Seller's PayPal merchant id — only present when routing is live and ready. */
  merchantId: string | null;
}

/**
 * Buyer-safe seller payment readiness.
 *
 * Returns a yes/no answer plus generic reasons via a security-definer RPC — no
 * seller account details are exposed. `gatingActive` is false while Connected
 * Path routing is off, and callers MUST NOT block checkout in that case: the
 * current first-party Vendibook PayPal checkout keeps working exactly as before.
 */
export function useSellerPaymentReadiness(sellerId?: string | null): SellerPaymentReadiness {
  const query = useQuery({
    queryKey: ['seller-payment-readiness', sellerId],
    enabled: Boolean(sellerId),
    staleTime: 5 * 60_000,
    // A readiness lookup must never stall the payment step behind retry
    // backoff: one attempt, then fall through to the unblocked default.
    retry: false,
    queryFn: async () => {

      const { data, error } = await supabase.rpc('seller_payment_readiness' as never, {
        _seller_id: sellerId,
      } as never);
      if (error) throw error;
      const payload = (data ?? {}) as {
        gating_active?: boolean;
        ready?: boolean;
        reasons?: string[];
        merchant_id?: string | null;
      };
      return {
        gatingActive: payload.gating_active === true,
        ready: payload.ready === true,
        reasons: Array.isArray(payload.reasons) ? payload.reasons : [],
        merchantId: payload.merchant_id ?? null,
      };
    },
  });

  if (!sellerId) {
    return { loading: false, gatingActive: false, ready: false, reasons: ['not_connected'], merchantId: null };
  }

  // Lookup failures never block the established checkout and never display
  // the buyer-facing PayPal verification claim.
  return {
    loading: query.isLoading && !query.isError,

    gatingActive: query.data?.gatingActive ?? false,
    ready: query.data?.ready ?? false,
    reasons: query.data?.reasons ?? [],
    merchantId: query.data?.merchantId ?? null,
  };
}

export default useSellerPaymentReadiness;
