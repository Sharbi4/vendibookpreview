/**
 * Pure, dependency-free order presentation + next-action logic.
 *
 * Shared by the `get-order-detail` edge function (source of truth) and the
 * frontend order pages, so buyer-facing status copy can never drift between
 * the server and the browser. No Deno / no Supabase imports on purpose —
 * this file is unit-tested from vitest.
 */

// ------------------------------------------------------------- statuses

export type BuyerPaymentStatus =
  | 'payment_pending'
  | 'payment_approved'
  | 'payment_processing'
  | 'payment_completed'
  | 'payment_failed'
  | 'payment_requires_review'
  | 'partially_refunded'
  | 'fully_refunded'
  | 'disputed'
  | 'cancelled';

export interface PaymentPresentation {
  code: BuyerPaymentStatus;
  label: string;
  description: string;
  tone: 'positive' | 'pending' | 'warning' | 'critical' | 'neutral';
}

const PRESENTATION: Record<BuyerPaymentStatus, Omit<PaymentPresentation, 'code'>> = {
  payment_pending: {
    label: 'Payment pending',
    description: 'We are waiting for PayPal to confirm this payment. You do not need to pay again.',
    tone: 'pending',
  },
  payment_approved: {
    label: 'Payment approved',
    description: 'You approved this payment in PayPal. We are finalizing it now.',
    tone: 'pending',
  },
  payment_processing: {
    label: 'Payment processing',
    description: 'PayPal is still confirming this transaction. You do not need to submit another payment.',
    tone: 'pending',
  },
  payment_completed: {
    label: 'Payment completed',
    description: 'Your payment was successfully processed through PayPal.',
    tone: 'positive',
  },
  payment_failed: {
    label: 'Payment failed',
    description: 'Your payment could not be completed. You may retry without recreating your order.',
    tone: 'critical',
  },
  payment_requires_review: {
    label: 'Payment requires review',
    description: 'Our team is reviewing this transaction. No further action is needed from you right now.',
    tone: 'warning',
  },
  partially_refunded: {
    label: 'Partially refunded',
    description: 'Part of this payment has been refunded to your original PayPal payment method.',
    tone: 'neutral',
  },
  fully_refunded: {
    label: 'Fully refunded',
    description: 'This payment has been refunded in full to your original PayPal payment method.',
    tone: 'neutral',
  },
  disputed: {
    label: 'Disputed',
    description: 'A dispute is open on this transaction. Our team will follow up with next steps.',
    tone: 'warning',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'This order was cancelled and no payment was taken.',
    tone: 'neutral',
  },
};

export interface PaymentStateInput {
  paymentStatus?: string | null;
  internalStatus?: string | null;
  disputeStatus?: string | null;
  refundedCents?: number | null;
  grossAmountCents?: number | null;
}

/** Maps provider + internal state onto one clear buyer-facing status. */
export function presentPaymentStatus(input: PaymentStateInput): PaymentPresentation {
  const code = resolvePaymentStatusCode(input);
  return { code, ...PRESENTATION[code] };
}

function resolvePaymentStatusCode(input: PaymentStateInput): BuyerPaymentStatus {
  const dispute = (input.disputeStatus ?? '').toLowerCase();
  if (dispute && !['none', 'resolved', 'closed'].includes(dispute)) return 'disputed';

  const refunded = input.refundedCents ?? 0;
  const gross = input.grossAmountCents ?? 0;
  if (refunded > 0) {
    return refunded >= gross && gross > 0 ? 'fully_refunded' : 'partially_refunded';
  }

  if ((input.internalStatus ?? '') === 'needs_review') return 'payment_requires_review';

  switch ((input.paymentStatus ?? '').toLowerCase()) {
    case 'completed':
      return 'payment_completed';
    case 'approved':
      return 'payment_approved';
    case 'pending':
      return 'payment_processing';
    case 'created':
      return 'payment_pending';
    case 'declined':
    case 'failed':
      return 'payment_failed';
    case 'refunded':
      return 'fully_refunded';
    case 'partially_refunded':
      return 'partially_refunded';
    case 'reversed':
      return 'disputed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'payment_pending';
  }
}

