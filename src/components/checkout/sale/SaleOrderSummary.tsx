import { Lock, Package, Truck, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SaleSummaryLine {
  label: string;
  amount: number;
  muted?: boolean;
  /** Overrides the rendered value (e.g. "Calculating…") instead of $amount. */
  valueLabel?: string;
}

interface SaleOrderSummaryProps {
  imageUrl?: string | null;
  title: string;
  lines: SaleSummaryLine[];
  total: number;
  fulfillment: 'pickup' | 'delivery' | 'vendibook_freight';
  fulfillmentDetail?: string | null;
  /** Compact learn-more affordance instead of a large explainer block. */
  onLearnMore?: () => void;
  className?: string;
  /** Hides the thumbnail — used where the listing card is already on screen. */
  hideItem?: boolean;
}

const FULFILLMENT_META = {
  pickup: { icon: MapPin, label: 'Local pickup' },
  delivery: { icon: Truck, label: 'Seller delivery' },
  vendibook_freight: { icon: Package, label: 'Vendibook freight' },
} as const;

const SaleOrderSummary = ({
  imageUrl,
  title,
  lines,
  total,
  fulfillment,
  fulfillmentDetail,
  onLearnMore,
  className,
  hideItem,
}: SaleOrderSummaryProps) => {
  const meta = FULFILLMENT_META[fulfillment];
  const FulfillmentIcon = meta.icon;

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card p-5 shadow-[0_1px_2px_rgba(24,20,16,0.04),0_12px_32px_-24px_rgba(24,20,16,0.35)]',
        className,
      )}
    >
      {!hideItem ? (
        <div className="flex items-center gap-3 pb-4">
          <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
            {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <p className="text-sm font-medium text-foreground line-clamp-2">{title}</p>
        </div>
      ) : null}

      <div className={cn('space-y-2', !hideItem && 'border-t border-border/70 pt-4')}>
        {lines.map((l) => (
          <div key={l.label} className="flex items-start justify-between gap-4 text-sm">
            <span className={cn('min-w-0 truncate', l.muted ? 'text-muted-foreground' : 'text-foreground/80')}>
              {l.label}
            </span>
            <span className={cn('shrink-0 tabular-nums', l.valueLabel ? 'text-muted-foreground' : 'text-foreground')}>
              {l.valueLabel ?? (l.amount > 0 ? `$${l.amount.toLocaleString()}` : 'Free')}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/70 flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-foreground">Total</span>
        <span className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
          ${total.toLocaleString()}
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-muted/70 px-3 py-2.5 flex items-start gap-2">
        <FulfillmentIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0 text-xs">
          <p className="font-medium text-foreground">{meta.label}</p>
          {fulfillmentDetail ? (
            <p className="text-muted-foreground mt-0.5 break-words">{fulfillmentDetail}</p>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground flex items-start gap-1.5">
        <Lock className="h-3 w-3 mt-0.5 shrink-0" />
        <span>
          Checkout processed by PayPal. All sales are final.
          {onLearnMore ? (
            <>
              {' '}
              <button
                type="button"
                onClick={onLearnMore}
                className="underline underline-offset-2 hover:text-foreground"
              >
                How buying works
              </button>
            </>
          ) : null}
        </span>
      </p>
    </div>
  );
};

export default SaleOrderSummary;
