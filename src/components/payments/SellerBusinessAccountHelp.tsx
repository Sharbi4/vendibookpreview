import { ChevronDown, ShieldCheck } from 'lucide-react';

type SellerBusinessAccountHelpProps = {
  className?: string;
  compact?: boolean;
};

/** Reassurance shown before a seller leaves Vendibook for PayPal onboarding. */
export default function SellerBusinessAccountHelp({
  className = '',
  compact = false,
}: SellerBusinessAccountHelpProps) {
  return (
    <div className={className}>
      <p className={compact ? 'text-xs text-muted-foreground' : 'text-sm text-muted-foreground'}>
        You&apos;ll connect a PayPal Business account. Individual owners can choose Sole
        Proprietorship, use their own legal name, and do not need an LLC or registered company.
        PayPal will ask for a tax ID; for a sole proprietor, that&apos;s usually your Social Security
        number.
      </p>
      <details className="group mt-2 text-left">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-foreground marker:content-none">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
          What if I&apos;m not a registered business?
        </summary>
        <div className="mt-2 flex items-start gap-2 border-l border-border pl-3 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <p>
            Sole proprietors are welcome. Use your own legal name—no LLC is required. PayPal
            verifies your identity, which helps buyers know who they&apos;re transacting with.
          </p>
        </div>
      </details>
    </div>
  );
}