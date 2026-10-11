import { describe, expect, it } from 'vitest';
import {
  answersFromRow,
  buildFinishPatch,
  describeFinishPublishError,
  getFinishContentBlockers,
  getFinishQuestions,
  type FinishListingRow,
} from './finishListing';

const baseRow: FinishListingRow = {
  id: 'l1',
  host_id: 'h1',
  status: 'draft',
  mode: 'sale',
  category: 'food_trailer',
  title: '2021 Concession Trailer',
  description: 'A fully built concession trailer with a three-compartment sink and hood.',
  image_urls: ['a', 'b', 'c', 'd'],
  price_sale: 30000,
  price_daily: null,
  price_weekly: null,
  price_monthly: null,
  price_hourly: null,
  accept_paypal_checkout: true,
  accept_cash_payment: true,
  address: '1 Main St',
  city: 'Houston',
  state: 'TX',
  postal_code: '77002',
  fulfillment_type: 'pickup',
  access_instructions: null,
  condition: null,
  operational_status: null,
  title_status: null,
  has_lien: null,
  no_known_problems: null,
  known_problems: [],
  included_items: null,
  photos_exclusions_answered: null,
  photos_exclusions_note: null,
  price_negotiable: null,
  accepts_offers: null,
  min_offer_amount: null,
  length_inches: 192,
  height_inches: 108,
};

describe('finish & publish helpers', () => {
  it('treats a content-complete pre-disclosure draft as content-ready', () => {
    expect(getFinishContentBlockers(baseRow)).toEqual([]);
  });

  it('lists the disclosure questions a legacy draft still owes', () => {
    const ids = getFinishQuestions(baseRow, answersFromRow(baseRow)).map((q) => q.fieldId);
    expect(ids).toEqual(
      expect.arrayContaining([
        'listing-condition',
        'listing-operational-status',
        'listing-title-status',
        'listing-lien',
        'listing-known-problems',
        'listing-included-items',
        'listing-photo-exclusions',
      ]),
    );
    // Dimensions were already saved on this row, so they are not asked again.
    expect(ids).not.toContain('length_ft');
  });

  it('has no questions left once every disclosure is answered', () => {
    const answers = {
      ...answersFromRow(baseRow),
      condition: 'good',
      operationalStatus: 'towable',
      titleStatus: 'clean',
      hasLien: 'no',
      noKnownProblems: true,
      includedItems: 'Fryer, flat-top, fridge',
      photosExclusionsAnswered: true,
    };
    expect(getFinishQuestions(baseRow, answers)).toEqual([]);
  });

  it('sends content gaps to the full editor instead of the finish screen', () => {
    const row = { ...baseRow, image_urls: ['a'], price_sale: null };
    const ids = getFinishContentBlockers(row).map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(['photos', 'price']));
  });

  it('builds a patch that never writes a null known_problems and clears problems when none', () => {
    const answers = {
      ...answersFromRow(baseRow),
      noKnownProblems: true,
      knownProblems: [{ category: 'electrical', note: 'old' }],
      acceptsOffers: false,
      minOfferAmount: '20000',
    } as ReturnType<typeof answersFromRow>;
    const patch = buildFinishPatch(answers);
    expect(patch.known_problems).toEqual([]);
    expect(patch.min_offer_amount).toBeNull();
    expect(patch.length_inches).toBe(192);
  });

  it('never touches payment columns', () => {
    const patch = buildFinishPatch(answersFromRow(baseRow));
    expect(Object.keys(patch).some((k) => /paypal|cash|card|square|stripe|payout/i.test(k))).toBe(false);
  });

  it('maps database publish errors to seller copy', () => {
    expect(describeFinishPublishError('publish_incomplete:photos')).toEqual({
      message: 'Add at least 3 photos.',
      needsEditor: true,
    });
    expect(describeFinishPublishError('publish_incomplete:title_status').needsEditor).toBe(false);
    expect(describeFinishPublishError('JWT expired').message).toMatch(/session expired/i);
  });
});
