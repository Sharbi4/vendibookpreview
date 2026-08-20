import { ShieldCheck, FileSignature } from 'lucide-react';

interface PaymentProtectionBlockProps {
  variant?: 'sale' | 'rental';
}

/**
 * Compact assurance block shown inside the checkout modal.
 * Rental copy states what actually happens — PayPal processes the payment,
 * Vendibook records it and refunds if the host declines. No escrow claims.
 */
const PaymentProtectionBlock = ({ variant = 'sale' }: PaymentProtectionBlockProps) => {
  const body =
    variant === 'rental'
      ? 'PayPal processes your payment and Vendibook records the booking. If the host declines or cannot host your dates, your payment is refunded to your original payment method.'
      : 'Your payment is processed by PayPal and recorded by Vendibook, with a full transaction record saved to your account.';

  const esign =
    variant === 'rental'
      ? 'Your rental agreement is signed online — no printing, no scanning, no extra fee.'
      : 'The bill of sale is signed online — no printing, no scanning, no extra fee.';

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-foreground/90">
          <span className="font-semibold text-foreground">
            {variant === 'rental' ? 'How your payment works' : 'Secure payment'}
          </span>
          <p className="mt-0.5 text-muted-foreground">{body}</p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3 flex items-start gap-3">
        <FileSignature className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-foreground/90">
          <span className="font-semibold text-foreground">Free e-signature included</span>
          <p className="mt-0.5 text-muted-foreground">{esign}</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentProtectionBlock;
