import { describe, expect, it } from 'vitest';
import { SUPPORT_PHONE, SUPPORT_PHONE_HREF } from '../../../supabase/functions/_shared/email-brand/tokens';

describe('canonical email contact number', () => {
  it('uses the owner-approved support number', () => {
    expect(SUPPORT_PHONE).toBe('(866) 690-6227');
  });

  it('dials the same support line', () => {
    expect(SUPPORT_PHONE_HREF).toBe('tel:+18666906227');
  });
});