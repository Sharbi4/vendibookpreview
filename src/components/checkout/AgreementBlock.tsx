import { ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface AgreementBlockProps {
  agreed: boolean;
  onChange: (v: boolean) => void;
  cancellationLine: string;
  refundLine: string;
  termsHref?: string;
  protectionHref?: string;
}

/**
 * Plain-language, single-checkbox agreement block. Uses "payment protection"
 * language, never "escrow". One-line cancellation and refund summaries with
 * links to the full documents.
 */
const AgreementBlock = ({
  agreed,
  onChange,
  cancellationLine,
  refundLine,
  termsHref = '/terms',
  protectionHref = '/payment-protection',
}: AgreementBlockProps) => {
  return (
    <div className="rounded-xl border-[1.5px] border-border/70 bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-foreground">
          <div className="font-semibold">Payment protection included</div>
          <p className="text-muted-foreground mt-0.5">
            Your payment is held securely and only released to the seller after
            you confirm the item was received as described.
          </p>
        </div>
      </div>

      <dl className="text-sm space-y-2">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground shrink-0">Cancellation</dt>
          <dd className="text-foreground text-right">{cancellationLine}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground shrink-0">Refunds</dt>
          <dd className="text-foreground text-right">{refundLine}</dd>
        </div>
      </dl>

      <div className="flex items-start gap-3 pt-3 border-t border-border/60">
        <Checkbox
          id="agreement"
          checked={agreed}
          onCheckedChange={(c) => onChange(c === true)}
        />
        <label htmlFor="agreement" className="text-sm text-foreground cursor-pointer">
          I understand and agree to these terms.{' '}
          <a
            href={termsHref}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Full terms
          </a>{' '}
          ·{' '}
          <a
            href={protectionHref}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Payment protection
          </a>
        </label>
      </div>
    </div>
  );
};

export default AgreementBlock;
