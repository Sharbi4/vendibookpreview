import { describe, expect, it } from 'vitest';
import { menuIdeasForListing } from '@/lib/atlas/atlasMenu';
import { buyerFollowUpConsent } from '../../../supabase/functions/_shared/atlasBuyerFollowUp';
describe('Atlas buyer journey', () => {
  it('does not invent appliances from a cuisine title', () => {
    expect(menuIdeasForListing({ title: 'Taco pizza coffee truck' })).toEqual([]);
    expect(menuIdeasForListing({ description: 'No fryer. Space for an espresso machine.' })).toEqual([]);
  });
  it('builds griddle menu ideas without adding fryer or espresso dishes', () => {
    const names = menuIdeasForListing({ amenities: ['flat_top_griddle', 'refrigerator'] }).map(i => i.name);
    expect(names).toContain('Griddled street tacos');
    expect(names).toContain('Smash burgers');
    expect(names).not.toContain('Loaded fries');
    expect(names).not.toContain('Espresso drinks');
  });
  it('distinguishes brewed coffee from espresso equipment', () => {
    expect(menuIdeasForListing({ included_items: ['coffee brewer'] }).map(i => i.name)).toEqual(['Brewed coffee']);
  });
  it('rejects missing consent and malformed buyer email on the server', () => {
    const now = new Date('2026-10-23');
    expect(buyerFollowUpConsent({ intent: 'buyer_follow_up', email: 'buyer@example.com' }, now).error).toBeTruthy();
    expect(buyerFollowUpConsent({ intent: 'buyer_follow_up', follow_up_consent: true, consent_version: 'atlas-buyer-follow-up-v1', email: 'invalid' }, now).error).toBeTruthy();
  });
  it('records a narrowly scoped request with server timestamp and validated shortlist links', () => {
    const result = buyerFollowUpConsent({ intent: 'buyer_follow_up', follow_up_consent: true, consent_version: 'atlas-buyer-follow-up-v1', email: 'buyer@example.com', shortlist: [{ id: '2b8a5106-53e8-4999-96a1-7fc4890ff6b7' }, { id: 'https://untrusted.example' }] }, new Date('2026-10-23T01:00:00Z'));
    expect(result.error).toBeNull();
    expect(result.lines.join(' ')).toContain('2026-10-23T01:00:00.000Z');
    expect(result.lines.join(' ')).toContain('No newsletter, SMS');
    expect(result.lines.join(' ')).not.toContain('untrusted');
  });
});
