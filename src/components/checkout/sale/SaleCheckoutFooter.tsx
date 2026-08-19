import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaleCheckoutFooterProps {
  backLabel?: string;
  onBack?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  busy?: boolean;
  helper?: string;
  className?: string;
}

/** One consistent action row: strong orange primary, quiet secondary. */
const SaleCheckoutFooter = ({
  backLabel = 'Back',
  onBack,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  busy,
  helper,
  className,
}: SaleCheckoutFooterProps) => (
  <div className={cn('space-y-2', className)}>
    <div className="flex items-center gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="h-12 px-5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50"
        >
          {backLabel}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled || busy}
        className={cn(
          'flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-[15px] font-semibold',
          'shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.65)] hover:opacity-95 active:scale-[0.995] transition-all',
          'disabled:opacity-50 disabled:shadow-none inline-flex items-center justify-center gap-2',
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {primaryLabel}
      </button>
    </div>
    {helper ? <p className="text-xs text-muted-foreground text-center sm:text-left">{helper}</p> : null}
  </div>
);

export default SaleCheckoutFooter;
