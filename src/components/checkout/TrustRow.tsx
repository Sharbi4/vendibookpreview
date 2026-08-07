import { Lock } from 'lucide-react';
import verifiedBadge from '@/assets/verified-badge.png';
import { PaymentTrustBadge } from '@/components/trust/PaymentTrustBadge';
import { PayPalMonogram, PayPalWordmark } from '@/components/brand/ProviderLogos';

/**
 * Compact trust row: payment trust badge, verified badge, card-network
 * initials, and a lock + encryption line. Purely visual reassurance;
 * no interactive elements.
 */
const TrustRow = () => (
  <div className="flex flex-col gap-2 pt-1">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <PaymentTrustBadge context="payments" surface="dark" size="sm" withCopy={false} />
        <span className="h-3 w-px bg-border/70" aria-hidden />
        <img src={verifiedBadge} alt="Verified" className="h-4 w-auto opacity-80" />
      </div>
      <div className="flex items-center gap-1.5">
        {['VISA', 'MC', 'AMEX', 'DISC'].map((n) => (
          <span
            key={n}
            className="text-[9px] font-semibold tracking-wider text-muted-foreground/80 border border-border/60 rounded px-1.5 py-0.5"
          >
            {n}
          </span>
        ))}
      </div>
    </div>
    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
      <Lock className="h-3 w-3" />
      <span>Secure payments powered by</span>
      <PayPalMonogram className="h-3.5" />
      <PayPalWordmark className="h-3" />
      <span>· encrypted end to end · Vendibook never sees your full card number.</span>
    </p>
  </div>
);

export default TrustRow;
