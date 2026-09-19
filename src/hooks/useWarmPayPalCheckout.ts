import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  getPayPalConfig,
  loadPayPalAuthorizeSdk,
  loadPayPalSdk,
} from '@/lib/paypalClient';
import { sellerPaymentReadinessQuery } from '@/hooks/useSellerPaymentReadiness';

/**
 * Pre-warms everything the payment step needs while the buyer is still on
 * the earlier checkout steps: the runtime config, the seller-readiness
 * lookup, and the PayPal SDK script itself. When the payment step mounts,
 * all three resolve from cache and the buttons render immediately.
 *
 * `predictedIntent` is only a best guess used to pick which SDK script to
 * prefetch (PayPal serves authorize and capture as separate URLs). A wrong
 * guess is harmless — the payment panel simply loads the other namespace.
 * The server remains authoritative for the real intent on every order.
 */
export function useWarmPayPalCheckout(
  sellerId: string | null | undefined,
  predictedIntent: 'CAPTURE' | 'AUTHORIZE' = 'AUTHORIZE',
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

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
      const load = predictedIntent === 'AUTHORIZE' ? loadPayPalAuthorizeSdk : loadPayPalSdk;
      load({ merchantId, pageType: 'checkout' }).catch(() => undefined);
    })();

    return () => {
      cancelled = true;
    };
  }, [sellerId, predictedIntent, queryClient]);
}

export default useWarmPayPalCheckout;
