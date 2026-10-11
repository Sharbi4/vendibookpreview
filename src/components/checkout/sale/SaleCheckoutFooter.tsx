import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/commissions';

interface SaleCheckoutFooterProps {
  backLabel?: string;
  onBack?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  busy?: boolean;
  helper?: string;
  className?: string;
  /** Grand total — shown in the persistent mobile bottom bar. */
  total?: number;
}

/**
 * One consistent action row. On desktop it's an inline back/primary pair
 * under the step content. On mobile it becomes a persistent bottom action
 * bar (fixed, safe-area aware) so the total and primary CTA are always
 * reachable without scrolling — nothing about the step content is hidden.
 */
const SaleCheckoutFooter = ({
  backLabel = 'Back',
  onBack,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  busy,
  helper,
  className,
  total,
}: SaleCheckoutFooterProps) => (
  <>
    {/* Desktop / tablet: inline row, in normal document flow. */}
    <div className={cn('hidden sm:block space-y-2', className)}>
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
            'flex-1 h-12 rounded-xl bg-cta-primary text-white text-[15px] font-semibold',
            'shadow-cta-primary hover:opacity-95 active:scale-[0.995] transition-all',
            'disabled:opacity-50 disabled:shadow-none inline-flex items-center justify-center gap-2',
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {primaryLabel}
        </button>
      </div>
      {helper ? <p className="text-xs text-muted-foreground text-left">{helper}</p> : null}
    </div>

    {/* Mobile: persistent bottom action bar with the running total. Spacer
        above reserves room so page content never sits underneath it. */}
    <div className="sm:hidden h-24" aria-hidden />
    <div
      className={cn(
        'sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-xl',
        'px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(24,20,16,0.35)]',
      )}
    >
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="h-12 px-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 shrink-0"
          >
            {backLabel}
          </button>
        ) : null}
        <div className="flex-1 min-w-0">
          {typeof total === 'number' ? (
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[11px] text-muted-foreground">Total</span>
              <span className="text-base font-semibold tabular-nums text-foreground">
                {formatCurrency(total)}
              </span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled || busy}
            className={cn(
              'w-full h-12 rounded-xl bg-cta-primary text-white text-[15px] font-semibold',
              'shadow-cta-primary active:scale-[0.995] transition-all',
              'disabled:opacity-50 disabled:shadow-none inline-flex items-center justify-center gap-2',
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {primaryLabel}
          </button>
        </div>
      </div>
      {helper ? <p className="text-[11px] text-muted-foreground text-center mt-1.5">{helper}</p> : null}
    </div>
  </>
);

export default SaleCheckoutFooter;
