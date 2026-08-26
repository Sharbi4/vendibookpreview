import { describe, it, expect } from 'vitest';
import { parseDimensions, parseList, parseLocation, parseMoney, parseYesNo, isSkip } from '../extract';
import {
  QUESTIONS, VendiDraft, buildListingPayload, getPublishBlockers, nextQuestion, visibleQuestions,
} from '../script';

const q = (id: string) => {
  const found = QUESTIONS.find((x) => x.id === id);
  if (!found) throw new Error(`missing question ${id}`);
  return found;
};

const answer = (draft: VendiDraft, id: string, raw: string): VendiDraft => {
  const res = q(id).apply(draft, raw);
  expect(res.error).toBeUndefined();
  return { ...draft, ...(res.patch ?? {}) };
};

describe('extraction', () => {
  it('parses money in common formats', () => {
    expect(parseMoney('$1,000')).toBe(1000);
    expect(parseMoney('45000')).toBe(45000);
    expect(parseMoney('1.2k')).toBe(1200);
    expect(parseMoney('no idea')).toBeNull();
  });

  it('parses city/state/zip only when explicit', () => {
    expect(parseLocation('Mesa, AZ')).toEqual({ city: 'Mesa', state: 'AZ', zip_code: null });
    expect(parseLocation('Spring Hill, Tennessee 37174')).toEqual({ city: 'Spring Hill', state: 'TN', zip_code: '37174' });
    expect(parseLocation('somewhere').state).toBeNull();
  });

  it('parses yes/no, lists, dimensions and skips', () => {
    expect(parseYesNo('yep')).toBe(true);
    expect(parseYesNo('nope')).toBe(false);
    expect(parseYesNo('maybe')).toBeNull();
    expect(parseList('Espresso machine, sink, generator')).toEqual(['Espresso machine', 'sink', 'generator']);
    expect(parseDimensions('20 x 8 x 9 ft')).toEqual({ length_inches: 240, width_inches: 96, height_inches: 108 });
    expect(isSkip('skip')).toBe(true);
  });
});

describe('interview branching', () => {
  it('starts with mode and only asks rental questions for rentals', () => {
    const empty: VendiDraft = { title: null, description: null, category: null, mode: null };
    expect(nextQuestion(empty, [])?.id).toBe('mode');

    const rent = answer(answer(empty, 'mode', 'rent'), 'category', 'food_trailer');
    const rentIds = visibleQuestions(rent).map((x) => x.id);
    expect(rentIds).toContain('rent_period');
    expect(rentIds).toContain('instant_book');
    expect(rentIds).not.toContain('sale_price');

    const sale = answer(answer(empty, 'mode', 'sell'), 'category', 'vendor_lot');
    const saleIds = visibleQuestions(sale).map((x) => x.id);
    expect(saleIds).toContain('sale_price');
    expect(saleIds).not.toContain('deposit');
    // Static locations skip mobile-only questions
    expect(saleIds).not.toContain('fulfillment');
    expect(saleIds).not.toContain('dimensions');
  });

  it('accepts coffee_beverage for food trailers', () => {
    const base: VendiDraft = { title: null, description: null, category: 'food_trailer', mode: 'sale' };
    const withSub = answer(base, 'subcategory', 'coffee_beverage');
    expect(withSub.subcategory).toBe('coffee_beverage');
  });

  it('rejects invalid answers with guidance instead of guessing', () => {
    const base: VendiDraft = { title: null, description: null, category: null, mode: null };
    expect(q('mode').apply(base, 'huh')?.error).toBeTruthy();
    expect(q('title').apply(base, 'short')?.error).toBeTruthy();
    expect(q('location').apply(base, 'downtown')?.error).toBeTruthy();
  });
});

describe('rental monthly pricing', () => {
  const buildMonthlyRental = (): VendiDraft => {
    let d: VendiDraft = { title: null, description: null, category: null, mode: null };
    d = answer(d, 'mode', 'rent');
    d = answer(d, 'category', 'food_trailer');
    d = answer(d, 'title', 'Like new turnkey food trailer for lease');
    d = answer(d, 'description', 'Turnkey trailer available for monthly lease in Spring Hill.');
    d = answer(d, 'location', 'Spring Hill, TN');
    d = answer(d, 'rent_period', 'monthly');
    d = answer(d, 'rent_price', '$1,000');
    d = answer(d, 'instant_book', 'no');
    d = answer(d, 'fulfillment', 'pickup');
    return d;
  };

  it('stores a monthly rate and treats it as valid pricing', () => {
    const d = buildMonthlyRental();
    expect(d.price_monthly).toBe(1000);
    expect(d.price_daily).toBeUndefined();
    expect(getPublishBlockers(d, 1)).toEqual([]);
    expect(getPublishBlockers(d, 0)).toContain('Add at least one photo.');
  });

  it('maps to a rent payload with no sale price and PayPal-only sale flags off', () => {
    const payload = buildListingPayload(buildMonthlyRental(), ['https://example.com/a.jpg']);
    expect(payload).toMatchObject({
      mode: 'rent',
      price_monthly: 1000,
      price_sale: null,
      city: 'Spring Hill',
      state: 'TN',
      accept_paypal_checkout: false,
      cover_image_url: 'https://example.com/a.jpg',
    });
  });
});
