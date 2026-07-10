/**
 * TransactionSummary — the compact price/dates/policies card shown in the
 * booking widget or sale widget. Renders directly from a TransactionTerms
 * object built by src/lib/transactionTerms so the numbers here are
 * guaranteed to match the details accordion, price modal, final review
 * sheet, and confirmation email.
 */
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/commissions';
import type { TransactionTerms } from '@/lib/transactionTerms';
import { Info } from 'lucide-react';

interface Props {
  terms: TransactionTerms;
  onViewDetails?: () => void;
  onViewPriceBreakdown?: () => void;
  className?: string;
}

export const TransactionSummary: React.FC<Props> = ({
  terms,
  onViewDetails,
  onViewPriceBreakdown,
  className,
}) => {
  const money = (c: number) => formatCurrency(c / 100);
  return (
    <section
      aria-label="Transaction summary"
      data-testid="transaction-summary"
      className={
        'rounded-2xl border border-border bg-card/70 p-4 shadow-sm ' + (className ?? '')
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">
            {terms.listing.title}
          </div>
          {terms.listing.location && (
            <div className="text-xs text-muted-foreground truncate">
              {terms.listing.location}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted-foreground">Total due today</div>
          <div
            className="text-lg font-semibold text-foreground"
            data-testid="transaction-summary-total"
          >
            {money(terms.pricing.totalCents)}
          </div>
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {terms.pricing.lines
          .filter((l) => l.kind !== 'total')
          .map((l, i) => (
            <li
              key={i}
              className="flex justify-between text-muted-foreground"
              data-testid={`terms-line-${l.kind}`}
            >
              <span>{l.label}</span>
              <span>{money(l.amountCents)}</span>
            </li>
          ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {onViewPriceBreakdown && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={onViewPriceBreakdown}
          >
            <Info className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Price details
          </Button>
        )}
        {onViewDetails && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={onViewDetails}
          >
            View full details
          </Button>
        )}
      </div>
    </section>
  );
};

export default TransactionSummary;
