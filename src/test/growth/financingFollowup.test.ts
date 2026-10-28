import { describe, expect, it } from 'vitest';
import {
  bookingUrlFromEnv,
  isValidLeadEmail,
  CONTACT_URL,
} from '../../../supabase/functions/send-financing-followup/validation';

describe('send-financing-followup validation', () => {
  it('rejects missing or malformed lead emails', () => {
    expect(isValidLeadEmail('')).toBe(false);
    expect(isValidLeadEmail('not-an-email')).toBe(false);
    expect(isValidLeadEmail('a@b')).toBe(false);
    expect(isValidLeadEmail('a b@c.com')).toBe(false);
  });

  it('accepts a normal lead email', () => {
    expect(isValidLeadEmail('jennctech@gmail.com')).toBe(true);
    expect(isValidLeadEmail('  Jenn@Example.com ')).toBe(true);
  });

  it('uses the Calendly link only when it is a real calendly.com URL', () => {
    expect(bookingUrlFromEnv('https://calendly.com/vendibook/customer-success-30min')).toBe(
      'https://calendly.com/vendibook/customer-success-30min',
    );
    expect(bookingUrlFromEnv('https://evil.com/calendly.com')).toBe(CONTACT_URL);
    expect(bookingUrlFromEnv('')).toBe(CONTACT_URL);
    expect(bookingUrlFromEnv(undefined)).toBe(CONTACT_URL);
  });
});
