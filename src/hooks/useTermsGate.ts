/**
 * useTermsGate — intercepts a submit action with FinalReviewSheet.
 *
 * Flow:
 *   1. Caller builds a `TransactionTerms` object via `buildTerms(...)`.
 *   2. `prepare()` posts that snapshot to `create-transaction-terms-draft`
 *      to persist it as a `status='draft'` row and get back `terms_id`.
 *   3. On success we open FinalReviewSheet with the terms + termsId.
 *   4. Sheet's onConfirm calls the caller's `runSubmit` after
 *      `record_user_consent` + `acknowledge-terms` land server-side.
 *
 * The caller passes `terms_id` on to `create-checkout`, `create-cash-sale`,
 * or `create-booking-hold` so those money-moving functions flip the draft
 * to `status='active'` instead of writing a fresh terms row (which would
 * drop the acknowledgement stamp).
 *
 * Why the client owns the snapshot build: buildTerms is a pure resolver
 * that already runs client-side to render TransactionSummary /
 * PriceDetailsModal / FinalReviewSheet from the SAME object. Persisting
 * that exact object is the whole point of transaction_terms — the row
 * captures what the user saw. The downstream money-moving functions
 * independently re-compute real charges from `listings`, so an inflated
 * client snapshot cannot move extra money.
 */
import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { TransactionTerms } from '@/lib/transactionTerms';

export interface UseTermsGateResult {
  open: boolean;
  setOpen: (v: boolean) => void;
  terms: TransactionTerms | null;
  termsId: string | null;
  /** Preparing = draft-terms round-trip in flight. */
  preparing: boolean;
  /** Ask the sheet to open with a freshly-persisted draft. */
  prepare: (terms: TransactionTerms, opts?: { bookingId?: string | null }) => Promise<boolean>;
  /** Close + reset (call after the caller's runSubmit resolves/rejects). */
  reset: () => void;
}

export function useTermsGate(): UseTermsGateResult {
  const [open, setOpen] = React.useState(false);
  const [terms, setTerms] = React.useState<TransactionTerms | null>(null);
  const [termsId, setTermsId] = React.useState<string | null>(null);
  const [preparing, setPreparing] = React.useState(false);

  const reset = React.useCallback(() => {
    setOpen(false);
    setTerms(null);
    setTermsId(null);
  }, []);

  const prepare = React.useCallback(
    async (t: TransactionTerms, opts?: { bookingId?: string | null }): Promise<boolean> => {
      if (preparing) return false;
      setPreparing(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          'create-transaction-terms-draft',
          {
            body: {
              listing_id: t.listing.id,
              mode: t.mode,
              payment_method: t.paymentMethod,
              snapshot: t,
              total_cents: t.pricing.totalCents,
              subtotal_cents: t.pricing.subtotalCents,
              deposit_cents: t.pricing.depositCents,
              commission_cents: t.pricing.commissionCents,
              renter_fee_cents: t.pricing.renterFeeCents,
              terms_version: t.termsVersion,
              booking_id: opts?.bookingId ?? null,
            },
          },
        );
        if (error || !data?.terms_id) {
          const msg =
            (error as { message?: string } | null)?.message ||
            (data as { error?: string } | null)?.error ||
            'Could not prepare terms for review';
          toast({ title: 'Please try again', description: msg, variant: 'destructive' });
          return false;
        }
        setTerms(t);
        setTermsId(data.terms_id as string);
        setOpen(true);
        return true;
      } finally {
        setPreparing(false);
      }
    },
    [preparing],
  );

  return { open, setOpen, terms, termsId, preparing, prepare, reset };
}
