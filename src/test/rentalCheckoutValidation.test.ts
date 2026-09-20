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


import { rentalIsInstant, rentalSubmitAllowed, rentalBookingView, parseRentalDate, parseRentalSlot, validRentalContact } from '../lib/rentalCheckoutValidation';
import { parseHourlySelections } from '../lib/hourlySelections';
import { describe } from 'vitest';
const complete = { contact: true, business: true, documents: true, disclosure: true,
  fulfillment: 'pickup', deliveryAddress: '', slotRequired: false, slot: null,
  legal: true, dates: true, selfBooking: false };
describe('rental transaction policy', () => {
  it.each([
    [true, true, null, true], [true, false, null, false],
    [true, true, 'request', false], [false, true, null, false],
  ])('listing=%s verified=%s override=%s => instant=%s', (listing, verified, flow, expected) => {
    expect(rentalIsInstant(listing, verified, flow)).toBe(expected);
    expect(rentalBookingView({ status: 'pending', payment_status: 'unpaid', is_instant_book: expected }))
      .toBe(expected ? 'ready_to_pay' : 'awaiting_host');
  });
  it('approved request opens payment without pretending it is already paid', () => {
    expect(rentalBookingView({ status: 'approved', payment_status: 'unpaid', is_instant_book: false })).toBe('ready_to_pay');
    expect(rentalBookingView({ status: 'approved', payment_status: 'pending', is_instant_book: false })).toBe('processing');
    expect(rentalBookingView({ status: 'approved', payment_status: 'paid', is_instant_book: false })).toBe('confirmed');
  });
  it.each(['contact','business','documents','disclosure','legal','dates'] as const)('rechecks invalidated %s at submission', key => {
    expect(rentalSubmitAllowed(complete)).toBe(true);
    expect(rentalSubmitAllowed({ ...complete, [key]: false })).toBe(false);
  });
  it('blocks self-booking, missing delivery address, and missing required slot', () => {
    expect(rentalSubmitAllowed({ ...complete, selfBooking: true })).toBe(false);
    expect(rentalSubmitAllowed({ ...complete, fulfillment: 'delivery', deliveryAddress: '  ' })).toBe(false);
    expect(rentalSubmitAllowed({ ...complete, slotRequired: true })).toBe(false);
  });
  it('does not accept agreement flags in place of valid contact', () => {
    const info = { firstName: 'Jane', lastName: 'Doe', phoneNumber: '(520) 555-1113', address1: '1 Main St', city: 'Tucson', state: 'AZ', zipCode: '85714', agreedToTerms: true };
    expect(validRentalContact(info)).toBe(true);
    for (const key of ['firstName','lastName','phoneNumber','address1','city','state','zipCode']) {
      expect(validRentalContact({ ...info, [key]: '' })).toBe(false);
    }
  });
  it('rejects malformed and rollover dates', () => {
    for (const date of ['garbage','2026-02-31','2026-13-01','2026-9-01']) expect(parseRentalDate(date)).toBeUndefined();
    expect(parseRentalDate('2026-09-22')?.getDate()).toBe(22);
  });
  it('persists a valid space through URL serialization and rejects unsafe selections', () => {
    const params = new URLSearchParams('start=2026-09-22&slot=3&flow=request');
    const refreshed = new URLSearchParams(params.toString());
    expect(parseRentalSlot(refreshed.get('slot'))).toBe(3);
    for (const slot of ['0','-1','NaN','2.5','Infinity']) expect(parseRentalSlot(slot)).toBeNull();
  });
  it('rejects invalid hourly dates and times without mutating selected arrays', () => {
    expect(parseHourlySelections({ startDate: null, timeSlots: null, hourlyData: 'bad:10:00|2026-09-22:99:00,10:00,09:00' }))
      .toEqual({ '2026-09-22': ['09:00','10:00'] });
  });
  it('keeps only hourly selections inside refreshed checkout dates', () => {
    expect(parseHourlySelections({ startDate: '2026-09-22', endDate: '2026-09-23', timeSlots: null, hourlyData: '2026-09-21:09:00|2026-09-22:10:00|2026-09-24:11:00' })).toEqual({ '2026-09-22': ['10:00'] });
  });
  it('derives legacy hourly duration from selected times', () => {
    expect(parseHourlySelections({ startDate: '2026-09-22', endDate: '2026-09-22', startTime: '09:00', endTime: '11:00', hourlyData: null, timeSlots: null })).toEqual({ '2026-09-22': ['09:00', '10:00'] });
  });
});
