import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { isPhoneVerificationError, isRentalConversionEligible } from './rentalConversion';

describe('isPhoneVerificationError', () => {
  it('matches the server phone gate message', () => {
    expect(isPhoneVerificationError('Verify your mobile number to finish creating your account.')).toBe(true);
  });
  it('ignores other errors', () => {
    expect(isPhoneVerificationError('Verify your identity to message, make offers, or buy on Vendibook.')).toBe(false);
    expect(isPhoneVerificationError('This listing is not eligible to be rented out.')).toBe(false);
    expect(isPhoneVerificationError(null)).toBe(false);
  });
});

describe('isRentalConversionEligible', () => {
  const base = { mode: 'sale', category: 'food_trailer', status: 'published', deleted_at: null } as const;
  it('accepts live sale trucks and trailers', () => {
    expect(isRentalConversionEligible(base)).toBe(true);
    expect(isRentalConversionEligible({ ...base, category: 'food_truck', status: 'paused' })).toBe(true);
  });
  it('rejects rentals, kitchens and drafts', () => {
    expect(isRentalConversionEligible({ ...base, mode: 'rent' })).toBe(false);
    expect(isRentalConversionEligible({ ...base, category: 'ghost_kitchen' })).toBe(false);
    expect(isRentalConversionEligible({ ...base, status: 'draft' })).toBe(false);
  });
});
