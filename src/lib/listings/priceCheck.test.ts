import { describe, expect, it } from 'vitest';
import { medianOf, priceCheck } from './priceCheck';

const trailers = [19000, 25000, 31000, 36000, 49000, 52000];
const trusted = { title_status: 'clean', condition: 'good' };

describe('priceCheck', () => {
  it('flags listings clearly below the category median', () => {
    expect(medianOf(trailers)).toBe(33500);
    expect(priceCheck(18000, trailers, trusted)).toEqual({ belowBy: 15500, median: 33500, comps: 6 });
  });

  it('stays silent near or above typical, or with too few comps', () => {
    expect(priceCheck(31000, trailers, trusted)).toBeNull();
    expect(priceCheck(79000, trailers, trusted)).toBeNull();
    expect(priceCheck(5000, [10000, 20000, 30000], trusted)).toBeNull();
    expect(priceCheck(null, trailers, trusted)).toBeNull();
  });

  it('never badges implausibly low prices or listings without a clean title and condition', () => {
    expect(priceCheck(5000, trailers, trusted)).toBeNull(); // under 40% of the $33.5k median
    expect(priceCheck(18000, trailers, { title_status: null, condition: 'good' })).toBeNull();
    expect(priceCheck(18000, trailers, { title_status: 'salvage', condition: 'good' })).toBeNull();
    expect(priceCheck(18000, trailers, { title_status: 'clean', condition: null })).toBeNull();
  });
});
