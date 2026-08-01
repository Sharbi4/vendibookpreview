import { describe, it, expect } from 'vitest';
import {
  classifyCaptureFailure,
  computeNextAction,
  deriveOrderStatus,
  inferFulfillmentType,
  presentPaymentStatus,
} from '../../../supabase/functions/_shared/orders/orderStatus';

describe('presentPaymentStatus', () => {
  it('maps completed captures', () => {
    expect(presentPaymentStatus({ paymentStatus: 'completed' }).code).toBe('payment_completed');
  });
  it('prefers refunds over the raw status', () => {
    expect(presentPaymentStatus({ paymentStatus: 'completed', refundedCents: 500, grossAmountCents: 1000 }).code)
      .toBe('partially_refunded');
    expect(presentPaymentStatus({ paymentStatus: 'completed', refundedCents: 1000, grossAmountCents: 1000 }).code)
      .toBe('fully_refunded');
  });
  it('flags review and disputes', () => {
    expect(presentPaymentStatus({ paymentStatus: 'completed', internalStatus: 'needs_review' }).code)
      .toBe('payment_requires_review');
    expect(presentPaymentStatus({ paymentStatus: 'completed', disputeStatus: 'open' }).code).toBe('disputed');
  });
  it('always carries a human explanation', () => {
    expect(presentPaymentStatus({ paymentStatus: 'pending' }).description).toMatch(/another payment/i);
  });
});

describe('classifyCaptureFailure', () => {
  it('treats timeouts and 5xx as retryable', () => {
    expect(classifyCaptureFailure({ timeout: true }).category).toBe('retryable');
    expect(classifyCaptureFailure({ status: 503 }).category).toBe('retryable');
  });
  it('treats declines and expiry as terminal', () => {
    expect(classifyCaptureFailure({ issue: 'INSTRUMENT_DECLINED', status: 422 }).category).toBe('terminal');
    expect(classifyCaptureFailure({ issue: 'ORDER_EXPIRED', status: 422 }).attemptStatus)
      .toBe('capture_failed_terminal');
  });
  it('never leaks provider detail into the safe message', () => {
    expect(classifyCaptureFailure({ issue: 'INSTRUMENT_DECLINED', status: 422 }).safeMessage)
      .not.toMatch(/INSTRUMENT/);
  });
});

describe('computeNextAction', () => {
  const base = { orderId: 'o1', transactionType: 'rental' as const, fulfillmentType: 'rental_pickup' as const };

  it('asks the buyer to retry after a failure', () => {
    expect(computeNextAction({ ...base, paymentStatus: 'payment_failed' }).next_action_code)
      .toBe('retry_payment');
  });
  it('waits instead of re-charging while processing', () => {
    expect(computeNextAction({ ...base, paymentStatus: 'payment_processing' }).next_action_code)
      .toBe('wait_for_payment_confirmation');
  });
  it('requests the agreement once payment clears', () => {
    expect(computeNextAction({
      ...base, paymentStatus: 'payment_completed', agreementRequired: true, agreementSigned: false,
    }).next_action_code).toBe('sign_rental_agreement');
  });
  it('asks to schedule pickup when nothing else is outstanding', () => {
    expect(computeNextAction({
      ...base, paymentStatus: 'payment_completed', agreementRequired: false, pickupScheduled: false,
    }).next_action_code).toBe('schedule_pickup');
  });
  it('points active members at their membership', () => {
    expect(computeNextAction({
      orderId: 'o2', paymentStatus: 'payment_completed', transactionType: 'subscription',
      fulfillmentType: 'subscription_activation', subscriptionActive: true,
    }).next_action_code).toBe('manage_subscription');
  });
  it('returns no_action_required for a completed order', () => {
    expect(computeNextAction({
      ...base, paymentStatus: 'payment_completed', agreementRequired: false,
      pickupScheduled: true, orderCompleted: true,
    }).next_action_code).toBe('no_action_required');
  });
});

describe('fulfillment + order status', () => {
  it('infers fulfillment from transaction shape', () => {
    expect(inferFulfillmentType('rental', 'delivery')).toBe('rental_delivery');
    expect(inferFulfillmentType('equipment_sale', 'pickup')).toBe('equipment_pickup');
    expect(inferFulfillmentType('membership', null)).toBe('membership_activation');
  });
  it('derives an order status from payment and fulfillment', () => {
    expect(deriveOrderStatus('payment_pending').code).toBe('awaiting_payment');
    expect(deriveOrderStatus('payment_completed', 'delivered').code).toBe('completed');
    expect(deriveOrderStatus('payment_failed').code).toBe('payment_required');
  });
});
