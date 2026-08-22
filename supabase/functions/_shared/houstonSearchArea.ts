export const HOUSTON_SEARCH_STATE = 'TX';

// Houston-only search inclusion set. These values remain display labels; the
// search layer only uses them to broaden a Houston, TX locality request.
export const HOUSTON_AREA_CITIES = [
  'Houston',
  'Magnolia',
  'Cypress',
  'Tomball',
  'Montgomery',
  'Missouri City',
  'Richmond',
] as const;

function normalizeLocality(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getHoustonAreaCities(query?: string | null): readonly string[] | null {
  const raw = (query ?? '').trim();
  if (!raw) return null;

  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 1) {
    return normalizeLocality(parts[0]) === 'houston' ? HOUSTON_AREA_CITIES : null;
  }
  if (parts.length < 2 || normalizeLocality(parts[0]) !== 'houston') return null;

  const state = normalizeLocality(parts[1]);
  return /^(tx|texas)(?:\s|$)/.test(state) ? HOUSTON_AREA_CITIES : null;
}

export function buildHoustonAreaOrFilter(): string {
  const cities = HOUSTON_AREA_CITIES.map((city) => `"${city}"`).join(',');
  return `city.in.(${cities}),address.ilike.%Houston%,title.ilike.%Houston%`;
}
