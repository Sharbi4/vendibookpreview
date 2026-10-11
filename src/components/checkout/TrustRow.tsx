import { PayPalMonogram, PayPalWordmark } from '@/components/brand/ProviderLogos';

/**
 * Factual payment line shown under the PayPal controls. No protection,
 * holding-of-funds, or encryption marketing claims.
 */
const TrustRow = () => (
  <div className="flex flex-col gap-1.5 pt-1">
    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
      <PayPalMonogram className="h-3.5" />
      <PayPalWordmark className="h-3" />
      <span>Payment processed through PayPal</span>
    </p>
    <p className="text-[11px] text-muted-foreground">
      Vendibook does not store your full card number.
    </p>
  </div>
);

export default TrustRow;
