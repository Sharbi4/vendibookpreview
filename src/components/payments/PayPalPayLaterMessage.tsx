import { useEffect, useRef } from 'react';

import { loadPayPalAuthorizeSdk, loadPayPalSdk } from '@/lib/paypalClient';

type PayPalPayLaterMessageProps = {
  amount?: number | null;
  placement: 'product' | 'checkout';
  merchantId?: string | null;
  className?: string;
  /**
   * The intent of the SDK instance this checkout is actually using. Pass the
   * resolved value so Pay Later messaging reuses the EXACT same SDK instance
   * as the payment buttons instead of pulling in a second CAPTURE bundle.
   * `null` means "not resolved yet" — nothing loads until it is.
   */
  intent?: 'CAPTURE' | 'AUTHORIZE' | null;
  /** Adds the wallet components so the key matches the panel's capture SDK. */
  wallets?: boolean;
};

/**
 * Official PayPal Pay Later messaging. PayPal decides eligibility, copy,
 * installment figures, disclosures, and whether anything renders at all.
 */
export default function PayPalPayLaterMessage({
  amount,
  placement,
  merchantId,
  className = '',
  intent = 'CAPTURE',
  wallets = false,
}: PayPalPayLaterMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);
  const validAmount = Number.isFinite(amount) && Number(amount) > 0;

  useEffect(() => {
    if (!validAmount || !intent || !messageRef.current) return;
    let cancelled = false;
    const container = messageRef.current;

    const options = {
      merchantId,
      pageType: placement === 'product' ? ('product-details' as const) : ('checkout' as const),
      wallets,
    };
    const load = intent === 'AUTHORIZE' ? loadPayPalAuthorizeSdk : loadPayPalSdk;

    load(options)
      .then((paypal) => {
        if (cancelled || !paypal?.Messages || !container) return;
        container.replaceChildren();
        return paypal.Messages().render(container);
      })
      .catch(() => {
        // Pay Later messaging is optional and must collapse when unavailable.
        container.replaceChildren();
      });

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [merchantId, placement, validAmount, amount, intent, wallets]);

  if (!validAmount || !intent) return null;

  return (
    <div
      ref={messageRef}
      className={`paypal-pay-later-message ${className}`}
      data-pp-message
      data-pp-placement={placement}
      data-pp-amount={Number(amount).toFixed(2)}
      data-pp-style-layout="text"
      data-pp-style-logo-type="inline"
      data-pp-style-text-color="black"
    />
  );
}