// ---------------------------------------------------------- fulfillment

export type FulfillmentType =
  | 'rental_pickup'
  | 'rental_delivery'
  | 'equipment_pickup'
  | 'equipment_delivery'
  | 'shipping'
  | 'digital_delivery'
  | 'membership_activation'
  | 'subscription_activation'
  | 'manual_coordination';

export type OrderTransactionType =
  | 'rental'
  | 'equipment_sale'
  | 'product_purchase'
  | 'membership'
  | 'subscription'
  | 'listing_addon';

export const TRANSACTION_TYPE_LABEL: Record<OrderTransactionType, string> = {
  rental: 'Rental',
  equipment_sale: 'Equipment sale',
  product_purchase: 'Product purchase',
  membership: 'Membership',
  subscription: 'Subscription',
  listing_addon: 'Listing add-on',
};

export function normalizeTransactionType(raw?: string | null): OrderTransactionType {
  switch ((raw ?? '').toLowerCase()) {
    case 'rental':
    case 'booking':
      return 'rental';
    case 'sale':
    case 'equipment_sale':
      return 'equipment_sale';
    case 'membership':
      return 'membership';
    case 'subscription':
      return 'subscription';
    case 'listing_addon':
    case 'listing_upgrade':
    case 'promotion':
      return 'listing_addon';
    default:
      return 'product_purchase';
  }
}

export function inferFulfillmentType(
  transactionType: OrderTransactionType,
  rawFulfillment?: string | null,
): FulfillmentType {
  const raw = (rawFulfillment ?? '').toLowerCase();
  if (
    [
      'rental_pickup', 'rental_delivery', 'equipment_pickup', 'equipment_delivery',
      'shipping', 'digital_delivery', 'membership_activation',
      'subscription_activation', 'manual_coordination',
    ].includes(raw)
  ) {
    return raw as FulfillmentType;
  }

  const isDelivery = raw === 'delivery' || raw === 'freight';
  const isShipping = raw === 'shipping';

  switch (transactionType) {
    case 'rental':
      return isDelivery ? 'rental_delivery' : 'rental_pickup';
    case 'equipment_sale':
      if (isShipping) return 'shipping';
      return isDelivery ? 'equipment_delivery' : 'equipment_pickup';
    case 'membership':
      return 'membership_activation';
    case 'subscription':
      return 'subscription_activation';
    case 'listing_addon':
      return 'digital_delivery';
    default:
      return raw ? 'manual_coordination' : 'digital_delivery';
  }
}

export const FULFILLMENT_LABEL: Record<FulfillmentType, string> = {
  rental_pickup: 'Rental pickup',
  rental_delivery: 'Rental delivery',
  equipment_pickup: 'Equipment pickup',
  equipment_delivery: 'Equipment delivery',
  shipping: 'Shipping',
  digital_delivery: 'Digital delivery',
  membership_activation: 'Membership activation',
  subscription_activation: 'Subscription activation',
  manual_coordination: 'Coordinated with the seller',
};

// -------------------------------------------------------- next actions

export type NextActionCode =
  | 'complete_identity_verification'
  | 'sign_rental_agreement'
  | 'upload_required_document'
  | 'contact_seller'
  | 'schedule_pickup'
  | 'confirm_delivery'
  | 'retry_payment'
  | 'wait_for_payment_confirmation'
  | 'review_order_details'
  | 'download_purchase'
  | 'manage_subscription'
  | 'contact_support'
  | 'no_action_required';

export interface NextAction {
  next_action_code: NextActionCode;
  next_action_title: string;
  next_action_description: string;
  next_action_url: string | null;
  next_action_priority: number;
}

export interface NextActionContext {
  orderId: string;
  paymentStatus: BuyerPaymentStatus;
  transactionType: OrderTransactionType;
  fulfillmentType: FulfillmentType;
  fulfillmentStatus?: string | null;
  agreementSigned?: boolean;
  agreementRequired?: boolean;
  documentsOutstanding?: number;
  identityVerificationRequired?: boolean;
  identityVerified?: boolean;
  pickupScheduled?: boolean;
  deliveryConfirmed?: boolean;
  subscriptionActive?: boolean;
  orderCompleted?: boolean;
}

