import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  getPayPalConfig,
  loadPayPalSdk,
  preconnectPayPal,
} from '@/lib/paypalClient';
import { sellerPaymentReadinessQuery } from '@/hooks/useSellerPaymentReadiness';

/** Pre-warm the canonical CAPTURE SDK. This creates no order or hold. */
export function useWarmPayPalCheckout(sellerId: string | null | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    // 0. Open the connections to PayPal's script/asset hosts.
    preconnectPayPal();

    // 1. Runtime config (client id, currency) — cached per tab afterwards.
    getPayPalConfig().catch(() => undefined);

    // 2. Seller readiness + merchant id, then 3. the SDK script itself.
    (async () => {
      let merchantId: string | null = null;
      if (sellerId) {
        try {
          const data = await queryClient.fetchQuery(sellerPaymentReadinessQuery(sellerId));
          merchantId = data.merchantId ?? null;
        } catch {
          /* readiness is non-blocking — fall through to first-party */
        }
      }
      if (cancelled) return;
      loadPayPalSdk({ merchantId, pageType: 'checkout', wallets: true }).catch(() => undefined);
    })();

    return () => {
      cancelled = true;
    };
  }, [sellerId, queryClient]);
}

export default useWarmPayPalCheckout;
