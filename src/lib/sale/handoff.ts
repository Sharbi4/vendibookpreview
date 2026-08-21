/**
 * Sale post-purchase / handoff model.
 *
 * Pure derivation over the existing `sale_transactions` row — no new statuses.
 * `status` remains the source of truth for payment + confirmation; the free-form
 * `shipping_status` column carries the fulfillment milestone the seller sets
 * (`ready_for_pickup` | `shipped` | `in_transit` | `delivered`).
 *
 * Copy rules: never say escrow / payment protection, and never promise an
 * automatic or timed payout for ordinary online sales.
 */

export type HandoffRole = 'buyer' | 'seller';

export type HandoffMethod = 'pickup' | 'delivery' | 'freight';

export interface SaleTxLike {
  id: string;
  status?: string | null;
  fulfillment_type?: string | null;
  shipping_status?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  buyer_confirmed_at?: string | null;
  seller_confirmed_at?: string | null;
  payout_completed_at?: string | null;
  payment_intent_id?: string | null;
  delivery_address?: string | null;
  freight_cost?: number | string | null;
  freight_payment_status?: string | null;
  delivery_fee?: number | string | null;
}

export function handoffMethod(tx: SaleTxLike): HandoffMethod {
  const f = String(tx.fulfillment_type ?? '').toLowerCase();
  if (f.includes('freight')) return 'freight';
  if (f.includes('delivery') || f.includes('ship')) return 'delivery';
  if (f.includes('pickup') || f.includes('on_site')) return 'pickup';
  return tx.delivery_address ? 'delivery' : 'pickup';
}

export const METHOD_LABEL: Record<HandoffMethod, string> = {
  pickup: 'Buyer pickup',
  delivery: 'Delivery',
  freight: 'Vendibook Freight',
};

export type HandoffStage =
  | 'awaiting_payment'
  | 'paid'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'delivered'
  | 'awaiting_other_confirmation'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export function handoffStage(tx: SaleTxLike): HandoffStage {
  const s = String(tx.status ?? '');
  if (s === 'disputed') return 'disputed';
  if (s === 'refunded') return 'refunded';
  if (s === 'cancelled') return 'cancelled';
  if (s === 'completed') return 'completed';
  if (s === 'pending') return 'awaiting_payment';

  if (tx.buyer_confirmed_at || tx.seller_confirmed_at) return 'awaiting_other_confirmation';

  const ship = String(tx.shipping_status ?? '');
  if (tx.delivered_at || ship === 'delivered') return 'delivered';
  if (tx.shipped_at || ship === 'shipped' || ship === 'in_transit' || ship === 'out_for_delivery') {
    return 'in_transit';
  }
  if (ship === 'ready_for_pickup') return 'ready_for_pickup';
  return 'paid';
}

export interface StatusChip {
  label: string;
  tone: 'positive' | 'active' | 'pending' | 'critical' | 'neutral';
}

export function handoffChip(tx: SaleTxLike, role: HandoffRole): StatusChip {
  const stage = handoffStage(tx);
  const method = handoffMethod(tx);
  switch (stage) {
    case 'awaiting_payment':
      return { label: 'Awaiting payment', tone: 'pending' };
    case 'paid':
      return {
        label: method === 'pickup' ? 'Payment confirmed · arranging pickup' : 'Payment confirmed · preparing',
        tone: 'active',
      };
    case 'ready_for_pickup':
      return { label: 'Ready for pickup', tone: 'active' };
    case 'in_transit':
      return { label: 'In transit', tone: 'active' };
    case 'delivered':
      return { label: 'Delivered · confirm to close', tone: 'active' };
    case 'awaiting_other_confirmation':
      return {
        label:
          (role === 'buyer' ? tx.buyer_confirmed_at : tx.seller_confirmed_at)
            ? 'Waiting on the other party'
            : 'Your confirmation needed',
        tone: 'pending',
      };
    case 'completed':
      return { label: 'Complete', tone: 'positive' };
    case 'disputed':
      return { label: 'Under review', tone: 'critical' };
    case 'refunded':
      return { label: 'Refunded', tone: 'neutral' };
    default:
      return { label: 'Cancelled', tone: 'neutral' };
  }
}

export type HandoffActionKind =
  | 'none'
  | 'message'
  | 'mark_ready_for_pickup'
  | 'mark_shipped'
  | 'mark_delivered'
  | 'confirm';

export interface HandoffNextStep {
  title: string;
  body: string;
  action: HandoffActionKind;
  actionLabel?: string;
  waiting?: boolean;
  done?: boolean;
}

