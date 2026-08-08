import { describe, expect, it } from 'vitest';
import {
  createQuickStartRequestKey,
  isQuickStartLocationReady,
  previousQuickStartStep,
} from './quickStart';

describe('quick-start navigation', () => {
  it('returns to rent-or-sale from location', () => {
    expect(previousQuickStartStep('location')).toBe('mode');
    expect(previousQuickStartStep('mode')).toBe('category');
    expect(previousQuickStartStep('category')).toBeNull();
  });
});

describe('quick-start location gate', () => {
  it('allows a valid manually entered city/state without coordinates', () => {
    expect(isQuickStartLocationReady({ zipCode: '85714', city: 'Tucson', state: 'AZ' })).toBe(true);
  });

  it('rejects incomplete or malformed locations', () => {
    expect(isQuickStartLocationReady({ zipCode: '8571', city: 'Tucson', state: 'AZ' })).toBe(false);
    expect(isQuickStartLocationReady({ zipCode: '85714', city: '', state: 'AZ' })).toBe(false);
    expect(isQuickStartLocationReady({ zipCode: '85714', city: 'Tucson', state: '' })).toBe(false);
  });

  it('creates UUID-shaped retry keys', () => {
    expect(createQuickStartRequestKey()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
