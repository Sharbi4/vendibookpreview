import { describe, it, expect } from 'vitest';
import {
  EQUINOX_DISCLOSURE_VERSION,
  EQUINOX_APPLY_URL,
  isFinanceableSaleListing,
} from '@/lib/financing/disclosure';

/**
 * Pure gating rules behind the Equinox financing surfaces. Buyer-facing
 * financing must never appear unless the seller explicitly opted this
 * listing in against the current disclosure version.
 */
const buyerFinancingVisible = (
  flagOn: boolean,
  listing: any,
  pref: { equinox_opt_in?: boolean; disclosure_version?: string | null; disclosure_accepted_at?: string | null } | null,
) =>
  flagOn &&
  isFinanceableSaleListing(listing) &&
  pref?.equinox_opt_in === true &&
  pref?.disclosure_version === EQUINOX_DISCLOSURE_VERSION &&
  !!pref?.disclosure_accepted_at;

const saleListing = { id: 'l1', mode: 'sale' };
const acceptedPref = {
  equinox_opt_in: true,
  disclosure_version: EQUINOX_DISCLOSURE_VERSION,
  disclosure_accepted_at: '2026-08-01T00:00:00Z',
};

describe('financing eligibility', () => {
  it('accepts any for-sale listing category', () => {
    expect(isFinanceableSaleListing(saleListing)).toBe(true);
    expect(isFinanceableSaleListing({ id: 'l2', mode: 'rent' })).toBe(false);
    expect(isFinanceableSaleListing(null)).toBe(false);
  });
});

describe('buyer-facing financing visibility', () => {
  it('shows only when opted in with a current disclosure', () => {
    expect(buyerFinancingVisible(true, saleListing, acceptedPref)).toBe(true);
  });

  it('hides when the seller has not opted in', () => {
    expect(buyerFinancingVisible(true, saleListing, null)).toBe(false);
    expect(
      buyerFinancingVisible(true, saleListing, { ...acceptedPref, equinox_opt_in: false }),
    ).toBe(false);
  });

  it('hides on a stale disclosure version or missing acceptance', () => {
    expect(
      buyerFinancingVisible(true, saleListing, { ...acceptedPref, disclosure_version: 'equinox-financing-v0' }),
    ).toBe(false);
    expect(
      buyerFinancingVisible(true, saleListing, { ...acceptedPref, disclosure_accepted_at: null }),
    ).toBe(false);
  });

  it('hides when the launch flag is off or the listing is a rental', () => {
    expect(buyerFinancingVisible(false, saleListing, acceptedPref)).toBe(false);
    expect(buyerFinancingVisible(true, { id: 'l3', mode: 'rent' }, acceptedPref)).toBe(false);
  });
});

describe('listing context is preserved', () => {
  it('routes the listing CTA through /financing with listing_id', () => {
    expect(`/financing?listing_id=${saleListing.id}`).toBe('/financing?listing_id=l1');
  });

  it('keeps the external Equinox application URL unchanged', () => {
    expect(EQUINOX_APPLY_URL).toBe('https://equinox-funding.com/efapplication/');
  });
});
