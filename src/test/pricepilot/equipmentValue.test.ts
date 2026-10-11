import { describe, it, expect } from 'vitest';
import {
  assessEquipmentValue,
  parseEquipment,
  usedContributionFactors,
  type EquipmentSubjectInput,
} from '../../../supabase/functions/_shared/pricepilot/equipmentValue';

const base = (over: Partial<EquipmentSubjectInput> = {}): EquipmentSubjectInput => ({
  assetCategory: 'food_trailer',
  year: 2020,
  mileage: null,
  condition: 'good',
  operationalStatus: 'running',
  features: {},
  knownIssues: null,
  recentUpgrades: null,
  notes: null,
  ...over,
});

describe('parseEquipment — explicit facts only', () => {
  it('does not invent equipment when nothing is supplied', () => {
    const { components } = parseEquipment(base());
    expect(components).toHaveLength(0);
  });

  it('detects toggles and described equipment', () => {
    const { components } = parseEquipment(
      base({
        features: { hood_fire_suppression: true, generator: true },
        notes: 'Includes a commercial espresso machine and a grinder.',
      }),
    );
    const keys = components.map((c) => c.key);
    expect(keys).toContain('hood');
    expect(keys).toContain('fire_suppression');
    expect(keys).toContain('generator');
    expect(keys).toContain('espresso_machine');
  });

  it('flags missing infrastructure as a deficiency, not a present component', () => {
    const { components, deficiencies } = parseEquipment(base({ notes: 'Bare shell, no hood and no sink installed yet.' }));
    expect(deficiencies.length).toBeGreaterThan(0);
    expect(components.filter((c) => c.status === 'present')).toHaveLength(0);
  });
});

describe('depreciation', () => {
  it('never treats unknown condition as new', () => {
    const f = usedContributionFactors(base({ condition: null, operationalStatus: null, year: null }));
    expect(f.high).toBeLessThan(0.5);
    expect(f.ageKnown).toBe(false);
  });

  it('older units depreciate further than newer ones', () => {
    const newer = usedContributionFactors(base({ year: new Date().getFullYear() - 1 }));
    const older = usedContributionFactors(base({ year: 2005 }));
    expect(older.high).toBeLessThan(newer.high);
  });
});

describe('assessEquipmentValue', () => {
  it('labels replacement cost separately from used contribution and keeps used lower', () => {
    const a = assessEquipmentValue(
      base({ features: { hood_fire_suppression: true, refrigeration: true, plumbing: true, generator: true } }),
    );
    const s = a.section;
    expect(s.estimatedReplacementRangeHigh!).toBeGreaterThan(s.estimatedUsedContributionHigh!);
    expect(s.notes.join(' ')).toMatch(/not resale value/i);
    expect(s.majorComponents[0].estimatedNewRange).toMatch(/\$/);
  });

  it('lets expensive equipment influence price without double counting', () => {
    const loaded = assessEquipmentValue(
      base({
        operationalStatus: 'turnkey',
        features: { hood_fire_suppression: true, refrigeration: true, plumbing: true, generator: true },
        notes: 'Commercial espresso machine, grinder, ice machine, pizza oven.',
      }),
    );
    expect(loaded.priceBias).toBeGreaterThan(0);
    // Hard cap: the equipment layer can never add replacement cost on top of comps.
    expect(loaded.priceBias).toBeLessThanOrEqual(0.08);
    expect(loaded.section.estimatedUsedContributionHigh!).toBeGreaterThan(10000);
    expect(loaded.section.notes.join(' ')).toMatch(/cross-check/i);
  });

  it('treats a bare shell differently from a turnkey equipped trailer', () => {
    const shell = assessEquipmentValue(base({ notes: 'Bare shell trailer, no hood, no plumbing, needs electrical.' }));
    const turnkey = assessEquipmentValue(
      base({
        operationalStatus: 'turnkey',
        features: { hood_fire_suppression: true, refrigeration: true, plumbing: true, generator: true },
      }),
    );
    expect(shell.priceBias).toBeLessThan(0);
    expect(shell.section.buildoutTier).toBe('bare_shell');
    expect(turnkey.section.buildoutTier).toBe('turnkey_premium');
    expect(turnkey.priceBias).toBeGreaterThan(shell.priceBias);
  });

  it('does not estimate a contribution when no equipment is supplied', () => {
    const a = assessEquipmentValue(base());
    expect(a.section.estimatedUsedContributionLow).toBeNull();
    expect(a.section.estimatedReplacementRangeLow).toBeNull();
    expect(a.priceBias).toBe(0);
    expect(a.section.notes.join(' ')).toMatch(/No equipment was supplied/i);
  });

  it('separates food truck chassis from kitchen buildout when year and mileage are supplied', () => {
    const withChassis = assessEquipmentValue(
      base({ assetCategory: 'food_truck', year: 2016, mileage: 120000, features: { plumbing: true } }),
    );
    expect(withChassis.section.notes.join(' ')).toMatch(/Chassis and drivetrain value/i);
    const withoutChassis = assessEquipmentValue(
      base({ assetCategory: 'food_truck', year: null, mileage: null, features: { plumbing: true } }),
    );
    expect(withoutChassis.section.notes.join(' ')).toMatch(/Chassis details .* were not supplied/i);
  });

  it('discounts missing or nonfunctional required infrastructure', () => {
    const ok = assessEquipmentValue(base({ features: { hood_fire_suppression: true, plumbing: true } }));
    const broken = assessEquipmentValue(
      base({ features: { hood_fire_suppression: true, plumbing: true }, knownIssues: 'The generator is broken and needs a water heater.' }),
    );
    expect(broken.priceBias).toBeLessThan(ok.priceBias);
    expect(broken.section.notes.join(' ')).toMatch(/missing or nonfunctional/i);
  });
});
