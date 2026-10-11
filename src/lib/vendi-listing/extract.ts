/**
 * Deterministic extraction helpers for the "List with Vendi" builder.
 *
 * These parsers only capture facts the user explicitly typed. They never
 * infer, embellish, or invent specifications.
 */

export const US_STATES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY', 'district of columbia': 'DC',
};

const STATE_CODES = new Set(Object.values(US_STATES));

/** Collapse whitespace and strip control characters. */
export function cleanText(raw: string): string {
  return (raw ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a money amount. Accepts "1000", "$1,000", "1000/mo", "1.2k".
 * Returns null when no unambiguous number is present.
 */
export function parseMoney(raw: string): number | null {
  const text = cleanText(raw).toLowerCase();
  const match = text.match(/\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k)?/);
  if (!match) return null;
  const base = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(base) || base <= 0) return null;
  const value = match[2] === 'k' ? base * 1000 : base;
  if (value > 100_000_000) return null;
  return Math.round(value * 100) / 100;
}

/** Yes / no detection. Returns null when the answer is ambiguous. */
export function parseYesNo(raw: string): boolean | null {
  const text = cleanText(raw).toLowerCase();
  if (!text) return null;
  if (/^(y|yes|yeah|yep|sure|ok|okay|true|correct|absolutely)\b/.test(text)) return true;
  if (/^(n|no|nope|nah|false|not now|negative)\b/.test(text)) return false;
  return null;
}

export interface ParsedLocation {
  city: string | null;
  state: string | null;
  zip_code: string | null;
}

/**
 * Parse a free-text location such as "Mesa, AZ", "Spring Hill, Tennessee 37174".
 * Only returns what was explicitly written.
 */
export function parseLocation(raw: string): ParsedLocation {
  const text = cleanText(raw).replace(/^(in|near|at)\s+/i, '');
  if (!text) return { city: null, state: null, zip_code: null };

  const zipMatch = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zip = zipMatch ? zipMatch[1] : null;
  const withoutZip = cleanText(text.replace(/\b\d{5}(?:-\d{4})?\b/, '')).replace(/,\s*$/, '');

  const parts = withoutZip.split(',').map((p) => cleanText(p)).filter(Boolean);
  let city: string | null = null;
  let state: string | null = null;

  const toState = (value: string): string | null => {
    const v = value.trim();
    if (STATE_CODES.has(v.toUpperCase()) && v.length === 2) return v.toUpperCase();
    const full = US_STATES[v.toLowerCase()];
    return full ?? null;
  };

  if (parts.length >= 2) {
    state = toState(parts[parts.length - 1]);
    city = titleCase(parts[state ? parts.length - 2 : parts.length - 1]);
  } else if (parts.length === 1) {
    const tokens = parts[0].split(' ');
    const last = tokens[tokens.length - 1];
    const maybeState = toState(last);
    if (maybeState && tokens.length > 1) {
      state = maybeState;
      city = titleCase(tokens.slice(0, -1).join(' '));
    } else {
      city = titleCase(parts[0]);
    }
  }

  return { city: city || null, state, zip_code: zip };
}

export function titleCase(value: string): string {
  return cleanText(value)
    .split(' ')
    .map((w) => (w.length <= 2 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

/** Split a comma / newline / bullet separated list into clean items. */
export function parseList(raw: string, max = 12): string[] {
  return cleanText(raw)
    .split(/[,\n;•]+/)
    .map((item) => cleanText(item).replace(/^[-*]\s*/, ''))
    .filter((item) => item.length > 1 && item.length <= 60)
    .slice(0, max);
}

export interface ParsedDimensions {
  length_inches: number | null;
  width_inches: number | null;
  height_inches: number | null;
}

/**
 * Parse "20x8x9 ft" / "20 x 8 feet" / "240x96x108 inches".
 * Defaults to feet unless inches are explicitly stated.
 */
export function parseDimensions(raw: string): ParsedDimensions {
  const text = cleanText(raw).toLowerCase();
  const nums = text.match(/(\d+(?:\.\d+)?)\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)(?:\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?))?/);
  if (!nums) return { length_inches: null, width_inches: null, height_inches: null };
  const inInches = /\b(in|inch|inches|")\b/.test(text);
  const factor = inInches ? 1 : 12;
  const conv = (v?: string) => (v == null ? null : Math.round(Number(v) * factor));
  return {
    length_inches: conv(nums[1]),
    width_inches: conv(nums[2]),
    height_inches: conv(nums[3]),
  };
}

/** Detect a user asking to skip the current question. */
export function isSkip(raw: string): boolean {
  return /^(skip|pass|later|not sure|idk|i don'?t know|i dont know|none|n\/a)\b/i.test(cleanText(raw));
}

/**
 * Detect a seller asking for help rather than answering.
 * Vendi explains and re-offers the question; it never invents a value.
 */
export function isHelpRequest(raw: string): boolean {
  const t = cleanText(raw).toLowerCase();
  return /^(help|help me|i need help|help me figure|what does (this|that) mean|what do you mean|i'?m not sure what|explain|why do you need|why are you asking|what should i (put|say|enter))\b/.test(t);
}
