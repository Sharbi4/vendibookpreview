import { describe, expect, it } from 'vitest';
import { hasContactDetails, maskContactDetails } from '../../../supabase/functions/_shared/contactPatterns';

describe('contact patterns', () => {
  it('flags and masks contact details and off-platform handles', () => {
    for (const t of [
      'text me 555-123-4567',
      'Call (602) 555 0199',
      'call 4805551234 anytime',
      '+1 480.555.1234',
      'email john.doe@gmail.com',
      'john at gmail dot com',
      'pay at www.secure-pay.xyz/v',
      'check paypal-verify.link now',
      'whatsapp me',
      'pay with Zelle',
    ]) {
      expect(hasContactDetails(t), t).toBe(true);
      expect(maskContactDetails(t)).toContain('[contact removed]');
    }
    expect(maskContactDetails('text me 555-123-4567')).toBe('text me [contact removed]');
  });

  it('leaves normal listing and question text alone', () => {
    for (const t of [
      'Is it still available? Can I see it this week?',
      'Does the 6x12 pass health inspection in 2026?',
      'Price $18,000 firm? 8x22 or 8x16',
      'Can I look at it. Thanks',
      'I am at work. Can we chat at noon?',
      'Models 2021 2022 2023 available',
      'Body size: 13.1 x 6.9 x 6.9 ft, 110V and 220V, 30 gallon fresh / 35 gallon gray',
      'Generator 9500W, 125 amps, 12000 BTU A/C, VIN 1FDXE45S8YHB12345',
      'Asking $25,000 or $1,200/month, 4 burners, 2 fryers',
    ]) {
      expect(hasContactDetails(t), t).toBe(false);
      expect(maskContactDetails(t)).toBe(t);
    }
  });
});
