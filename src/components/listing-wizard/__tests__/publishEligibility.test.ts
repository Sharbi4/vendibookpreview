import { describe, it, expect } from 'vitest';
import { createChecklistItems } from '../PublishChecklist';
import { getStageRequirements } from '@/lib/listings/stages';

/**
 * Publish-eligibility tests.
 *
 * Payouts are manual (no merchant onboarding). Publishing is gated only by
 * listing content completeness:
 *   canPublish = checklistItems.filter(i => i.required).every(i => i.completed)
 */const baseReadyState = {
  hasPhotos: true,
  hasPricing: true,
  hasAvailability: true,
  hasDescription: true,
  hasLocation: true,
  isRental: false,
  photoCount: 5,
  descriptionLength: 200,
  priceSet: '$10,000',
};

const canPublish = (items: ReturnType<typeof createChecklistItems>) =>
  items.filter((i) => i.required).every((i) => i.completed);

describe('Listing publish eligibility', () => {
  describe('No merchant onboarding gate', () => {
    it('can publish a sale listing with card payments enabled', () => {
      const items = createChecklistItems({ ...baseReadyState }, 'review');
      expect(canPublish(items)).toBe(true);
      expect(items.find((i) => i.id === 'stripe')).toBeUndefined();
    });

    it('can publish a rental listing', () => {
      const items = createChecklistItems({ ...baseReadyState, isRental: true }, 'review');
      expect(canPublish(items)).toBe(true);
      expect(items.find((i) => i.id === 'stripe')).toBeUndefined();
    });
  });

  describe('Verified Seller is never a publish gate', () => {
    it('publishes with no identity-verification checklist item at all', () => {
      const items = createChecklistItems({ ...baseReadyState }, 'review');
      const identityGates = items.filter((i) =>
        /verif|identity|plaid|badge/i.test(`${i.id} ${i.label ?? ''}`),
      );
      expect(identityGates).toHaveLength(0);
      expect(canPublish(items)).toBe(true);
    });

    it('publishes for a rental seller who has never bought verification', () => {
      const items = createChecklistItems({ ...baseReadyState, isRental: true }, 'review');
      expect(items.filter((i) => i.required).every((i) => i.completed)).toBe(true);
    });
  });

  describe('Required-field gating (regression guards)', () => {
    it('blocks publish without photos', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasPhotos: false, photoCount: 0 },
        'review'
      );
      expect(canPublish(items)).toBe(false);
    });

    it('blocks publish without pricing', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasPricing: false, priceSet: undefined },
        'review'
      );
      expect(canPublish(items)).toBe(false);
    });

    it('blocks publish without location', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasLocation: false },
        'review'
      );
      expect(canPublish(items)).toBe(false);
    });

    it('blocks publish without description', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasDescription: false },
        'review'
      );
      expect(canPublish(items)).toBe(false);
    });
  });
});

/**
 * Content requirements are the single source of truth on Review/Publish.
 * They must never include an account-level gate (identity verification,
 * payout setup, or legacy merchant onboarding).
 */
describe('getStageRequirements is content-only', () => {
  const completeSale = {
    mode: 'sale' as const,
    category: 'food_truck' as const,
    condition: 'good',
    operationalStatus: 'runs_drives',
    titleStatus: 'clean',
    hasLien: 'no',
    noKnownProblems: true,
    knownProblems: [],
    includedItems: 'Full kitchen build-out',
    photosExclusionsAnswered: true,
    // Sale listings must carry exterior dimensions (added with the freight/
    // delivery estimator) — content-only, still no account gates.
    lengthInches: 288,
    heightInches: 120,
  };

  it('returns no requirements when all content answers exist', () => {
    expect(getStageRequirements(completeSale)).toHaveLength(0);
  });

  it('never asks for identity verification, payout, or merchant onboarding', () => {
    const missing = getStageRequirements({
      ...completeSale,
      condition: null,
      operationalStatus: null,
      titleStatus: null,
      hasLien: null,
      noKnownProblems: false,
      includedItems: null,
      photosExclusionsAnswered: false,
    });
    expect(missing.length).toBeGreaterThan(0);
    for (const req of missing) {
      expect(`${req.fieldId} ${req.label}`).not.toMatch(
        /verif|identity|plaid|payout|bank|stripe|connect|onboard/i,
      );
      // Every requirement must be navigable to a real wizard step.
      expect(typeof req.step).toBe('string');
      expect(req.step.length).toBeGreaterThan(0);
    }
  });

  it('does not require title or lien answers for rentals', () => {
    const missing = getStageRequirements({
      ...completeSale,
      mode: 'rent',
      titleStatus: null,
      hasLien: null,
    });
    expect(missing).toHaveLength(0);
  });

  it('requires the title and lien disclosures for titled sale assets', () => {
    const missing = getStageRequirements({
      ...completeSale,
      titleStatus: null,
      hasLien: null,
    });
    expect(missing.map((m) => m.fieldId)).toEqual(
      expect.arrayContaining(['listing-title-status', 'listing-lien']),
    );
  });
});
