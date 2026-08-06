import { describe, expect, it } from 'vitest';
import {
  computeReadiness,
  nextActionsForListing,
  sectionsForListing,
  READINESS_SCORE_VERSION,
} from '@/lib/listings/readiness';

describe('listing readiness scoring', () => {
  it('only counts sections relevant to the category and mode', () => {
    const lotSections = sectionsForListing('vendor_lot', 'rent').map((s) => s.key);
    expect(lotSections).toContain('site');
    expect(lotSections).not.toContain('hood');
    expect(lotSections).not.toContain('mechanical');
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
    const values = Object.fromEntries(
      sections.map((s) => [s.key, Object.fromEntries(s.fields.map((f) => [f.key, 'yes']))]),
    );
    const result = computeReadiness(sections, values);
    expect(result.score).toBe(100);
    expect(result.level).toBe('highly_detailed');
    expect(result.missingSections).toHaveLength(0);
  });

  it('suggests rental terms only for rentals and hides completed sections', () => {
    const rental = nextActionsForListing('food_truck', 'rent', {}).map((a) => a.section);
    expect(rental).toContain('rental_terms');

    const sale = nextActionsForListing('food_truck', 'sale', {}).map((a) => a.section);
    expect(sale).not.toContain('rental_terms');

    const filled = nextActionsForListing('food_truck', 'sale', {
      electrical: {
        shore_power: '50 amp',
        generator: '7kW',
        inverter_battery: 'yes',
        panel_notes: 'ok',
      },
    }).map((a) => a.section);
    expect(filled).not.toContain('electrical');
  });

  it('never proposes actions that do not apply to the category', () => {
    const lot = nextActionsForListing('vendor_lot', 'rent', {}).map((a) => a.section);
    expect(lot).not.toContain('hood');
    expect(lot).not.toContain('cooking');
  });
});
