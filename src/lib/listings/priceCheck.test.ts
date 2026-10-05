import { describe, expect, it } from 'vitest';
import { medianOf, priceCheck } from './priceCheck';

const trailers = [19000, 25000, 31000, 36000, 49000, 52000];

describe('priceCheck', () => {
  it('flags listings clearly below the category median', () => {
    expect(medianOf(trailers)).toBe(33500);
    expect(priceCheck(18000, trailers)).toEqual({ belowBy: 15500, median: 33500, comps: 6 });
  });

  it('stays silent near or above typical, or with too few comps', () => {
    expect(priceCheck(31000, trailers)).toBeNull();
    expect(priceCheck(79000, trailers)).toBeNull();
    expect(priceCheck(5000, [10000, 20000, 30000])).toBeNull();
    expect(priceCheck(null, trailers)).toBeNull();
  });
});
