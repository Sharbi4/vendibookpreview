/**
 * FinalReviewSheet — the last screen the buyer sees before Stripe checkout
 * or Pay-in-Person confirmation. Composes TransactionSummary +
 * TransactionDetailsAccordion + explicit "I agree" affordance.
 */
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { TransactionTerms } from '@/lib/transactionTerms';
import { TransactionSummary } from './TransactionSummary';
import { TransactionDetailsAccordion } from './TransactionDetailsAccordion';
import { PriceDetailsModal } from './PriceDetailsModal';

interface Props {
  terms: TransactionTerms;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  submitting?: boolean;
  confirmLabel?: string;
}

export const FinalReviewSheet: React.FC<Props> = ({
  terms,
  open,
  onOpenChange,
  onConfirm,
  submitting,
  confirmLabel,
}) => {
  const [agreed, setAgreed] = React.useState(false);
  const [priceOpen, setPriceOpen] = React.useState(false);

  const isPIP = terms.paymentMethod === 'pay_in_person';
  const label =
    confirmLabel ||
    (isPIP ? 'Confirm — arrange in person' : 'Continue to secure payment');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto"
        data-testid="final-review-sheet"
      >
        <SheetHeader>
          <SheetTitle>Final review</SheetTitle>
          <SheetDescription>
            Confirm the details below. This exact record is saved with your
            order and echoed in your confirmation email.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <TransactionSummary
            terms={terms}
            onViewPriceBreakdown={() => setPriceOpen(true)}
          />
          <TransactionDetailsAccordion terms={terms} />

          <label className="flex items-start gap-3 rounded-xl border border-border bg-card/70 p-3">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              aria-label="I agree to the terms"
              data-testid="final-review-agree"
            />
            <span className="text-sm text-muted-foreground leading-snug">
              I&rsquo;ve reviewed the price details, dates, cancellation policy,
              and required documents above. I agree to these terms
              (version&nbsp;{terms.termsVersion}).
            </span>
          </label>

          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={!agreed || submitting}
            onClick={() => onConfirm()}
            data-testid="final-review-confirm"
          >
            {submitting ? 'Working…' : label}
          </Button>
        </div>

        <PriceDetailsModal
          terms={terms}
          open={priceOpen}
          onOpenChange={setPriceOpen}
        />
      </SheetContent>
    </Sheet>
  );
};

export default FinalReviewSheet;
