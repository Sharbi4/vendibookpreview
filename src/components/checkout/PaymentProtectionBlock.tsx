import { ShieldCheck } from 'lucide-react';

interface PaymentProtectionBlockProps {
  variant?: 'sale' | 'rental';
}

/**
 * Compact assurance block shown inside the checkout modal.
 * Uses "payment protection" wording — never "escrow".
 */
const PaymentProtectionBlock = ({ variant = 'sale' }: PaymentProtectionBlockProps) => {
  const body =
    variant === 'rental'
      ? 'Your payment is protected. Funds are held securely and released to the host after your booking is confirmed and complete.'
      : 'Your payment is protected. Funds are held securely and released to the seller only after you confirm the item is as described.';

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3 flex items-start gap-3">
      <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
      <div className="text-xs leading-relaxed text-foreground/90">
        <span className="font-semibold text-foreground">Payment protection</span>
        <p className="mt-0.5 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
};

export default PaymentProtectionBlock;
