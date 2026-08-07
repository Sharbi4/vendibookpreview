import { describe, it, expect } from 'vitest';
import { createChecklistItems } from '../PublishChecklist';

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