/**
 * Server-driven next action. Priority 1 = most urgent; the caller renders the
 * single highest-priority action at the top of the order page.
 */
export function computeNextAction(ctx: NextActionContext): NextAction {
  const orderUrl = `/orders/${ctx.orderId}`;

  if (ctx.paymentStatus === 'payment_failed') {
    return action('retry_payment', 'Retry your payment', 'PayPal could not complete this payment. Your order is still saved — choose a payment method and try again.', `${orderUrl}/payment`, 1);
  }
  if (ctx.paymentStatus === 'disputed' || ctx.paymentStatus === 'payment_requires_review') {
    return action('contact_support', 'Our team is reviewing this order', 'No action is needed right now. Contact support if you have questions about this transaction.', '/help', 2);
  }
  if (['payment_pending', 'payment_processing', 'payment_approved'].includes(ctx.paymentStatus)) {
    return action('wait_for_payment_confirmation', 'Waiting for PayPal confirmation', 'PayPal is still confirming this transaction. You do not need to submit another payment.', orderUrl, 2);
  }
  if (ctx.paymentStatus === 'fully_refunded' || ctx.paymentStatus === 'cancelled') {
    return action('review_order_details', 'Review your order details', 'This order is closed. The full record is kept here for your reference.', orderUrl, 9);
  }

  // Payment is good from here on.
  if (ctx.identityVerificationRequired && !ctx.identityVerified) {
    return action('complete_identity_verification', 'Complete identity verification', 'Verify your identity so the host can release this rental to you.', '/verify-identity', 3);
  }
  if (ctx.agreementRequired && !ctx.agreementSigned) {
    return action('sign_rental_agreement', 'Sign your rental agreement', 'Your payment went through. Sign the rental agreement to lock in your dates.', orderUrl, 3);
  }
  if ((ctx.documentsOutstanding ?? 0) > 0) {
    return action('upload_required_document', 'Upload your required documents', `You still have ${ctx.documentsOutstanding} document(s) to upload before this can move forward.`, orderUrl, 4);
  }

  switch (ctx.fulfillmentType) {
    case 'subscription_activation':
    case 'membership_activation':
      return ctx.subscriptionActive
        ? action('manage_subscription', 'Explore your membership benefits', 'Your membership is active. Manage your plan, billing interval, or cancellation at any time.', '/account/subscription', 7)
        : action('wait_for_payment_confirmation', 'Activating your membership', 'We are activating your membership now. This usually takes less than a minute.', orderUrl, 3);
    case 'digital_delivery':
      return action('download_purchase', 'Access your purchase', 'Your purchase is ready. Open it from your order details whenever you need it.', orderUrl, 6);
    case 'rental_pickup':
    case 'equipment_pickup':
      if (!ctx.pickupScheduled) {
        return action('schedule_pickup', 'Schedule your pickup', 'Coordinate a pickup date and time with the seller so they can have everything ready.', orderUrl, 4);
      }
      break;
    case 'rental_delivery':
    case 'equipment_delivery':
    case 'shipping':
      if (!ctx.deliveryConfirmed) {
        return action('confirm_delivery', 'Confirm delivery when it arrives', 'Once your delivery arrives, confirm it here so the order can be completed.', orderUrl, 5);
      }
      break;
    case 'manual_coordination':
      return action('contact_seller', 'Coordinate with the seller', 'Message the seller to finalize the remaining details of this order.', '/messages', 5);
  }

  if (ctx.orderCompleted) {
    return action('no_action_required', 'No action required', 'This order is complete. Everything is on file here if you need it later.', orderUrl, 10);
  }
  return action('review_order_details', 'Review your order details', 'Everything is on track. Review your order details for pickup, delivery, or coordination information.', orderUrl, 8);
}

function action(
  code: NextActionCode,
  title: string,
  description: string,
  url: string | null,
  priority: number,
): NextAction {
  return {
    next_action_code: code,
    next_action_title: title,
    next_action_description: description,
    next_action_url: url,
    next_action_priority: priority,
  };
}

// ------------------------------------------------- capture failure class

