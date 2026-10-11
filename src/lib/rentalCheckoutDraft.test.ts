import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRentalDraft, loadRentalDraft, rentalDraftKey, saveRentalDraft } from './rentalCheckoutDraft';

const key = rentalDraftKey({ listingId: 'l1', start: '2026-11-01', end: '2026-11-03' });

describe('rental checkout draft', () => {
  beforeEach(() => sessionStorage.clear());

  it('round-trips progress for the same selection', () => {
    saveRentalDraft(key, { step: 3, furthestStep: 4, requestKey: 'k1', fulfillment: 'delivery', deliveryAddress: '1 Main St' });
    expect(loadRentalDraft(key)).toMatchObject({ step: 3, furthestStep: 4, requestKey: 'k1', fulfillment: 'delivery' });
  });

  it('keys drafts by dates so a new selection starts fresh', () => {
    saveRentalDraft(key, { step: 3, furthestStep: 3, requestKey: 'k1' });
    expect(loadRentalDraft(rentalDraftKey({ listingId: 'l1', start: '2026-11-02', end: '2026-11-03' }))).toBeNull();
  });

  it('expires after a day and clamps bad steps', () => {
    saveRentalDraft(key, { step: 9, furthestStep: 2, requestKey: 'k1' });
    expect(loadRentalDraft(key)).toMatchObject({ step: 5, furthestStep: 5 });
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 25 * 3600 * 1000);
    expect(loadRentalDraft(key)).toBeNull();
    vi.restoreAllMocks();
  });

  it('never stores agreement acceptance', () => {
    saveRentalDraft(key, { step: 4, furthestStep: 4, requestKey: 'k1' });
    expect(sessionStorage.getItem(key)).not.toMatch(/accept|agree/i);
    clearRentalDraft(key);
    expect(loadRentalDraft(key)).toBeNull();
  });
});
