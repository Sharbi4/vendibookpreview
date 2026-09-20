import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { fundingLabel } from '@/components/checkout/PayPalReviewAuthorize';
import { reviewFundingSource } from '@/components/checkout/PayPalPaymentPanel';
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

describe('payment review funding source', () => {
  it('preserves Pay Later when PayPal returns a generic payment source', () => {
    expect(reviewFundingSource('paylater', 'paypal')).toBe('paylater');
  });

  it('preserves Venmo when PayPal returns a generic payment source', () => {
    expect(reviewFundingSource('venmo', 'paypal')).toBe('venmo');
  });

  it('uses PayPal reported card details for the standard PayPal button', () => {
    expect(reviewFundingSource('paypal', 'card')).toBe('card');
  });
});
