import FinancingLine from './FinancingLine';
import PaymentProtectionBlock from './PaymentProtectionBlock';
import TrustRow from './TrustRow';

export interface OrderSummaryLine {
  label: string;
  amount: number;
  muted?: boolean;
  /** Overrides the rendered value (e.g. "Calculating…") instead of $amount. */
  valueLabel?: string;
}

interface CheckoutOrderSummaryProps {
  coverImageUrl?: string | null;
  title: string;
  subtitle?: string | null;
  lines: OrderSummaryLine[];
  total: number;
  variant?: 'sale' | 'rental';
}

const money = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Branded in-modal order summary shown above the payment fields.
 * Mirrors StickySummary but tuned for the constrained modal width.
 */
const CheckoutOrderSummary = ({
  coverImageUrl,
  title,
  subtitle,
  lines,
  total,
  variant = 'sale',
}: CheckoutOrderSummaryProps) => (
  <div className="space-y-3">
    <div className="flex items-start gap-3">
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt={title}
          className="h-14 w-14 rounded-lg object-cover border border-border/60 flex-shrink-0"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2">{title}</h3>
        {subtitle ? (
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{subtitle}</p>
        ) : null}
      </div>
    </div>

    <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3 space-y-1.5">
      {lines.map((line, i) => (
        <div
          key={`${line.label}-${i}`}
          className={`flex justify-between text-xs ${line.muted ? 'text-muted-foreground' : 'text-foreground/90'}`}
        >
          <span>{line.label}</span>
          <span>{line.valueLabel ?? money(line.amount)}</span>
        </div>
      ))}
      <div className="h-px bg-border/60 my-2" />
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-semibold text-foreground">Total</span>
        <span className="text-lg font-bold text-foreground">{money(total)}</span>
      </div>
      <FinancingLine totalUsd={total} />
    </div>

    <PaymentProtectionBlock variant={variant} />
    <TrustRow />
  </div>
);

export default CheckoutOrderSummary;
