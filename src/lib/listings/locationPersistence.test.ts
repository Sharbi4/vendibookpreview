import { describe, it, expect } from 'vitest';
import {
  buildStructuredListingAddress,
  buildApproxPickupText,
  structuredLocationChanged,
  buildLocationColumns,
  resolveListingCoordinates,
  type GeoCandidate,
} from './locationPersistence';

const input = {
  streetAddress: '2435 Shoal Creek Rd',
  aptSuite: '',
  city: 'Colbert',
  state: 'GA',
  zipCode: '30628',
};

const storedMatching = {
  address: '2435 Shoal Creek Rd, Colbert, GA 30628',
  pickup_location_text: 'Colbert, GA',
  city: 'Colbert',
  state: 'GA',
  postal_code: '30628',
  latitude: 34.0102,
  longitude: -83.2276,
};

describe('buildStructuredListingAddress', () => {
  it('builds the canonical stored address shape', () => {
    expect(buildStructuredListingAddress(input)).toBe('2435 Shoal Creek Rd, Colbert, GA 30628');
  });

  it('omits empty segments', () => {
    expect(buildStructuredListingAddress({ ...input, streetAddress: '' })).toBe('Colbert, GA 30628');
  });
});

describe('buildApproxPickupText', () => {
  it('is city + state only (never street)', () => {
    expect(buildApproxPickupText(input)).toBe('Colbert, GA');
  });
});

describe('structuredLocationChanged', () => {
  it('is false when everything matches (case/whitespace-insensitive)', () => {
    expect(structuredLocationChanged(input, storedMatching)).toBe(false);
    expect(
      structuredLocationChanged({ ...input, city: ' colbert ' }, storedMatching),
    ).toBe(false);
  });

  it('is true when city, state, or ZIP differ', () => {
    expect(structuredLocationChanged({ ...input, city: 'Athens' }, storedMatching)).toBe(true);
    expect(structuredLocationChanged({ ...input, state: 'TN' }, storedMatching)).toBe(true);
    expect(structuredLocationChanged({ ...input, zipCode: '30629' }, storedMatching)).toBe(true);
  });

  it('is true when the street changed against a stored address', () => {
    expect(
      structuredLocationChanged({ ...input, streetAddress: '900 Other Rd' }, storedMatching),
    ).toBe(true);
  });

  it('is true when a street is provided but none was stored', () => {
    expect(structuredLocationChanged(input, { ...storedMatching, address: null })).toBe(true);
  });
});

describe('buildLocationColumns', () => {
  it('always persists city, state and postal_code — a valid selection can never publish with them blank', () => {
    const cols = buildLocationColumns(input, storedMatching);
    expect(cols.city).toBe('Colbert');
    expect(cols.state).toBe('GA');
    expect(cols.postal_code).toBe('30628');
    expect(cols.address).toBe('2435 Shoal Creek Rd, Colbert, GA 30628');
    expect(cols.pickup_location_text).toBe('Colbert, GA');
  });

  it('leaves coordinates untouched when the location did not change', () => {
    const cols = buildLocationColumns(input, storedMatching, { coords: null });
    expect('latitude' in cols).toBe(false);
    expect('longitude' in cols).toBe(false);
  });

  it('writes fresh coordinates when the location changed and geocoding succeeded', () => {
    const changed = { ...input, zipCode: '30620', city: 'Bethlehem' };
    const cols = buildLocationColumns(changed, storedMatching, {
      coords: { lat: 33.9355, lng: -83.7913 },
    });
    expect(cols.latitude).toBe(33.9355);
    expect(cols.longitude).toBe(-83.7913);
    expect(cols.city).toBe('Bethlehem');
    expect(cols.postal_code).toBe('30620');
  });

  it('clears stale coordinates when the location changed but geocoding failed', () => {
    const changed = { ...input, city: 'Athens' };
    const cols = buildLocationColumns(changed, storedMatching, { coords: null });
    expect(cols.latitude).toBeNull();
    expect(cols.longitude).toBeNull();
  });

  it('keeps the previous address when the structured address is empty', () => {
    const cols = buildLocationColumns(
      { streetAddress: '', city: '', state: '', zipCode: '' },
      storedMatching,
      { fallbackAddress: storedMatching.address, fallbackPickupText: storedMatching.pickup_location_text },
    );
    expect(cols.address).toBe(storedMatching.address);
    expect(cols.pickup_location_text).toBe(storedMatching.pickup_location_text);
  });
});

describe('resolveListingCoordinates', () => {
  const geo = (placeName: string, extra: Partial<GeoCandidate> = {}): GeoCandidate => ({
    lat: 34.0102,
    lng: -83.2276,
    placeName,
    ...extra,
  });

  it('accepts a street-level result that anchors to the entered ZIP', async () => {
    const resolved = await resolveListingCoordinates(input, async (q) => {
      expect(q).toBe('2435 Shoal Creek Rd, Colbert, GA 30628');
      return geo('2435 Shoal Creek Rd, Colbert, GA 30628, USA');
    });
    expect(resolved).toEqual({ lat: 34.0102, lng: -83.2276, level: 'address' });
  });

  it('rejects a street-level result for the wrong ZIP and falls back to the ZIP centroid', async () => {
    const queries: string[] = [];
    const resolved = await resolveListingCoordinates(input, async (q) => {
      queries.push(q);
      if (q === '30628') return geo('Colbert, GA 30628', { city: 'Colbert', state: 'GA' });
      return geo('2435 Shoal Creek Rd, Colbert, GA 30601, USA'); // wrong ZIP
    });
    expect(queries).toEqual(['2435 Shoal Creek Rd, Colbert, GA 30628', '30628']);
    expect(resolved?.level).toBe('zip');
  });

  it('rejects a ZIP centroid from the wrong state', async () => {
    const resolved = await resolveListingCoordinates(
      { streetAddress: '', city: 'Colbert', state: 'GA', zipCode: '30628' },
      async () => geo('Colbert, OK 30628', { city: 'Colbert', state: 'OK' }),
    );
    expect(resolved).toBeNull();
  });

  it('returns null when the provider finds nothing confident', async () => {
    const resolved = await resolveListingCoordinates(input, async () => null);
    expect(resolved).toBeNull();
  });

  it('tolerates USPS city-name differences on the ZIP path (ZIP + state are the anchor)', async () => {
    const resolved = await resolveListingCoordinates(
      { streetAddress: '', city: 'Colber', state: 'GA', zipCode: '30628' },
      async () => geo('Colbert, GA 30628', { city: 'Colbert', state: 'GA' }),
    );
    expect(resolved?.level).toBe('zip');
  });
});
