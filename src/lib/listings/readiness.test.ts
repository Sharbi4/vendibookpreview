import { describe, expect, it } from 'vitest';
import {
  computeReadiness,
  nextActionsForListing,
  sectionsForListing,
  SPEC_SECTIONS,
  READINESS_SCORE_VERSION,
  SpecValues,
} from '@/lib/listings/readiness';

/** Fills every section of a listing, including the custom-shaped ones. */
const fillAll = (category: string, mode: string): SpecValues => {
  const sections = sectionsForListing(category, mode);
  const values: SpecValues = {};
  for (const section of sections) {
    if (section.custom === 'equipment') {
      values[section.key] = {
        items: Array.from({ length: 8 }, (_, i) => ({
          id: `eq_${i}`,
          group: 'cooking',
          name: `Item ${i}`,
        })),
      };
    } else if (section.custom === 'ownership') {
      values[section.key] = {
        title_summary: 'Clean title',
        documents_available: true,
        authority_to_sell_confirmed: true,
      };
    } else {
      values[section.key] = Object.fromEntries(section.fields.map((f) => [f.key, 'yes']));
    }
  }
  return values;
};

describe('listing readiness scoring (v2)', () => {
  it('only counts sections relevant to the category and mode', () => {
    const lotSections = sectionsForListing('vendor_lot', 'rent').map((s) => s.key);
    expect(lotSections).toContain('space');
    expect(lotSections).not.toContain('safety');
    expect(lotSections).not.toContain('vehicle');
    expect(lotSections).not.toContain('trailer');
  });

  it('gives trucks and trailers their own branch', () => {
    const truck = sectionsForListing('food_truck', 'sale').map((s) => s.key);
    const trailer = sectionsForListing('food_trailer', 'sale').map((s) => s.key);
    expect(truck).toContain('vehicle');
    expect(truck).not.toContain('trailer');
    expect(trailer).toContain('trailer');
    expect(trailer).not.toContain('vehicle');
  });

  it('does not penalise a listing for non-applicable fields', () => {
    const truck = computeReadiness(sectionsForListing('food_truck', 'sale'), {});
    const lot = computeReadiness(sectionsForListing('vendor_lot', 'rent'), {});
    expect(truck.score).toBe(0);
    expect(lot.score).toBe(0);
    expect(truck.version).toBe(READINESS_SCORE_VERSION);
  });

  it('never reports a level below "published"', () => {
    const result = computeReadiness(sectionsForListing('food_truck', 'sale'), {});
    expect(result.level).toBe('published');
  });

  it('raises the level as relevant details are added', () => {
    const sections = sectionsForListing('food_truck', 'sale');
    const result = computeReadiness(sections, fillAll('food_truck', 'sale'));
    expect(result.score).toBe(100);
    expect(result.level).toBe('highly_detailed');
    expect(result.missingSections).toHaveLength(0);
  });

  it('scores every supported category and mode without throwing', () => {
    const categories = ['food_truck', 'food_trailer', 'ghost_kitchen', 'vendor_lot', 'vendor_space'];
    for (const category of categories) {
      for (const mode of ['rent', 'sale']) {
        const sections = sectionsForListing(category, mode);
        expect(sections.length).toBeGreaterThan(0);
        expect(computeReadiness(sections, {}).score).toBe(0);
        expect(computeReadiness(sections, fillAll(category, mode)).score).toBe(100);
      }
    }
  });

  it('treats old listings with null buckets as simply empty', () => {
    const sections = sectionsForListing('food_truck', 'sale');
    const values = Object.fromEntries(
      sections.map((s) => [s.key, undefined as unknown as Record<string, unknown>]),
    );
    expect(computeReadiness(sections, values).score).toBe(0);
  });

  it('suggests rental terms only for rentals and hides completed sections', () => {
    const rental = nextActionsForListing('food_truck', 'rent', {}).map((a) => a.section);
    expect(rental).toContain('rental_terms');

    const sale = nextActionsForListing('food_truck', 'sale', {}).map((a) => a.section);
    expect(sale).not.toContain('rental_terms');

    const confirmed = nextActionsForListing('food_truck', 'rent', {}, true).map((a) => a.section);
    expect(confirmed).not.toContain('rental_terms');

    const utilities = SPEC_SECTIONS.find((s) => s.key === 'utilities')!;
    const filled = nextActionsForListing('food_truck', 'sale', {
      utilities: Object.fromEntries(utilities.fields.map((f) => [f.key, 'yes'])),
    }).map((a) => a.section);
    expect(filled).not.toContain('utilities');
  });

  it('never proposes actions that do not apply to the category', () => {
    const lot = nextActionsForListing('vendor_lot', 'rent', {}).map((a) => a.section);
    expect(lot).not.toContain('safety');
    expect(lot).not.toContain('equipment_inventory');
    expect(lot).not.toContain('vehicle');
  });
});
