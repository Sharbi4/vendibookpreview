import { describe, it, expect } from 'vitest';
import { resolveTier } from './useHostEntitlements';

describe('resolveTier', () => {
  const cases: Array<[string | null | undefined, string]> = [
    // Empty
    [null, 'free'],
    [undefined, 'free'],
    ['', 'free'],
    ['garbage', 'free'],
    // Canonical
    ['starter', 'starter'],
    ['pro', 'pro'],
    ['premium', 'premium'],
    // New catalog
    ['host_starter', 'starter'],
    ['host_growth', 'pro'],
    ['host_operator', 'premium'],
    ['seller_plus', 'starter'],
    // Legacy alias — the specific regression this test guards
    ['host_pro', 'pro'],
    ['host-pro', 'pro'],
    ['HOST_PRO', 'pro'],
    // Interval suffixes
    ['host_growth_annual', 'pro'],
    ['host_operator_monthly', 'premium'],
    ['host_pro_annual', 'pro'],
  ];
  for (const [raw, expected] of cases) {
    it(`maps ${JSON.stringify(raw)} → ${expected}`, () => {
      expect(resolveTier(raw).tier).toBe(expected);
    });
  }
});
