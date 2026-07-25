import { cn } from '@/lib/utils';

export interface CostLine {
  label: string;
  amount: number;
  hint?: string;
  estimated?: boolean;
  free?: boolean;
}

interface CostBreakdownProps {
  lines: CostLine[];
  totalPrice: number;
  totalDueNow: number;
  balanceDue?: { amount: number; whenLabel: string } | null;
}

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const num = { fontVariantNumeric: 'tabular-nums' as const };

const CostBreakdown = ({
  lines,
  totalPrice,
  totalDueNow,
  balanceDue,
}: CostBreakdownProps) => {
  return (
    <div className="rounded-xl border-[1.5px] border-border/70 bg-card p-5">
      <div className="text-sm font-semibold text-muted-foreground mb-3">
        Cost breakdown
      </div>
      <dl className="space-y-2 text-sm">
        {lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              {l.label}
              {l.estimated ? (
                <span className="ml-1 text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  · estimated
                </span>
              ) : null}
              {l.hint ? (
                <div className="text-xs text-muted-foreground/80">{l.hint}</div>
              ) : null}
            </dt>
            <dd
              className={cn(
                'font-medium shrink-0',
                l.free ? 'text-emerald-600' : 'text-foreground',
              )}
              style={num}
            >
              {l.free ? 'FREE' : money(l.amount)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total price</span>
          <span className="font-medium text-foreground" style={num}>
            {money(totalPrice)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-display text-base font-semibold text-foreground">
            Total due now
          </span>
          <span
            className="font-display text-xl font-bold text-primary"
            style={num}
          >
            {money(totalDueNow)}
          </span>
        </div>
        {balanceDue ? (
          <div className="flex justify-between text-sm pt-1">
            <span className="text-muted-foreground">
              Balance ({balanceDue.whenLabel})
            </span>
            <span className="font-medium text-foreground" style={num}>
              {money(balanceDue.amount)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CostBreakdown;
