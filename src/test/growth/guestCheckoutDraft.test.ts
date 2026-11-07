import { describe, expect, it } from 'vitest';
import {
  listingAcceptsGuestDraft,
  normalizeGuestEmail,
  safeGuestResumePath,
  safeIsoDate,
} from '../../../supabase/functions/_shared/guestCheckoutDraft';
import { isValidGuestCheckoutEmail } from '@/lib/guestCheckoutDraft';

describe('guest checkout recovery rules', () => {
  it('only accepts a real-looking email and lowercases it', () => {
    expect(normalizeGuestEmail('  Buyer@Example.COM ')).toBe('buyer@example.com');
    expect(normalizeGuestEmail('not-an-email')).toBeNull();
    expect(isValidGuestCheckoutEmail('a@b')).toBe(false);
  });

  it('resume links stay on the matching Vendibook checkout', () => {
    expect(safeGuestResumePath('sale', '/checkout/abc')).toBe('/checkout/abc');
    expect(safeGuestResumePath('sale', '/purchase-request/abc')).toBe('/purchase-request/abc');
    expect(safeGuestResumePath('sale', '/book/abc')).toBeNull();
    expect(safeGuestResumePath('rental', '/book/abc?start=2026-11-10')).toBe('/book/abc?start=2026-11-10');
    expect(safeGuestResumePath('rental', '//evil.com/book/abc')).toBeNull();
    expect(safeGuestResumePath('rental', 'https://evil.com')).toBeNull();
  });

  it('a draft needs a published listing in the matching mode', () => {
    expect(listingAcceptsGuestDraft('sale', { status: 'published', mode: 'sale' })).toBe(true);
    expect(listingAcceptsGuestDraft('rental', { status: 'published', mode: 'rent' })).toBe(true);
    expect(listingAcceptsGuestDraft('sale', { status: 'published', mode: 'rent' })).toBe(false);
    expect(listingAcceptsGuestDraft('rental', { status: 'paused', mode: 'rent' })).toBe(false);
    expect(listingAcceptsGuestDraft('sale', null)).toBe(false);
  });

  it('drops malformed dates', () => {
    expect(safeIsoDate('2026-11-10')).toBe('2026-11-10');
    expect(safeIsoDate('11/10/2026')).toBeNull();
  });
});
