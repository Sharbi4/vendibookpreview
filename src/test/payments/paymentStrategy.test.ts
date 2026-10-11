import { describe, expect, it } from 'vitest';

import {
  AUTHORIZATION_HONOR_DAYS,
  AUTHORIZATION_MAX_DAYS,
  DAY_MS,
  determinePaymentStrategy,
  isAuthorizationCapturable,
} from '../../../supabase/functions/_shared/payments/paymentStrategy';

const NOW = new Date('2026-03-01T12:00:00.000Z');
const inDays = (d: number) => new Date(NOW.getTime() + d * DAY_MS).toISOString();

describe('determinePaymentStrategy — sales', () => {
  it('authorizes (temporary hold) while the seller has not accepted', () => {
    const d = determinePaymentStrategy({
      mode: 'sale',
      grossCents: 2_500_00,
      requiresSellerAcceptance: true,
      now: NOW,
    });
    expect(d.strategy).toBe('authorize_then_capture');
    expect(d.intent).toBe('AUTHORIZE');
    expect(d.authorizeCents).toBe(2_500_00);
    expect(d.captureNowCents).toBe(0);
    expect(d.buyerMessage).toMatch(/temporary hold/i);
    expect(d.buyerMessage).not.toMatch(/escrow/i);
  });

  it('keeps the hold comfortably inside PayPal limits', () => {
    const d = determinePaymentStrategy({
      mode: 'sale',
      grossCents: 100_00,
      requiresSellerAcceptance: true,
      now: NOW,
    });
    const expiry = new Date(d.authorizationExpiresAt!).getTime();
    const honor = new Date(d.honorPeriodEndsAt!).getTime();
    expect(expiry - NOW.getTime()).toBeLessThanOrEqual(AUTHORIZATION_MAX_DAYS * DAY_MS);
    expect(honor - NOW.getTime()).toBe(AUTHORIZATION_HONOR_DAYS * DAY_MS);
  });

  it('captures immediately when the seller already confirmed', () => {
    const d = determinePaymentStrategy({
      mode: 'sale',
      grossCents: 900_00,
      requiresSellerAcceptance: false,
      now: NOW,
    });
    expect(d.strategy).toBe('immediate_capture');
    expect(d.intent).toBe('CAPTURE');
    expect(d.captureNowCents).toBe(900_00);
  });
});

describe('determinePaymentStrategy — rentals', () => {
  it('never holds funds before the host decides on a request to book', () => {
    const d = determinePaymentStrategy({
      mode: 'rent',
      grossCents: 500_00,
      instantBook: false,
      hostApproved: null,
      bookingStartAt: inDays(4),
      now: NOW,
    });
    expect(d.strategy).toBe('awaiting_host_approval');
    expect(d.intent).toBe('NONE');
    expect(d.blocked).toBe(true);
    expect(d.authorizeCents).toBe(0);
    expect(d.captureNowCents).toBe(0);
  });

  it('authorizes an instant book that starts soon', () => {
    const d = determinePaymentStrategy({
      mode: 'rent',
      grossCents: 500_00,
      instantBook: true,
      bookingStartAt: inDays(4),
      now: NOW,
    });
    expect(d.strategy).toBe('authorize_then_capture');
    expect(d.intent).toBe('AUTHORIZE');
    expect(d.authorizeCents).toBe(500_00);
  });

  it('authorizes once the host approves a request to book', () => {
    const d = determinePaymentStrategy({
      mode: 'rent',
      grossCents: 500_00,
      instantBook: false,
      hostApproved: true,
      bookingStartAt: inDays(2),
      now: NOW,
    });
    expect(d.intent).toBe('AUTHORIZE');
  });

  it('takes the reservation deposit now and defers the balance on long lead', () => {
    const d = determinePaymentStrategy({
      mode: 'rent',
      grossCents: 1_000_00,
      reservationDepositCents: 200_00,
      instantBook: true,
      bookingStartAt: inDays(60),
      now: NOW,
    });
    expect(d.strategy).toBe('deposit_now_balance_later');
    expect(d.captureNowCents).toBe(200_00);
    expect(d.balanceDueCents).toBe(800_00);
    expect(new Date(d.balanceDueAt!).getTime()).toBeGreaterThan(NOW.getTime());
    expect(new Date(d.balanceDueAt!).getTime()).toBeLessThan(new Date(inDays(60)).getTime());
  });

  it('does not place a multi-month hold when no deposit is configured', () => {
    const d = determinePaymentStrategy({
      mode: 'rent',
      grossCents: 1_000_00,
      instantBook: true,
      bookingStartAt: inDays(90),
      now: NOW,
    });
    expect(d.strategy).toBe('immediate_capture');
    expect(d.authorizationExpiresAt).toBeNull();
  });

  it('keeps the refundable security deposit separate from the charge', () => {
    const d = determinePaymentStrategy({
      mode: 'rent',
      grossCents: 400_00,
      securityDepositCents: 250_00,
      instantBook: true,
      bookingStartAt: inDays(1),
      now: NOW,
    });
    expect(d.authorizeCents).toBe(400_00);
    expect(d.securityDepositCents).toBe(250_00);
  });
});

describe('determinePaymentStrategy — gates', () => {
  it('bypasses PayPal entirely for pay in person', () => {
    const d = determinePaymentStrategy({
      mode: 'sale',
      grossCents: 3_000_00,
      paymentMethod: 'in_person',
      now: NOW,
    });
    expect(d.strategy).toBe('pay_in_person');
    expect(d.intent).toBe('NONE');
    expect(d.blocked).toBe(false);
  });

  it('blocks any money movement while a required document is outstanding', () => {
    const d = determinePaymentStrategy({
      mode: 'rent',
      grossCents: 300_00,
      instantBook: true,
      bookingStartAt: inDays(2),
      unmetPreBookingRequirements: ['commercial_liability_insurance'],
      now: NOW,
    });
    expect(d.strategy).toBe('blocked_pending_requirements');
    expect(d.blocked).toBe(true);
    expect(d.intent).toBe('NONE');
  });

  it('never holds funds on a declined request', () => {
    const d = determinePaymentStrategy({
      mode: 'rent',
      grossCents: 300_00,
      hostDeclined: true,
      bookingStartAt: inDays(2),
      now: NOW,
    });
    expect(d.strategy).toBe('awaiting_host_approval');
    expect(d.blocked).toBe(true);
  });

  it('is deterministic for identical inputs', () => {
    const ctx = {
      mode: 'sale' as const,
      grossCents: 1_234_56,
      requiresSellerAcceptance: true,
      now: NOW,
    };
    expect(determinePaymentStrategy(ctx)).toEqual(determinePaymentStrategy(ctx));
  });
});

describe('isAuthorizationCapturable', () => {
  it('accepts a live hold inside its window', () => {
    expect(
      isAuthorizationCapturable({
        authorizationStatus: 'CREATED',
        expiresAt: inDays(5),
        now: NOW,
      }),
    ).toBe(true);
  });

  it('rejects an expired hold', () => {
    expect(
      isAuthorizationCapturable({
        authorizationStatus: 'CREATED',
        expiresAt: inDays(-1),
        now: NOW,
      }),
    ).toBe(false);
  });

  it('rejects voided, expired and captured holds', () => {
    for (const status of ['VOIDED', 'EXPIRED', 'DENIED', 'CAPTURED']) {
      expect(isAuthorizationCapturable({ authorizationStatus: status, now: NOW })).toBe(false);
    }
  });
});
