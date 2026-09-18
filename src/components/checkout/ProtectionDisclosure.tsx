import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { assessProtection, CARD_ISSUER_TRADEOFF, type ProtectionInput } from '@/lib/protectionEligibility';

/**
 * Honest, short protection posture shown next to the payment section.
 * Never implies coverage the mapping says does not exist.
 */
const ProtectionDisclosure = (props: ProtectionInput & { className?: string }) => {
  const a = assessProtection(props);

  return (
    <div
      className={`rounded-xl border border-border/70 bg-muted/20 px-4 py-3 ${props.className ?? ''}`}
      data-protection-posture={a.posture}
    >
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div className="text-xs leading-relaxed">
          <p className="font-semibold text-foreground">{a.headline}</p>
          <p className="mt-1 text-muted-foreground">{a.body}</p>
          {a.pickupRemovesInr && (
            <p className="mt-1 text-muted-foreground">
              Because you are collecting in person, an “item not received” claim is not available on this
              transaction.
            </p>
          )}
          <p className="mt-1 text-muted-foreground">{CARD_ISSUER_TRADEOFF}</p>
          <p className="mt-2">
            <Link
              to="/legal/payments-terms"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-2"
            >
              Payments, Fees, Refunds &amp; Payouts Terms
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProtectionDisclosure;
