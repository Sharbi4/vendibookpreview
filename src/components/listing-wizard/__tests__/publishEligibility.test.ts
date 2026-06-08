import { describe, it, expect } from 'vitest';
import { createChecklistItems } from '../PublishChecklist';

/**
 * Publish-eligibility tests.
 *
 * These mirror the rules in PublishWizard.handlePublish / getValidationErrors:
 *   canPublish = checklistItems.filter(i => i.required).every(i => i.completed)
 *   stripeRequired = acceptCardPayment
 *   blocked when (stripeRequired && !isOnboardingComplete)
 *
 * Covers both seller scenarios:
 *   1. Stripe-connected seller (card or cash) — can publish
 *   2. Stripe-NOT-connected seller — can publish only when switched to cash-only
 */

const baseReadyState = {
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
  describe('Stripe-connected seller', () => {
    it('can publish a sale listing with card payments enabled', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasStripe: true, requiresStripe: true },
        'review'
      );
      expect(canPublish(items)).toBe(true);
    });

    it('can publish a sale listing with cash-only', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasStripe: true, requiresStripe: false },
        'review'
      );
      expect(canPublish(items)).toBe(true);
    });

    it('can publish a rental listing with card payments', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasStripe: true, requiresStripe: true, isRental: true },
        'review'
      );
      expect(canPublish(items)).toBe(true);
    });
  });

  describe('Stripe-NOT-connected seller', () => {
    it('is BLOCKED from publishing when card payments are enabled', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasStripe: false, requiresStripe: true },
        'review'
      );
      expect(canPublish(items)).toBe(false);
      const stripeItem = items.find((i) => i.id === 'stripe');
      expect(stripeItem).toBeDefined();
      expect(stripeItem?.required).toBe(true);
      expect(stripeItem?.completed).toBe(false);
    });

    it('CAN publish after switching to cash-only (Stripe item is removed)', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasStripe: false, requiresStripe: false },
        'review'
      );
      expect(canPublish(items)).toBe(true);
      expect(items.find((i) => i.id === 'stripe')).toBeUndefined();
    });

    it('is BLOCKED on a rental listing without Stripe (card required)', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasStripe: false, requiresStripe: true, isRental: true },
        'review'
      );
      expect(canPublish(items)).toBe(false);
    });
  });

  describe('Required-field gating (regression guards)', () => {
    it('blocks publish without photos', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasPhotos: false, photoCount: 0, hasStripe: true, requiresStripe: false },
        'review'
      );
      expect(canPublish(items)).toBe(false);
    });

    it('blocks publish without pricing', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasPricing: false, priceSet: undefined, hasStripe: true, requiresStripe: false },
        'review'
      );
      expect(canPublish(items)).toBe(false);
    });

    it('blocks publish without location', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasLocation: false, hasStripe: true, requiresStripe: false },
        'review'
      );
      expect(canPublish(items)).toBe(false);
    });

    it('blocks publish without description', () => {
      const items = createChecklistItems(
        { ...baseReadyState, hasDescription: false, hasStripe: true, requiresStripe: false },
        'review'
      );
      expect(canPublish(items)).toBe(false);
    });
  });
});
