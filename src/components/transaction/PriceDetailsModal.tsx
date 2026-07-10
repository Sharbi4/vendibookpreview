/**
 * PriceDetailsModal — line-item price breakdown. Same source of truth as
 * TransactionSummary and FinalReviewSheet.
 */
import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/commissions';
import type { TransactionTerms } from '@/lib/transactionTerms';

interface Props {
  terms: TransactionTerms;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PriceDetailsModal: React.FC<Props> = ({ terms, open, onOpenChange }) => {
  const money = (c: number) => formatCurrency(c / 100);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        aria-describedby="price-details-desc"
        data-testid="price-details-modal"
      >
        <DialogHeader>
          <DialogTitle>Price details</DialogTitle>
          <DialogDescription id="price-details-desc">
            Every charge you&rsquo;ll see on your card, spelled out.
          </DialogDescription>
        </DialogHeader>
        <ul className="mt-2 divide-y divide-border">
          {terms.pricing.lines.map((l, i) => (
            <li
              key={i}
              className="py-2 flex items-start justify-between gap-4"
              data-testid={`price-line-${l.kind}`}
            >
              <div className="min-w-0">
                <div
                  className={
                    'text-sm ' +
                    (l.kind === 'total' ? 'font-semibold text-foreground' : 'text-foreground')
                  }
                >
                  {l.label}
                </div>
                {l.hint && (
                  <div className="text-xs text-muted-foreground mt-0.5">{l.hint}</div>
                )}
              </div>
              <div
                className={
                  'text-sm shrink-0 ' +
                  (l.kind === 'total' ? 'font-semibold text-foreground' : 'text-foreground')
                }
                data-testid={`price-amount-${l.kind}`}
              >
                {money(l.amountCents)}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-2">
          Terms version {terms.termsVersion}. This exact breakdown is saved with
          your order and shown again in your confirmation email.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PriceDetailsModal;
