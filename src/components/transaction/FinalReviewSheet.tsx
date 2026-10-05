/**
 * FinalReviewSheet — the last screen the buyer sees before Stripe checkout
 * or Pay-in-Person confirmation. Composes TransactionSummary +
 * TransactionDetailsAccordion + explicit "I agree" affordance.
 *
 * On confirm this component records TWO things server-side before running
 * the caller's onConfirm:
 *   1. `record_user_consent` for the applicable document
 *      (Renter Terms for rentals, Pay-in-Person Acknowledgment for cash sales,
 *       Terms of Service otherwise) — spec §5, §27
 *   2. `acknowledge-terms` edge function which stamps
 *      transaction_terms.acknowledged_at / _ip / _ua — spec §21, §28
 * If either write fails the caller's onConfirm never runs (spec §5.10).
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { TransactionTerms } from '@/lib/transactionTerms';
import {
  CONSENT_TRIGGERS,
  CURRENT_VERSIONS,
  DOCUMENT_TYPES,
  type ConsentTrigger,
  type DocumentType,
} from '@/lib/legalDocuments';
import { TransactionSummary } from './TransactionSummary';
import { TransactionDetailsAccordion } from './TransactionDetailsAccordion';
import { PriceDetailsModal } from './PriceDetailsModal';

interface Props {
  terms: TransactionTerms;
  /** Row id in `transaction_terms` — required to stamp acknowledgment. */
  termsId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  submitting?: boolean;
  confirmLabel?: string;
  /** Optional extra related ids merged into the consent row's related_ids. */
  relatedIds?: Record<string, string>;
  /**
   * Render in the page (inside a checkout step) instead of a bottom sheet.
   * Same review, same consent recording; `open` controls visibility.
   */
  inline?: boolean;
}

const pickDocument = (
  terms: TransactionTerms,
): { documentType: DocumentType; trigger: ConsentTrigger; acceptanceText: string } => {
  if (terms.paymentMethod === 'pay_in_person') {
    return {
      documentType: DOCUMENT_TYPES.PAY_IN_PERSON_ACKNOWLEDGMENT,
      trigger: CONSENT_TRIGGERS.PAY_IN_PERSON,
      acceptanceText:
        'I understand that payment will be made directly to the seller and will not be processed or held by Vendibook, and I reviewed the purchase details above.',
    };
  }
  if (terms.mode === 'rent') {
    return {
      documentType: DOCUMENT_TYPES.RENTER_TERMS,
      trigger: CONSENT_TRIGGERS.RENTAL_REQUEST,
      acceptanceText:
        'I reviewed the rental price, dates, payment timing, cancellation policy, deposit details, and listing requirements, and agree to the Renter Terms.',
    };
  }
  return {
    documentType: DOCUMENT_TYPES.TERMS_OF_SERVICE,
    trigger: CONSENT_TRIGGERS.PURCHASE_REVIEW,
    acceptanceText:
      'I reviewed the listing, price, payment method, and transaction details and agree to the Buyer Terms.',
  };
};

export const FinalReviewSheet: React.FC<Props> = ({
  terms,
  termsId,
  open,
  onOpenChange,
  onConfirm,
  submitting,
  confirmLabel,
  relatedIds,
  inline = false,
}) => {
  const [agreed, setAgreed] = React.useState(false);
  const [priceOpen, setPriceOpen] = React.useState(false);
  const [recording, setRecording] = React.useState(false);

  React.useEffect(() => {
    if (open) setAgreed(false);
  }, [open]);

  const isPIP = terms.paymentMethod === 'pay_in_person';
  const label =
    confirmLabel ||
    (isPIP ? 'Confirm — arrange in person' : 'Continue to secure payment');

  const { documentType, trigger, acceptanceText } = pickDocument(terms);

  const handleConfirm = async () => {
    if (!agreed || recording) return;
    setRecording(true);
    try {
      // 1) Consent record — versioned document + exact wording.
      const { error: consentErr } = await supabase.rpc('record_user_consent', {
        _document_type: documentType,
        _document_version: CURRENT_VERSIONS[documentType],
        _trigger_action: trigger,
        _acceptance_text: acceptanceText,
        _related_ids: {
          listing_id: terms.listing.id,
          ...(termsId ? { terms_id: termsId } : {}),
          ...(relatedIds ?? {}),
        },
        _route: typeof window !== 'undefined' ? window.location.pathname : null,
        _ip: null,
        _user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        _locale: typeof navigator !== 'undefined' ? navigator.language : null,
        _application_version: null,
      });
      if (consentErr) throw consentErr;

      // 2) Stamp transaction_terms.acknowledged_at (best-effort — we already
      //    have a durable consent row from step 1).
      if (termsId) {
        try {
          await supabase.functions.invoke('acknowledge-terms', {
            body: { terms_id: termsId },
          });
        } catch (ackErr) {
          console.warn('acknowledge-terms failed (non-blocking)', ackErr);
        }
      }

      await onConfirm();
    } catch (err) {
      toast({
        title: 'Could not record your acceptance',
        description:
          err instanceof Error
            ? err.message
            : 'Please try again. If the problem continues, contact support@vendibook.com.',
        variant: 'destructive',
      });
    } finally {
      setRecording(false);
    }
  };

  const body = (
        <div className="mt-4 space-y-4">
          <TransactionSummary
            terms={terms}
            onViewPriceBreakdown={() => setPriceOpen(true)}
          />
          <TransactionDetailsAccordion terms={terms} />

          <label className="flex items-start gap-3 rounded-xl border border-border bg-card/70 p-3 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              aria-label={acceptanceText}
              data-testid="final-review-agree"
            />
            <span className="text-sm text-muted-foreground leading-snug">
              {acceptanceText}
            </span>
          </label>

          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={!agreed || submitting || recording}
            onClick={handleConfirm}
            data-testid="final-review-confirm"
          >
            {submitting || recording ? 'Working…' : label}
          </Button>
        </div>
  );

  if (inline) {
    if (!open) return null;
    return (
      <section
        className="rounded-xl border border-border bg-card p-4"
        aria-labelledby="final-review-inline-title"
        data-testid="final-review-inline"
      >
        <h3 id="final-review-inline-title" className="text-base font-semibold text-foreground">
          Review your price and details
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Confirm the details below. The exact record you see here is saved
          with your booking and echoed in your confirmation email.
        </p>
        {body}
        <button type="button" className="v2-btn-quiet mt-3" onClick={() => onOpenChange(false)}>
          Edit booking details
        </button>
        <PriceDetailsModal terms={terms} open={priceOpen} onOpenChange={setPriceOpen} />
      </section>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto"
        data-testid="final-review-sheet"
      >
        <SheetHeader>
          <SheetTitle>Review your price and details</SheetTitle>
          <SheetDescription>
            Confirm the details below. The exact record you see here is saved
            with your order and echoed in your confirmation email.
          </SheetDescription>
        </SheetHeader>
        {body}
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
