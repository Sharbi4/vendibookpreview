import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { bookingDocumentPath } from '@/lib/documents/openBookingDocument';

describe('bookingDocumentPath', () => {
  it('extracts the storage path from the stored public object URL', () => {
    expect(bookingDocumentPath(
      'https://abc.supabase.co/storage/v1/object/public/booking-documents/7f1e/insurance_123.pdf',
    )).toBe('7f1e/insurance_123.pdf');
  });

  it('decodes encoded names and ignores query strings', () => {
    expect(bookingDocumentPath(
      'https://abc.supabase.co/storage/v1/object/public/booking-documents/b1/my%20license.png?t=1',
    )).toBe('b1/my license.png');
  });

  it('accepts a bare path', () => {
    expect(bookingDocumentPath('b1/doc.pdf')).toBe('b1/doc.pdf');
  });

  it('rejects other buckets and empty values', () => {
    expect(bookingDocumentPath('https://abc.supabase.co/storage/v1/object/public/listing-images/x.png')).toBeNull();
    expect(bookingDocumentPath(null)).toBeNull();
  });
});
