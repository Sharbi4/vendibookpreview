import { describe, it, expect } from 'vitest';
import { calculateFinancing, financingInventoryUrl } from './calculator';

const base = { price: 45000, downPayment: 9000, annualRate: 10, months: 60, orderValue: 18, operatingDays: 22 };
describe('equipment payment planning', () => {
  it('amortizes a fixed-rate loan and reconciles principal, interest and cash paid', () => {
    const r = calculateFinancing(base)!;
    expect(r.principal).toBe(36000);
    expect(r.monthlyPayment).toBeCloseTo(764.8936096, 5);
    expect(r.totalPayments).toBeCloseTo(r.monthlyPayment * 60, 8);
    expect(r.financingCost + r.principal).toBeCloseTo(r.totalPayments, 8);
    expect(r.totalWithDownPayment).toBeCloseTo(r.totalPayments + 9000, 8);
  });
  it('handles zero interest and the requested gross-order example', () => {
    const r = calculateFinancing({ ...base, price: 75000, downPayment: 0, annualRate: 0 })!;
    expect(r.monthlyPayment).toBe(1250);
    expect(r.financingCost).toBe(0);
    expect(r.ordersPerMonth).toBe(70);
    expect(r.ordersPerDay).toBeCloseTo(3.15656565, 6);
  });
  it('handles a fully paid purchase and a tiny nonzero rate', () => {
    expect(calculateFinancing({ ...base, downPayment: base.price })?.monthlyPayment).toBe(0);
    expect(calculateFinancing({ ...base, annualRate: 1e-10 })?.monthlyPayment).toBeCloseTo(600, 6);
  });
  it.each([
    { price: 0 }, { price: NaN }, { price: Infinity }, { downPayment: -1 }, { downPayment: 45001 },
    { annualRate: -1 }, { annualRate: 101 }, { months: 0 }, { months: 1.5 }, { months: 361 },
    { orderValue: 0 }, { operatingDays: 0 }, { operatingDays: 32 }, { operatingDays: 2.5 },
  ])('rejects invalid or incomplete values %j', patch => {
    expect(calculateFinancing({ ...base, ...patch })).toBeNull();
  });
  it('links to actual sale price filters and carries only sanitized UTMs', () => {
    const url = new URL(financingInventoryUrl(45000, 'food_trailer', '?utm_source=google&utm_campaign=finance&email=private&listing_id=123'), 'https://vendibook.com');
    expect(url.pathname).toBe('/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({ mode: 'sale', category: 'food_trailer', max_price: '45000', utm_source: 'google', utm_campaign: 'finance' });
    expect(financingInventoryUrl(NaN)).toBe('/search?mode=sale');
  });
});
