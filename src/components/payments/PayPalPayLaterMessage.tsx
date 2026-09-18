import { useEffect, useRef } from 'react';

import { loadPayPalSdk } from '@/lib/paypalClient';

type PayPalPayLaterMessageProps = {
  amount?: number | null;
  placement: 'product' | 'checkout';
  merchantId?: string | null;
  className?: string;
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
}: PayPalPayLaterMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);
  const validAmount = Number.isFinite(amount) && Number(amount) > 0;

  useEffect(() => {
    if (!validAmount || !messageRef.current) return;
    let cancelled = false;
    const container = messageRef.current;

    loadPayPalSdk({
      merchantId,
      pageType: placement === 'product' ? 'product-details' : 'checkout',
    })
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
  }, [merchantId, placement, validAmount, amount]);

  if (!validAmount) return null;

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