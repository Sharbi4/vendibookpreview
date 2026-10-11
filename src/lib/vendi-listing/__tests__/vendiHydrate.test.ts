import { describe, expect, it } from 'vitest';
import { deriveAnsweredFromDraft, listingRowToVendiDraft, mergeServerDraft } from '../hydrate';
import { nextQuestion, type VendiDraft } from '../script';

/**
 * Earl-shaped rich draft: a seller who already answered most of the interview
 * and comes back later. Everything saved must be re-hydrated and never re-asked.
 */
const richRow = {
  id: 'listing-1',
  status: 'draft',
  title: 'Turn key custom soft serve trailer',
  description: 'Fully equipped soft serve trailer with two machines and a three-bay sink.',
  category: 'food_trailer',
  mode: 'rent',
  subcategory: 'ice_cream',
  address: 'Summerville, SC',
  city: 'Summerville',
  state: 'SC',
  postal_code: '29483',
  price_monthly: 1000,
  deposit_amount: 500,
  available_from: '2026-09-01',
  instant_book: true,
  fulfillment_type: 'delivery',
  delivery_radius_miles: 50,
  delivery_fee: 150,
  delivery_instructions: 'Level pad required.',
  pickup_instructions: 'Gate code on arrival.',
  amenities: ['Soft serve machine', 'Three-bay sink'],
  highlights: ['Turnkey'],
  length_inches: 240,
  width_inches: 96,
  height_inches: 108,
  image_urls: ['https://cdn.test/a.jpg'],
  video_urls: ['https://cdn.test/a.mp4'],
  accept_paypal_checkout: true,
  accept_cash_payment: false,
};

describe('listingRowToVendiDraft', () => {
  it('hydrates every Vendi-supported field, not just the narrow subset', () => {
    const draft = listingRowToVendiDraft(richRow, ['drivers_license'] as never);
    expect(draft.price_monthly).toBe(1000);
    expect(draft.rent_period).toBe('monthly');
    expect(draft.deposit_amount).toBe(500);
    expect(draft.instant_book).toBe(true);
    expect(draft.fulfillment_type).toBe('delivery');
    expect(draft.delivery_radius_miles).toBe(50);
    expect(draft.amenities).toEqual(['Soft serve machine', 'Three-bay sink']);
    expect(draft.length_inches).toBe(240);
    expect(draft.zip_code).toBe('29483');
    expect(draft.required_documents).toEqual(['drivers_license']);
  });

  it('never invents values that are absent from the row', () => {
    const draft = listingRowToVendiDraft({ id: 'x', mode: 'sale', category: 'food_truck' });
    expect(draft.price_sale).toBeNull();
    expect(draft.amenities).toBeUndefined();
    expect(draft.rent_period).toBeNull();
  });
});

describe('deriveAnsweredFromDraft', () => {
  it('skips questions the saved listing already answers', () => {
    const draft = listingRowToVendiDraft(richRow);
    const answered = deriveAnsweredFromDraft(draft, { hasMedia: true });
    for (const id of ['category', 'mode', 'location', 'description', 'title', 'rent_price', 'photos', 'deposit', 'amenities', 'dimensions']) {
      expect(answered).toContain(id);
    }
    const next = nextQuestion(draft, answered);
    expect(['category', 'mode', 'location', 'rent_price', 'title', 'photos']).not.toContain(next?.id);
  });

  it('does not treat database defaults as seller answers', () => {
    const draft = listingRowToVendiDraft({
      id: 'x', mode: 'rent', category: 'food_truck',
      fulfillment_type: 'pickup', instant_book: false, accept_paypal_checkout: true,
    });
    const answered = deriveAnsweredFromDraft(draft, { hasMedia: false });
    expect(answered).not.toContain('fulfillment');
    expect(answered).not.toContain('instant_book');
    expect(answered).not.toContain('photos');
  });
});

describe('mergeServerDraft', () => {
  const local: VendiDraft = { title: 'Locally typed title', description: null, category: null, mode: null };

  it('fills gaps from the server without reverting fresh local answers', () => {
    const merged = mergeServerDraft(local, listingRowToVendiDraft(richRow));
    expect(merged.title).toBe('Locally typed title');
    expect(merged.city).toBe('Summerville');
    expect(merged.price_monthly).toBe(1000);
  });

  it('lets the server win when it is the authoritative copy (cross-device resume)', () => {
    const merged = mergeServerDraft(local, listingRowToVendiDraft(richRow), { preferServer: true });
    expect(merged.title).toBe('Turn key custom soft serve trailer');
  });

  it('an empty server value never clobbers a saved local value', () => {
    const merged = mergeServerDraft(
      { ...local, price_sale: 45000 },
      { title: null, description: null, category: null, mode: 'sale', price_sale: null },
      { preferServer: true },
    );
    expect(merged.price_sale).toBe(45000);
  });
});
