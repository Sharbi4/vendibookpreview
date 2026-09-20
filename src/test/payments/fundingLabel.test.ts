import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { fundingLabel } from '@/components/checkout/PayPalReviewAuthorize';
const fallback = { method: 'unknown', label: 'PayPal', email: null, brand: null, last4: null };
describe('payment method labels', () => {
  it('does not invent a method when PayPal omits funding details', () => {
    expect(fundingLabel(fallback)).toBe('');
  });
  it('keeps verified card details when available', () => {
    expect(fundingLabel({ ...fallback, method: 'card', brand: 'Visa', last4: '1234' })).toBe('Visa ending 1234');
  });
  it('does not label PayPal wallet checkout as a card', () => {
    expect(fundingLabel({ ...fallback, method: 'paypal' })).toBe('PayPal');
  });
  it('does not use a stale label to invent card details', () => {
    expect(fundingLabel({ ...fallback, method: 'card', label: 'Visa ending 9999' })).toBe('Card');
  });
});
