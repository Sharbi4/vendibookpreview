import { describe, expect, it } from 'vitest';
import { listingPublishError } from '../publishError';

describe('listing publish failures', () => {
  it('opens the limit flow for a plain PostgREST rejection', () => {
    expect(listingPublishError({ code: 'P0001', message: 'listing_publish_limit_reached' }).limitReached).toBe(true);
  });
  it('does not misrepresent a permission rejection as an expired session', () => {
    expect(listingPublishError({ code: '42501', message: 'row-level security' }).message).toContain('listing owner');
    expect(listingPublishError({ code: 'PGRST301', message: 'JWT expired' }).message).toContain('sign in again');
  });
  it.each(['23502', '23514'])('provides validation guidance without exposing private row details (%s)', code => {
    const result = listingPublishError({ code, message: 'private_column private@example.com', details: 'secret row data' });
    expect(result.message).toContain('full editor');
    expect(result.message).not.toMatch(/private|secret/);
  });
  it('preserves meaningful application and network errors', () => {
    expect(listingPublishError(new Error('This listing is on hold with our team.')).message).toContain('on hold');
    expect(listingPublishError({ message: 'Failed to fetch' }).message).toContain('connection');
  });
  it.each([null, undefined, {}, { code: 'XX000', message: 'private database detail' }])('handles unknown errors without success or lost-draft promises', error => {
    expect(listingPublishError(error).message).toContain('could not confirm');
    expect(listingPublishError(error).message).not.toContain('private');
  });
});
