import { describe, it, expect } from 'vitest';
import { buildBookingDraftRow, isSafeResumePath } from '@/lib/bookingDraftRecovery';

describe('booking draft recovery', () => {
  const base = {
    userId: 'u-1',
    listingId: 'l-1',
    email: '  Renter@Example.com ',
    startDate: '2026-11-01',
    endDate: '2026-11-03',
    totalPrice: 450.5,
    resumePath: '/book/l-1?start=2026-11-01&end=2026-11-03',
  };

  it('maps the checkout selection into a booking_drafts row', () => {
    const row = buildBookingDraftRow(base);
    expect(row.user_id).toBe('u-1');
    expect(row.listing_id).toBe('l-1');
    expect(row.email).toBe('renter@example.com');
    expect(row.start_date).toBe('2026-11-01');
    expect(row.end_date).toBe('2026-11-03');
    expect(row.total_price).toBe(450.5);
    expect(row.resume_path).toBe('/book/l-1?start=2026-11-01&end=2026-11-03');
  });

  it('re-arms recovery on a fresh attempt by clearing completed_at', () => {
    expect(buildBookingDraftRow(base).completed_at).toBeNull();
  });

  it('only keeps on-site checkout resume paths', () => {
    expect(isSafeResumePath('/book/abc?start=2026-11-01')).toBe(true);
    expect(isSafeResumePath('https://evil.com/book/abc')).toBe(false);
    expect(isSafeResumePath('//evil.com/book/abc')).toBe(false);
    expect(isSafeResumePath('/listing/abc')).toBe(false);
    expect(isSafeResumePath(null)).toBe(false);
    expect(buildBookingDraftRow({ ...base, resumePath: 'https://evil.com/x' }).resume_path).toBeNull();
  });

  it('tolerates missing optional selection details', () => {
    const row = buildBookingDraftRow({ userId: 'u-1', listingId: 'l-1', email: 'a@b.co' });
    expect(row.start_date).toBeNull();
    expect(row.end_date).toBeNull();
    expect(row.total_price).toBeNull();
    expect(row.resume_path).toBeNull();
  });
});
