import { describe, expect, it } from 'vitest';
import { parseRentalDate, rentalDateRange } from './rentalDates';

describe('rental calendar dates', () => {
  it('preserves rental days in the local timezone, including DST dates', () => {
    for (const value of ['2026-02-06', '2026-02-13', '2026-03-08', '2026-11-01']) {
      const date = parseRentalDate(value);
      expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual(value.split('-').map(Number));
    }
  });
  it('does not display invalid rental dates', () => {
    expect(rentalDateRange('invalid', '2026-02-13')).toBeNull();
  });
});
