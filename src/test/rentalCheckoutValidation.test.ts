import { expect, it } from 'vitest';
import { isValidRentalDateRange } from '../lib/rentalCheckoutValidation';
it('rejects missing, malformed, and reversed rental dates', () => {
  expect(isValidRentalDateRange(undefined, new Date())).toBe(false);
  expect(isValidRentalDateRange(new Date('invalid'), new Date())).toBe(false);
  expect(isValidRentalDateRange(new Date('2026-09-22'), new Date('2026-09-21'))).toBe(false);
});
it('accepts same-day rentals and forward date ranges', () => {
  expect(isValidRentalDateRange(new Date('2026-09-22'), new Date('2026-09-22'))).toBe(true);
  expect(isValidRentalDateRange(new Date('2026-09-22'), new Date('2026-09-25'))).toBe(true);
});

