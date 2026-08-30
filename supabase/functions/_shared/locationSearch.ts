// Shared location normalization + radius-ladder helpers for marketplace search.
// Keeps "Tucson, AZ" / "Atlanta, Georgia" / "85719" / "Arizona" / "AZ" all
// resolvable against listings.city / listings.state / listings.zip_code.

export const STATE_ABBR_BY_NAME: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY',
};

export const STATE_ABBRS = new Set(Object.values(STATE_ABBR_BY_NAME));

export interface ParsedLocation {
  city: string | null;
  state: string | null;   // always 2-letter uppercase
  zip: string | null;     // 5-digit
  /** 'zip' | 'city_state' | 'city' | 'state' | null */
  kind: 'zip' | 'city_state' | 'city' | 'state' | null;
  label: string | null;
}

const EMPTY: ParsedLocation = { city: null, state: null, zip: null, kind: null, label: null };

function toStateCode(raw: string): string | null {
  const t = raw.trim().toLowerCase().replace(/\./g, '');
  if (!t) return null;
  if (t.length === 2 && STATE_ABBRS.has(t.toUpperCase())) return t.toUpperCase();
  return STATE_ABBR_BY_NAME[t] ?? null;
}

/** Normalizes free-text location input into structured city/state/zip. */
export function parseLocationInput(input?: string | null): ParsedLocation {
  const raw = (input ?? '').trim();
  if (!raw) return { ...EMPTY };

  // Drop a trailing country segment ("Tucson, AZ, USA").
  let cleaned = raw.replace(/,\s*(usa|united states|us)\.?$/i, '').trim();

  // ZIP anywhere (e.g. "Tucson, AZ 85719" or bare "85719").
  const zipMatch = cleaned.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zip = zipMatch ? zipMatch[1] : null;
  if (zip) cleaned = cleaned.replace(zipMatch![0], '').replace(/,\s*$/, '').trim();

  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);

  let city: string | null = null;
  let state: string | null = null;

  if (parts.length >= 2) {
    state = toStateCode(parts[parts.length - 1]);
    city = state ? parts.slice(0, -1).join(', ') : parts.join(', ');
  } else if (parts.length === 1) {
    const only = parts[0];
    const asState = toStateCode(only);
    if (asState) {
      state = asState;
    } else {
      // "Tucson AZ" without a comma.
      const m = only.match(/^(.*)\s+([A-Za-z]{2}|[A-Za-z ]+)$/);
      const trailing = m ? toStateCode(m[2]) : null;
      if (m && trailing && m[1].trim()) {
        city = m[1].trim();
        state = trailing;
      } else {
        city = only;
      }
    }
  }

  if (city) city = city.replace(/\s+/g, ' ').trim();
  if (city && !city.length) city = null;

  const kind: ParsedLocation['kind'] = zip
    ? 'zip'
    : city && state
      ? 'city_state'
      : state
        ? 'state'
        : city
          ? 'city'
          : null;

  const label = zip
    ? (city && state ? `${city}, ${state} ${zip}` : zip)
    : city && state
      ? `${city}, ${state}`
      : state ?? city;

  return { city, state, zip, kind, label };
}

/** Escapes a value for use inside a PostgREST `or()` ilike pattern. */
export function escapeOrValue(value: string): string {
  return value.replace(/[,()]/g, ' ').trim();
}

export const RADIUS_LADDER = [25, 50, 100, 250, 500];
export const MIN_RELEVANT_RESULTS = 6;
export const MAX_RADIUS_MILES = 500;

/** Next radius step strictly greater than `current`, capped at 500. */
export function nextRadius(current: number): number | null {
  for (const step of RADIUS_LADDER) {
    if (step > current) return step;
  }
  return current < MAX_RADIUS_MILES ? MAX_RADIUS_MILES : null;
}

export function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
