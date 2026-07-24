import { describe, it, expect } from 'vitest';
import { canTransition, isTerminal, assertTransition, ALLOWED_TRANSITIONS } from './stateMachine';

describe('sale state machine', () => {
  it('allows canonical happy path', () => {
    expect(canTransition('pending', 'paid')).toBe(true);
    expect(canTransition('paid', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'completed')).toBe(true);
    expect(canTransition('completed', 'paid_out')).toBe(true);
  });

  it('is idempotent on same-state', () => {
    for (const s of Object.keys(ALLOWED_TRANSITIONS) as Array<keyof typeof ALLOWED_TRANSITIONS>) {
      expect(canTransition(s, s)).toBe(true);
    }
  });

  it('allows payment_failed recovery back to pending', () => {
    expect(canTransition('pending', 'payment_failed')).toBe(true);
    expect(canTransition('payment_failed', 'pending')).toBe(true);
    expect(canTransition('payment_failed', 'cancelled')).toBe(true);
  });

  it('allows payout_failed recovery', () => {
    expect(canTransition('completed', 'payout_failed')).toBe(true);
    expect(canTransition('payout_failed', 'paid_out')).toBe(true);
    expect(canTransition('payout_failed', 'completed')).toBe(true);
  });

  it('rejects illegal jumps', () => {
    expect(canTransition('pending', 'completed')).toBe(false);
    expect(canTransition('pending', 'paid_out')).toBe(false);
    expect(canTransition('cancelled', 'paid')).toBe(false);
    expect(canTransition('refunded', 'paid')).toBe(false);
    expect(canTransition('paid_out', 'refunded')).toBe(false);
  });

  it('flags terminals', () => {
    expect(isTerminal('paid_out')).toBe(true);
    expect(isTerminal('refunded')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('paid')).toBe(false);
  });

  it('assertTransition throws on illegal', () => {
    expect(() => assertTransition('pending', 'paid_out')).toThrow(/Illegal/);
    expect(() => assertTransition('pending', 'paid')).not.toThrow();
  });

  it('supports dispute paths', () => {
    expect(canTransition('paid', 'disputed')).toBe(true);
    expect(canTransition('disputed', 'refunded')).toBe(true);
    expect(canTransition('disputed', 'completed')).toBe(true);
  });
});
