import { formatCents, type StatusTone } from '@/components/workspace/ui';
import { COMMERCE_STATUSES } from '../../../../supabase/functions/_shared/purchaseRequestPolicy';

/** "$1,234.50" for ledger rows, or "—" when unknown. */
export const money = (cents: number | null | undefined) => formatCents(cents, { cents: true });

/** Small row-level buttons. Rows use charcoal, never orange: one orange CTA per section. */
export const rowBtn = {
  /** Filled charcoal pill for the row's main step (Pay, Request payout, Approve). */
  ink: 'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#1C1B1A] px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#3A3734] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A] disabled:cursor-not-allowed disabled:opacity-50',
  /** Outlined pill for the secondary step. */
  outline: 'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#E2DBD0] bg-white px-3.5 text-[12.5px] font-semibold text-[#1C1B1A] transition-colors hover:border-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A] disabled:cursor-not-allowed disabled:opacity-50',
  /** Text-only step (Decline, Cancel). */
  quiet: 'inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-semibold text-[#5E5953] transition-colors hover:text-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A] disabled:cursor-not-allowed disabled:opacity-50',
} as const;

/** Seller payable status → pill. Labels match the Money center's existing wording. */
export const PAYABLE_PILL: Record<string, { label: string; tone: StatusTone }> = {
  awaiting_payment_confirmation: { label: 'Awaiting payment', tone: 'muted' },
  pending_release: { label: 'Upcoming', tone: 'neutral' },
  eligible_for_review: { label: 'Ready to request', tone: 'accent' },
  payout_approved: { label: 'Approved', tone: 'warn' },
  payout_processing: { label: 'Processing', tone: 'warn' },
  payout_completed: { label: 'Paid', tone: 'ok' },
  payout_on_hold: { label: 'On hold', tone: 'alert' },
  disputed: { label: 'Disputed', tone: 'alert' },
  reversed: { label: 'Reversed', tone: 'alert' },
  payout_failed: { label: 'Failed, support notified', tone: 'alert' },
  partially_refunded: { label: 'Partly refunded', tone: 'warn' },
  fully_refunded: { label: 'Refunded', tone: 'muted' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};

export const payablePill = (status: string) =>
  PAYABLE_PILL[status] ?? { label: status.replace(/_/g, ' '), tone: 'neutral' as StatusTone };

/** Payment-record / booking payment status → pill tone. */
export function paymentTone(status: string | null | undefined): StatusTone {
  const s = (status ?? '').toLowerCase();
  if (['completed', 'paid', 'captured', 'authorized', 'partially_captured', 'deposit_paid_balance_due'].includes(s)) return 'ok';
  if (['failed', 'declined', 'reversed', 'disputed'].includes(s)) return 'alert';
  if (['refunded', 'cancelled', 'canceled', 'authorization_voided', 'authorization_expired', 'expired'].includes(s)) return 'muted';
  if (['partially_refunded', 'pending', 'approved', 'created', 'unpaid', 'processing', 'pending_cash'].includes(s)) return 'warn';
  return 'neutral';
}

export const readable = (s: string | null | undefined) => (s ?? '').replace(/_/g, ' ');

/** Invoice / purchase-request status → pill, using the shared commerce wording. */
export function commercePill(status: string): { label: string; detail?: string; tone: StatusTone } {
  const copy = COMMERCE_STATUSES[status as keyof typeof COMMERCE_STATUSES];
  const tone: StatusTone = ['completed', 'sold'].includes(status)
    ? 'ok'
    : status === 'disputed'
      ? 'alert'
      : ['cancelled', 'expired', 'refunded', 'declined'].includes(status)
        ? 'muted'
        : status === 'issued' || status === 'revision_pending'
          ? 'accent'
          : 'warn';
  return { label: copy?.[0] ?? 'Status unavailable', detail: copy?.[1], tone };
}
