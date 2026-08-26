import { describe, it, expect } from 'vitest';
import { parseDimensions, parseList, parseLocation, parseMoney, parseYesNo, isSkip } from '../extract';
import {
  QUESTIONS, REVIEW_GATE_ID, VendiDraft, buildListingPayload, getPublishBlockers, nextQuestion,
  parseExtraRates, visibleQuestions,
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
  it('starts with the optional import offer, then mode', () => {
    const empty: VendiDraft = { title: null, description: null, category: null, mode: null };
    expect(nextQuestion(empty, [])?.id).toBe('import_choice');
    expect(nextQuestion(empty, ['import_choice', 'import_paste'])?.id).toBe('mode');

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

describe('progressive interview and optional depth', () => {
  const coreRental = (): VendiDraft => {
    let d: VendiDraft = { title: null, description: null, category: null, mode: null };
    d = answer(d, 'mode', 'rent');
    d = answer(d, 'category', 'food_trailer');
    d = answer(d, 'location', 'Spring Hill, TN');
    d = answer(d, 'rent_period', 'monthly');
    d = answer(d, 'rent_price', '$1,000');
    d = answer(d, 'description', 'Turnkey trailer available for monthly lease in Spring Hill.');
    d = answer(d, 'fulfillment', 'pickup');
    d = answer(d, 'instant_book', 'no');
    d = answer(d, 'title', 'Like new turnkey food trailer for lease');
    return d;
  };

  const coreAnswers = [
    'import_choice', 'import_paste', 'mode', 'category', 'subcategory', 'location',
    'rent_period', 'rent_price', 'description', 'fulfillment', 'instant_book', 'photos', 'title',
  ];

  it('asks the title only after the substantive facts are gathered', () => {
    const ids = visibleQuestions(coreRental()).filter((x) => x.tier !== 'extra').map((x) => x.id);
    expect(ids.indexOf('title')).toBeGreaterThan(ids.indexOf('description'));
    expect(ids.indexOf('title')).toBeGreaterThan(ids.indexOf('rent_price'));
  });

  it('suggests a title only from confirmed facts', () => {
    const d = { ...coreRental(), subcategory: 'coffee_beverage' };
    expect(q('title').suggest?.(d)).toBe('Coffee & Beverage for rent in Spring Hill, TN');
  });

  it('offers review once minimum publish requirements are met', () => {
    const d = coreRental();
    expect(getPublishBlockers(d, 1)).toEqual([]);
    const gate = nextQuestion(d, coreAnswers);
    expect(gate?.id).toBe(REVIEW_GATE_ID);
    const res = gate!.apply(d, 'review');
    expect(res.error).toBeUndefined();
    // Choosing review marks all optional questions answered — no forced depth.
    expect(nextQuestion(d, [...coreAnswers, REVIEW_GATE_ID, ...(res.answeredIds ?? [])])).toBeNull();
    // Choosing to strengthen keeps them queued.
    expect(nextQuestion(d, [...coreAnswers, REVIEW_GATE_ID])?.tier).toBe('extra');
  });

  it('branches static-location questions away from mobile assets', () => {
    const kitchen: VendiDraft = { title: null, description: null, category: 'ghost_kitchen', mode: 'rent' };
    const kitchenIds = visibleQuestions(kitchen).map((x) => x.id);
    expect(kitchenIds).toContain('hours_of_access');
    expect(kitchenIds).toContain('access_instructions');
    expect(kitchenIds).toContain('location_notes');
    expect(kitchenIds).not.toContain('fulfillment');
    expect(kitchenIds).not.toContain('dimensions');

    const truck: VendiDraft = { title: null, description: null, category: 'food_truck', mode: 'sale' };
    const truckIds = visibleQuestions(truck).map((x) => x.id);
    expect(truckIds).toContain('dimensions');
    expect(truckIds).not.toContain('hours_of_access');
  });

  it('shows delivery detail questions only when delivery is offered', () => {
    const pickup: VendiDraft = { title: null, description: null, category: 'food_trailer', mode: 'rent', fulfillment_type: 'pickup' };
    expect(visibleQuestions(pickup).map((x) => x.id)).not.toContain('delivery_terms');
    const delivers = { ...pickup, fulfillment_type: 'both' };
    const ids = visibleQuestions(delivers).map((x) => x.id);
    expect(ids).toContain('delivery_terms');
    expect(ids).toContain('pickup_instructions');
  });

  it('supports multiple rental rates at once', () => {
    let d = coreRental();
    d = answer(d, 'rent_extra_rates', 'weekly $900, daily 250');
    expect(d.price_monthly).toBe(1000);
    expect(d.price_weekly).toBe(900);
    expect(d.price_daily).toBe(250);
    const payload = buildListingPayload(d, ['https://example.com/a.jpg']);
    expect(payload).toMatchObject({ price_monthly: 1000, price_weekly: 900, price_daily: 250, price_hourly: null });
    expect(parseExtraRates('no idea')).toEqual({});
  });

  it('maps sale payment preferences to the current PayPal / in-person fields', () => {
    const base: VendiDraft = { title: null, description: null, category: 'food_truck', mode: 'sale' };
    const inPerson = answer(base, 'payment_prefs', 'in_person');
    expect(buildListingPayload(inPerson, [])).toMatchObject({
      accept_paypal_checkout: false, accept_cash_payment: true,
    });
    const paypal = answer(base, 'payment_prefs', 'paypal');
    expect(buildListingPayload(paypal, [])).toMatchObject({
      accept_paypal_checkout: true, accept_cash_payment: false,
    });
  });

  it('persists static-location and video fields on the payload', () => {
    const kitchen: VendiDraft = {
      title: 'Prep kitchen downtown', description: 'A licensed prep kitchen available by the month.',
      category: 'ghost_kitchen', mode: 'rent', city: 'Mesa', state: 'AZ', price_monthly: 900,
      hours_of_access: 'Mon-Fri 6am-10pm', access_instructions: 'Keypad at side door',
      location_notes: 'Rear loading dock',
    };
    const payload = buildListingPayload(kitchen, ['https://example.com/a.jpg'], ['https://example.com/a.mp4']);
    expect(payload).toMatchObject({
      fulfillment_type: 'on_site',
      hours_of_access: 'Mon-Fri 6am-10pm',
      access_instructions: 'Keypad at side door',
      location_notes: 'Rear loading dock',
      video_urls: ['https://example.com/a.mp4'],
    });
  });

  it('still blocks publishing until the required fields exist', () => {
    const bare: VendiDraft = { title: null, description: null, category: null, mode: null };
    const blockers = getPublishBlockers(bare, 0);
    expect(blockers).toContain('Choose rent or sale.');
    expect(blockers).toContain('Add at least one photo.');
  });
});
