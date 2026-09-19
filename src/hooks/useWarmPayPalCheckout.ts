import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  getPayPalConfig,
  loadPayPalSdk,
  preconnectPayPal,
} from '@/lib/paypalClient';
import { sellerPaymentReadinessQuery } from '@/hooks/useSellerPaymentReadiness';

/**
 * The SINGLE checkout prewarm mechanism. Pages must not also call
 * `loadPayPalSdk` directly: that would force a CAPTURE bundle onto an
 * AUTHORIZE checkout and download a second, unused SDK.
 *
 * Pre-warms everything the payment step needs while the buyer is still on the
 * earlier steps: PayPal host connections, the runtime config, the
 * seller-readiness lookup (and the merchant id it carries), and the exact SDK
 * bundle the payment step is predicted to use. No PayPal order is created
 * here — nothing is charged, held or reserved.
 *
 * `predictedIntent` only picks which script to prefetch (PayPal serves
 * authorize and capture as separate instances). A wrong guess is harmless: the
 * payment panel loads the other namespace. The server remains authoritative
 * for the real intent on every order.
 */
export function useWarmPayPalCheckout(
  sellerId: string | null | undefined,
  _predictedIntent: 'CAPTURE' | 'AUTHORIZE' = 'CAPTURE',
) {
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
