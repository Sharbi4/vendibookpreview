import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compact 3-column plan comparison used in the post-signup Welcome screen
 * and the publish-time membership panel. Copy is intentionally identical
 * across surfaces so the promise ("Listing is always free") never varies.
 *
 * Growth is marked "Recommended". Free column always shows real value — never
 * em-dashes or crossed-out entries. Six canonical rows, in fixed order.
 */

export interface MiniPlansComparisonProps {
  /** When true, the Free column swaps "Up to 2 active" for the founding-member line. */
  isFoundingMember?: boolean;
  className?: string;
  compact?: boolean;
}

const ROWS: Array<{
  label: string;
  free: string;
  starter: string;
  growth: string;
}> = [
  { label: 'Active listings',    free: 'Up to 2',        starter: 'Up to 5',        growth: 'Unlimited' },
  { label: 'Featured placement', free: 'Standard',       starter: 'Priority basics', growth: 'Featured credit' },
  { label: 'AI listing tools',   free: 'Basic templates', starter: 'AI descriptions', growth: 'Full tools bundle' },
  { label: 'PermitPath',         free: 'Free checklist',  starter: 'Plus tracker',    growth: 'Plus tracker' },
  { label: 'Fees',               free: '12.9%',           starter: '12.9%',           growth: '12.9%' },
  { label: 'Support',            free: 'Standard',        starter: 'Priority',        growth: 'Priority' },
];

const COLS: Array<{ id: 'free' | 'starter' | 'growth'; name: string; price: string; recommended?: boolean }> = [
  { id: 'free',    name: 'Free',    price: '$0' },
  { id: 'starter', name: 'Starter', price: '$39/mo' },
  { id: 'growth',  name: 'Growth',  price: '$89/mo', recommended: true },
];

export const MiniPlansComparison: React.FC<MiniPlansComparisonProps> = ({
  isFoundingMember = false,
  className,
  compact = false,
}) => {
  return (
    <div
      className={cn(
        'w-full rounded-lg border border-border/70 bg-card overflow-hidden',
        className,
      )}
    >
      <div className="grid grid-cols-4">
        <div className={cn('p-3 text-xs uppercase tracking-wider text-muted-foreground', compact && 'p-2.5')}>
          Compare
        </div>
        {COLS.map((c) => (
          <div
            key={c.id}
            className={cn(
              'p-3 border-l border-border/70 text-center relative',
              compact && 'p-2.5',
              c.id === 'free' && 'bg-emerald-500/5',
              c.recommended && 'bg-orange-500/5',
            )}
          >
            {c.recommended && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 text-white text-[10px] font-semibold px-2 py-0.5 shadow-sm">
                Recommended
              </span>
            )}
            <div className="font-display text-sm font-semibold text-foreground">{c.name}</div>
            <div className="text-xs text-muted-foreground tabular">{c.price}</div>
          </div>
        ))}
      </div>

      {ROWS.map((row, idx) => (
        <div key={row.label} className="grid grid-cols-4 border-t border-border/70 text-sm">
          <div className={cn('p-3 text-muted-foreground', compact && 'p-2.5 text-xs')}>{row.label}</div>
          {COLS.map((c) => {
            let value = row[c.id];
            if (idx === 0 && c.id === 'free' && isFoundingMember) {
              value = 'Unlimited — early member';
            }
            return (
              <div
                key={c.id}
                className={cn(
                  'p-3 border-l border-border/70 flex items-center justify-center gap-1.5 text-center text-foreground',
                  compact && 'p-2.5 text-xs',
                  c.id === 'free' && 'bg-emerald-500/5',
                  c.recommended && 'bg-orange-500/5',
                )}
              >
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-hidden />
                <span>{value}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default MiniPlansComparison;