export type FailureCategory = 'retryable' | 'terminal';

export interface FailureClassification {
  category: FailureCategory;
  code: string;
  /** Safe to render to the buyer. Never contains provider payloads. */
  safeMessage: string;
  attemptStatus: 'capture_failed_retryable' | 'capture_failed_terminal';
}

const RETRYABLE_MESSAGE =
  "We couldn't confirm the payment yet. Your order is still saved. Please retry or wait while we check the transaction status.";
const TERMINAL_MESSAGE =
  'PayPal could not complete this payment. Your order is still saved. Choose a payment method and try again.';

const TERMINAL_ISSUES = new Set([
  'INSTRUMENT_DECLINED',
  'PAYER_CANNOT_PAY',
  'PAYER_ACCOUNT_RESTRICTED',
  'PAYER_ACCOUNT_LOCKED_OR_CLOSED',
  'ORDER_NOT_APPROVED',
  'ORDER_ALREADY_CAPTURED',
  'ORDER_EXPIRED',
  'AGREEMENT_ALREADY_CANCELLED',
  'TRANSACTION_REFUSED',
  'CURRENCY_NOT_SUPPORTED',
  'AMOUNT_MISMATCH',
  'INVALID_RESOURCE_ID',
  'PERMISSION_DENIED',
  'MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED',
]);

/**
 * Splits a capture failure into "retry the same order" versus
 * "the buyer must choose another funding source".
 */
export function classifyCaptureFailure(opts: {
  issue?: string | null;
  status?: number | null;
  networkError?: boolean;
  timeout?: boolean;
}): FailureClassification {
  const issue = (opts.issue ?? '').toUpperCase();

  if (opts.timeout || opts.networkError) {
    return {
      category: 'retryable',
      code: opts.timeout ? 'capture_timeout' : 'network_error',
      safeMessage: RETRYABLE_MESSAGE,
      attemptStatus: 'capture_failed_retryable',
    };
  }
  if (issue && TERMINAL_ISSUES.has(issue)) {
    return {
      category: 'terminal',
      code: issue.toLowerCase(),
      safeMessage: TERMINAL_MESSAGE,
      attemptStatus: 'capture_failed_terminal',
    };
  }
  if ((opts.status ?? 0) >= 500 || opts.status === 429) {
    return {
      category: 'retryable',
      code: 'provider_unavailable',
      safeMessage: RETRYABLE_MESSAGE,
      attemptStatus: 'capture_failed_retryable',
    };
  }
  if ((opts.status ?? 0) >= 400) {
    return {
      category: 'terminal',
      code: issue ? issue.toLowerCase() : 'payment_declined',
      safeMessage: TERMINAL_MESSAGE,
      attemptStatus: 'capture_failed_terminal',
    };
  }
  return {
    category: 'retryable',
    code: 'unconfirmed',
    safeMessage: RETRYABLE_MESSAGE,
    attemptStatus: 'capture_failed_retryable',
  };
}

/** Vendibook-facing order status derived from payment + fulfillment. */
export function deriveOrderStatus(
  payment: BuyerPaymentStatus,
  fulfillmentStatus?: string | null,
): { code: string; label: string } {
  if (payment === 'cancelled') return { code: 'cancelled', label: 'Cancelled' };
  if (payment === 'fully_refunded') return { code: 'refunded', label: 'Refunded' };
  if (payment === 'disputed') return { code: 'disputed', label: 'Disputed' };
  if (payment === 'payment_failed') return { code: 'payment_required', label: 'Payment required' };
  if (payment !== 'payment_completed' && payment !== 'partially_refunded') {
    return { code: 'awaiting_payment', label: 'Awaiting payment' };
  }
  const f = (fulfillmentStatus ?? '').toLowerCase();
  if (['completed', 'delivered', 'picked_up', 'fulfilled'].includes(f)) {
    return { code: 'completed', label: 'Completed' };
  }
  if (['scheduled', 'in_transit', 'shipped', 'processing'].includes(f)) {
    return { code: 'in_progress', label: 'In progress' };
  }
  return { code: 'confirmed', label: 'Confirmed' };
}
