import { describe, expect, it } from 'vitest';
import { legacyDashboardRedirect } from './legacyDashboardRedirect';

const go = (qs: string) => legacyDashboardRedirect(new URLSearchParams(qs));

describe('legacyDashboardRedirect', () => {
  it('leaves the plain dashboard alone', () => {
    expect(go('')).toBeNull();
    expect(go('utm_source=email')).toBeNull();
  });

  it('sends offer email links to the offers page with the action', () => {
    expect(go('offer=abc')).toBe('/dashboard/offers?offer=abc');
    expect(go('offer=abc&action=counter')).toBe('/dashboard/offers?offer=abc&action=counter');
  });

  it('maps legacy tabs to workspace pages', () => {
    expect(go('view=host&tab=sales')).toBe('/dashboard/offers');
    expect(go('view=host&tab=payouts')).toBe('/dashboard/payments');
    expect(go('view=shopper&tab=orders')).toBe('/dashboard/transactions');
    expect(go('tab=listings')).toBe('/dashboard/listings');
    expect(go('view=shopper&tab=favorites')).toBe('/dashboard/saved');
    expect(go('view=host&tab=permits&roadmap=r1')).toBe('/tools/permitpath?roadmap=r1');
  });

  it('never loops: unknown tabs and bare views land on the plain home', () => {
    expect(go('view=host')).toBe('/dashboard');
    expect(go('view=shopper&tab=something-new')).toBe('/dashboard');
  });
});
