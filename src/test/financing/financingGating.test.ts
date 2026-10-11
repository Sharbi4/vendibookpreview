import { describe, it, expect } from 'vitest';
import { EQUINOX_APPLY_URL, isFinanceableSaleListing } from '@/lib/financing/disclosure';

/**
 * Buyer financing is a marketplace-level benefit: every published for-sale
 * listing qualifies while the global launch flag is on. There is no seller
 * opt-in and no per-listing disclosure acceptance.
 */
const buyerFinancingVisible = (flagOn: boolean, listing: any) =>
  flagOn && isFinanceableSaleListing(listing);

const saleListing = { id: 'l1', mode: 'sale', status: 'published' };

describe('financing eligibility', () => {
  it('accepts any published for-sale listing category', () => {
    expect(isFinanceableSaleListing(saleListing)).toBe(true);
    expect(isFinanceableSaleListing({ id: 'l4', mode: 'sale' })).toBe(true);
    expect(isFinanceableSaleListing({ id: 'l2', mode: 'rent', status: 'published' })).toBe(false);
    expect(isFinanceableSaleListing(null)).toBe(false);
  });

  it('rejects unpublished sale listings', () => {
    expect(isFinanceableSaleListing({ id: 'l5', mode: 'sale', status: 'draft' })).toBe(false);
    expect(isFinanceableSaleListing({ id: 'l6', mode: 'sale', status: 'archived' })).toBe(false);
  });
});

describe('buyer-facing financing visibility', () => {
  it('shows on every published sale listing with no seller opt-in', () => {
    expect(buyerFinancingVisible(true, saleListing)).toBe(true);
  });

  it('hides when the launch flag is off or the listing is a rental', () => {
    expect(buyerFinancingVisible(false, saleListing)).toBe(false);
    expect(buyerFinancingVisible(true, { id: 'l3', mode: 'rent', status: 'published' })).toBe(false);
  });
});

describe('listing context is preserved', () => {
  it('routes the listing CTA through /financing with listing_id', () => {
    expect(`/financing?listing_id=${saleListing.id}`).toBe('/financing?listing_id=l1');
  });

  it('keeps the Equinox application URL stable', () => {
    expect(EQUINOX_APPLY_URL).toContain('equinox-funding.com');
  });
});
