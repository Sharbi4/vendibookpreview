import { describe, expect, it } from 'vitest';
import {
  friendlySquareError,
  mapSquarePaymentStatus,
  refundAppFeeShare,
  splitRentalCharge,
  squareIdempotencyKey,
  squarePaymentFacts,
} from '../../../supabase/functions/_shared/squareRentalMath';

describe('splitRentalCharge', () => {
  it('pays the host exactly their proceeds and sends the rest as the app fee', () => {
    // $1,000 rental: renter pays $1,129 + $80 tax + $500 deposit; host nets $871.
    const split = splitRentalCharge({ grossCents: 170_900, sellerProceedsCents: 87_100 });
    expect(split.sellerCents).toBe(87_100);
    expect(split.appFeeCents).toBe(83_800);
    expect(split.sellerCents + split.appFeeCents).toBe(split.grossCents);
  });

  it('refuses an app fee above Square’s 90% cap', () => {
    expect(() => splitRentalCharge({ grossCents: 100_000, sellerProceedsCents: 5_000 })).toThrow('app_fee_too_large');
  });

  it('rejects impossible splits', () => {
    expect(() => splitRentalCharge({ grossCents: 0, sellerProceedsCents: 0 })).toThrow('invalid_amount');
    expect(() => splitRentalCharge({ grossCents: 1000, sellerProceedsCents: 2000 })).toThrow('invalid_split');
  });
});

describe('refundAppFeeShare', () => {
  it('refunds the app fee in proportion for a full refund', () => {
    expect(refundAppFeeShare({ refundCents: 170_900, grossCents: 170_900, appFeeCents: 83_800 })).toBe(83_800);
  });
  it('funds a deposit refund entirely from the app fee', () => {
    expect(refundAppFeeShare({ refundCents: 50_000, grossCents: 170_900, appFeeCents: 83_800, depositOnly: true })).toBe(50_000);
  });
  it('never refunds more app fee than remains', () => {
    expect(refundAppFeeShare({ refundCents: 50_000, grossCents: 170_900, appFeeCents: 83_800, appFeeAlreadyRefundedCents: 60_000, depositOnly: true })).toBe(23_800);
  });
});

describe('Square helpers', () => {
  it('keeps idempotency keys within 45 chars and deterministic', () => {
    const long = squareIdempotencyKey('vb', 'VB-RENT-20261005-ABCDEFGHIJKLMNOP', '12345678-aaaa');
    expect(long.length).toBeLessThanOrEqual(45);
    expect(long).toBe(squareIdempotencyKey('vb', 'VB-RENT-20261005-ABCDEFGHIJKLMNOP', '12345678-aaaa'));
    expect(long).not.toBe(squareIdempotencyKey('vb', 'VB-RENT-20261005-ABCDEFGHIJKLMNOP', '12345678-bbbb'));
    expect(squareIdempotencyKey('a', 'b')).toBe('a:b');
  });

  it('maps Square statuses to payment record statuses', () => {
    expect(mapSquarePaymentStatus('COMPLETED')).toBe('completed');
    expect(mapSquarePaymentStatus('FAILED')).toBe('failed');
    expect(mapSquarePaymentStatus('CANCELED')).toBe('cancelled');
    expect(mapSquarePaymentStatus('PENDING')).toBe('pending');
  });

  it('gives renters plain-language decline copy', () => {
    expect(friendlySquareError('CVV_FAILURE')).toMatch(/security code/);
    expect(friendlySquareError('SOMETHING_NEW')).toMatch(/nothing was charged/);
  });

  it('extracts payment facts without card numbers', () => {
    const facts = squarePaymentFacts({
      id: 'pay_1', status: 'COMPLETED', amount_money: { amount: 1234, currency: 'USD' },
      card_details: { card: { card_brand: 'VISA', last_4: '1111' } }, order_id: 'ord_1', receipt_url: 'https://squareup.com/r/1',
    });
    expect(facts).toMatchObject({ provider: 'square', captureId: 'pay_1', amountCents: 1234, paymentSource: 'card:visa', orderId: 'ord_1' });
    expect(JSON.stringify(facts)).not.toContain('1111');
  });
});
