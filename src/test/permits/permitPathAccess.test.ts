import { describe, expect, it } from 'vitest';
import { resolvePermitPlus, PERMIT_PLUS_SLUG } from '@/lib/permits/permitPathAccess';

describe('PermitPath Basic vs Plus', () => {
  it('free user is Basic', () => {
    expect(resolvePermitPlus({})).toEqual({ isPlus: false, reason: 'locked' });
  });

  it('standalone Plus subscriber gets Plus', () => {
    const r = resolvePermitPlus({
      subscriptions: [{ tier: 'permit_path_plus_monthly', status: 'active' }],
    });
    expect(r).toEqual({ isPlus: true, reason: 'subscription' });
  });

  it('Vendibook Pro includes Plus without a second charge', () => {
    const r = resolvePermitPlus({ subscriptions: [{ tier: 'vendibook_pro', status: 'active' }] });
    expect(r).toEqual({ isPlus: true, reason: 'included' });
  });

  it('Pro + standalone Plus resolves without conflict', () => {
    const r = resolvePermitPlus({
      subscriptions: [
        { tier: 'vendibook_pro', status: 'active' },
        { tier: 'permit_path_plus_monthly', status: 'active' },
      ],
    });
    expect(r.isPlus).toBe(true);
  });

  it('cancel-at-period-end standalone Plus stays active until it ends', () => {
    // PayPal keeps status active through the paid period.
    expect(resolvePermitPlus({
      subscriptions: [{ tier: 'permit_path_plus_monthly', status: 'active' }],
    }).isPlus).toBe(true);
    expect(resolvePermitPlus({
      subscriptions: [{ tier: 'permit_path_plus_monthly', status: 'canceled' }],
    }).isPlus).toBe(false);
  });

  it('retired one-time purchase still grants Plus', () => {
    expect(resolvePermitPlus({ purchasedSlugs: [PERMIT_PLUS_SLUG] }).reason).toBe('purchase');
  });

  it('founding members keep free access', () => {
    expect(resolvePermitPlus({ legacyUser: true })).toEqual({
      isPlus: true,
      reason: 'grandfathered',
    });
  });
});
