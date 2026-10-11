import { cn } from '@/lib/utils';

export interface MoneyLine {
  label: string;
  /** Pre-formatted value, e.g. "$25,000" or "Included". */
  value: string;
  /** Extra context under the label (e.g. "12.9% marketplace fee"). */
  note?: string;
  /** Renders in muted/secondary treatment. */
  muted?: boolean;
  /** Renders as a credit/discount line. */
  credit?: boolean;
}

interface MoneyBreakdownProps {
  lines: MoneyLine[];
  totalLabel?: string;
  total?: string;
  /** Sub-total caption under the total, e.g. "Due today". */
  totalNote?: string;
  className?: string;
}

/**
 * Money is always displayed from server-derived values. This component only
 * formats what it is handed — it never computes fees or totals itself.
 */
const MoneyBreakdown = ({
  lines,
  totalLabel = 'Total',
  total,
  totalNote,
  className,
}: MoneyBreakdownProps) => (
  <div className={cn('v2-money', className)}>
    {lines.map((line) => (
      <div
        key={`${line.label}-${line.value}`}
        className={cn('v2-money-row', line.muted && 'is-muted', line.credit && 'is-credit')}
      >
        <span className="v2-money-label">
          {line.label}
          {line.note ? <small>{line.note}</small> : null}
        </span>
        <span className="v2-money-value">{line.value}</span>
      </div>
    ))}
    {total ? (
      <div className="v2-money-total">
        <span>
          {totalLabel}
          {totalNote ? <small>{totalNote}</small> : null}
        </span>
        <strong>{total}</strong>
      </div>
    ) : null}
  </div>
);

export default MoneyBreakdown;
