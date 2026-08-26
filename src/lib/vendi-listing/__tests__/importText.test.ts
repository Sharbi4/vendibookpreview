import { describe, expect, it } from 'vitest';
import { parseExistingListing } from '../importText';
import { nextQuestion, QUESTIONS, type VendiDraft } from '../script';

const empty: VendiDraft = { title: null, description: null, category: null, mode: null };

describe('parseExistingListing', () => {
  it('extracts explicit title, description, category, location and rental rate', () => {
    const result = parseExistingListing(
      [
        '2019 Coffee Trailer, turnkey and ready',
        'Fully equipped concession trailer with espresso setup.',
        'Price: $1,000 per month',
        'Location: Spring Hill, TN 37174',
      ].join('\n'),
    );

    expect(result.patch.title).toBe('2019 Coffee Trailer, turnkey and ready');
    expect(result.patch.category).toBe('food_trailer');
    expect(result.patch.city).toBe('Spring Hill');
    expect(result.patch.state).toBe('TN');
    expect(result.patch.zip_code).toBe('37174');
    expect(result.patch.mode).toBe('rent');
    expect(result.patch.price_monthly).toBe(1000);
    expect(result.answered).toEqual(expect.arrayContaining(['title', 'description', 'category', 'location', 'rent_price']));
  });

  it('never guesses the sale price — an unlabelled amount becomes a confirmation', () => {
    const result = parseExistingListing('Food truck for sale in Mesa, AZ\nRuns great. $45,000 obo.');
    expect(result.patch.price_sale).toBeUndefined();
    const confirm = result.confirms.find((c) => c.id === 'confirm:price_sale');
    expect(confirm?.patch).toEqual({ mode: 'sale', price_sale: 45000 });
  });

  it('does not invent specs that were not written', () => {
    const result = parseExistingListing('Nice trailer, message me for details.');
    expect(result.patch.length_inches).toBeUndefined();
    expect(result.patch.amenities).toBeUndefined();
    expect(result.patch.price_sale).toBeUndefined();
  });

  it('skips questions the paste already answered', () => {
    const result = parseExistingListing(
      '2019 Coffee Trailer, turnkey and ready\nFully equipped concession trailer with espresso setup.\nPrice: $1,000 per month\nLocation: Spring Hill, TN',
    );
    const draft = { ...empty, ...(result.patch as Partial<VendiDraft>) } as VendiDraft;
    const answered = ['import_choice', 'import_paste', ...result.answered];
    const next = nextQuestion(draft, answered);
    expect(['title', 'description', 'location', 'rent_price']).not.toContain(next?.id);
  });

  it('offers the import step before any category or mode question', () => {
    expect(QUESTIONS[0].id).toBe('import_choice');
    expect(QUESTIONS[1].id).toBe('import_paste');
    expect(QUESTIONS[1].optional).toBe(true);
  });
});
