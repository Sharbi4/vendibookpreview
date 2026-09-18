import { useEffect, useState } from 'react';
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
  const [state, setState] = useState<SellerPaymentReadiness>({
    loading: true,
    gatingActive: false,
    ready: false,
    reasons: [],
    merchantId: null,
  });

  useEffect(() => {
    let cancelled = false;
    if (!sellerId) {
      setState({ loading: false, gatingActive: false, ready: false, reasons: ['not_connected'], merchantId: null });
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.rpc('seller_payment_readiness' as never, {
          _seller_id: sellerId,
        } as never);
        if (cancelled) return;
        if (error) throw error;
        const payload = (data ?? {}) as {
          gating_active?: boolean;
          ready?: boolean;
          reasons?: string[];
          merchant_id?: string | null;
        };
        setState({
          loading: false,
          gatingActive: payload.gating_active === true,
          ready: payload.ready === true,
          reasons: Array.isArray(payload.reasons) ? payload.reasons : [],
          merchantId: payload.merchant_id ?? null,
        });
      } catch {
        if (cancelled) return;
        // A status lookup failure must never block a working checkout.
        setState({ loading: false, gatingActive: false, ready: false, reasons: [], merchantId: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  return state;
}

export default useSellerPaymentReadiness;