/** Exactly one primary next step per viewer. */
export function handoffNextStep(tx: SaleTxLike, role: HandoffRole): HandoffNextStep {
  const stage = handoffStage(tx);
  const method = handoffMethod(tx);
  const iConfirmed = role === 'buyer' ? !!tx.buyer_confirmed_at : !!tx.seller_confirmed_at;

  switch (stage) {
    case 'awaiting_payment':
      return role === 'buyer'
        ? { title: 'Finish your payment', body: 'This order is not confirmed until payment is received.', action: 'none' }
        : { title: 'Waiting on buyer payment', body: 'We will notify you the moment payment lands.', action: 'none', waiting: true };

    case 'paid':
      if (method === 'pickup') {
        return role === 'seller'
          ? {
              title: 'Get the item ready for pickup',
              body: 'Message the buyer with your pickup window, then mark the item ready so they know they can come.',
              action: 'mark_ready_for_pickup',
              actionLabel: 'Mark ready for pickup',
            }
          : {
              title: 'Arrange pickup with the seller',
              body: 'Message the seller to agree on a day and time. The exact pickup address is shown below.',
              action: 'message',
              actionLabel: 'Message seller',
            };
      }
      return role === 'seller'
        ? {
            title: 'Coordinate delivery with the buyer',
            body: 'Confirm the delivery details with the buyer, then mark the item as on its way once it leaves.',
            action: 'mark_shipped',
            actionLabel: 'Mark as on the way',
          }
        : {
            title: 'Delivery coordination in progress',
            body: 'The seller is arranging delivery. Message them with any access or scheduling notes.',
            action: 'message',
            actionLabel: 'Message seller',
            waiting: true,
          };

    case 'ready_for_pickup':
      return role === 'buyer'
        ? {
            title: 'Your item is ready for pickup',
            body: 'Collect the item at the address below. Confirm pickup here once you have it.',
            action: 'confirm',
            actionLabel: 'Confirm pickup',
          }
        : {
            title: 'Waiting on the buyer to collect',
            body: 'The buyer has been notified. Confirm the handoff after they collect the item.',
            action: 'confirm',
            actionLabel: 'Confirm handoff',
          };

    case 'in_transit':
      return role === 'buyer'
        ? {
            title: 'On the way',
            body: 'Confirm receipt here as soon as the item arrives and you have inspected it.',
            action: 'confirm',
            actionLabel: 'Confirm receipt',
          }
        : {
            title: 'In transit to the buyer',
            body: 'Mark it delivered once the item reaches the buyer.',
            action: 'mark_delivered',
            actionLabel: 'Mark delivered',
          };

    case 'delivered':
      return role === 'buyer'
        ? {
            title: 'Confirm you received it',
            body: 'Inspect the item, then confirm receipt to close this sale.',
            action: 'confirm',
            actionLabel: 'Confirm receipt',
          }
        : {
            title: 'Confirm the handoff',
            body: 'Confirm your side of the handoff. Both confirmations close the sale.',
            action: 'confirm',
            actionLabel: 'Confirm handoff',
          };

    case 'awaiting_other_confirmation':
      if (iConfirmed) {
        return {
          title: 'Waiting on the other party',
          body: role === 'buyer'
            ? 'You confirmed. The sale closes once the seller confirms too.'
            : 'You confirmed. The sale closes once the buyer confirms receipt.',
          action: 'none',
          waiting: true,
        };
      }
      return {
        title: role === 'buyer' ? 'Confirm you received it' : 'Confirm the handoff',
        body: 'The other party has already confirmed. Your confirmation closes this sale.',
        action: 'confirm',
        actionLabel: role === 'buyer' ? 'Confirm receipt' : 'Confirm handoff',
      };

    case 'completed':
      return role === 'seller'
        ? {
            title: 'Handoff confirmed',
            body: tx.payout_completed_at
              ? 'Your payout has been recorded as sent.'
              : 'Vendibook reviews and issues the seller payout after the required confirmation steps are complete.',
            action: 'none',
            done: true,
          }
        : { title: 'Sale complete', body: 'Nothing left to do. Reach out to support if anything comes up.', action: 'none', done: true };

    case 'disputed':
      return { title: 'Under review', body: 'Vendibook support is reviewing this sale. Watch your email for next steps.', action: 'none', waiting: true };
    case 'refunded':
      return { title: 'Refunded', body: 'This sale was refunded. No further action is needed.', action: 'none', done: true };
    default:
      return { title: 'Cancelled', body: 'This sale was cancelled.', action: 'none', done: true };
  }
}

/** Buyer can confirm only after money landed; mirrors `confirm-sale` rules. */
export function canConfirm(tx: SaleTxLike, role: HandoffRole): boolean {
  const s = String(tx.status ?? '');
  const allowed = role === 'buyer'
    ? ['pending_cash', 'paid', 'seller_confirmed']
    : ['pending_cash', 'paid', 'buyer_confirmed'];
  const already = role === 'buyer' ? !!tx.buyer_confirmed_at : !!tx.seller_confirmed_at;
  return allowed.includes(s) && !already;
}

/** Committed = money captured (or a cash sale under way). Gates detail reveal. */
export function isCommitted(tx: SaleTxLike): boolean {
  return ['pending_cash', 'paid', 'buyer_confirmed', 'seller_confirmed', 'completed', 'disputed'].includes(
    String(tx.status ?? ''),
  );
}

export const PAYOUT_COPY =
  'Vendibook reviews and issues the seller payout after the required delivery or handoff confirmation steps. Payouts are not automatic or instant.';

/**
 * Financing note. Vendibook does not store a lender status on the sale row, so
 * this only applies when the transaction is explicitly flagged as
 * financing-assisted upstream.
 */
export const FINANCING_PAYOUT_COPY =
  'For financed purchases funded through our lending partner, seller payment may be released within 24 hours after successful delivery and confirmation.';
