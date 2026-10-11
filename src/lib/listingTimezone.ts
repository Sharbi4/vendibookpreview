import { formatInTimeZone } from 'date-fns-tz';

/**
 * Availability (blocked dates, blocked times, operating hours, minimum notice)
 * is stored as plain calendar dates and wall-clock times that belong to the
 * listing's own location — not to whoever is browsing. Comparing them against
 * the viewer's browser clock makes a listing look open/closed at the wrong
 * hours whenever the shopper is in a different timezone.
 *
 * These helpers resolve an IANA timezone for a listing from its location, with
 * a safe fallback to the viewer's timezone when the location is unknown.
 */

const STATE_TIMEZONES: Record<string, string> = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix',
  AR: 'America/Chicago', CA: 'America/Los_Angeles', CO: 'America/Denver',
  CT: 'America/New_York', DE: 'America/New_York', DC: 'America/New_York',
  FL: 'America/New_York', GA: 'America/New_York', HI: 'Pacific/Honolulu',
  ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis',
  IA: 'America/Chicago', KS: 'America/Chicago', KY: 'America/New_York',
  LA: 'America/Chicago', ME: 'America/New_York', MD: 'America/New_York',
  MA: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago',
  MS: 'America/Chicago', MO: 'America/Chicago', MT: 'America/Denver',
  NE: 'America/Chicago', NV: 'America/Los_Angeles', NH: 'America/New_York',
  NJ: 'America/New_York', NM: 'America/Denver', NY: 'America/New_York',
  NC: 'America/New_York', ND: 'America/Chicago', OH: 'America/New_York',
  OK: 'America/Chicago', OR: 'America/Los_Angeles', PA: 'America/New_York',
  RI: 'America/New_York', SC: 'America/New_York', SD: 'America/Chicago',
  TN: 'America/Chicago', TX: 'America/Chicago', UT: 'America/Denver',
  VT: 'America/New_York', VA: 'America/New_York', WA: 'America/Los_Angeles',
  WV: 'America/New_York', WI: 'America/Chicago', WY: 'America/Denver',
  PR: 'America/Puerto_Rico',
};

const STATE_NAMES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI',
  minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
  'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY', 'puerto rico': 'PR',
};

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  } catch {
    return 'America/New_York';
  }
}

/** Resolve the listing's local IANA timezone from its state, or longitude. */
export function resolveListingTimeZone(input: {
  state?: string | null;
  longitude?: number | null;
} | null | undefined): string {
  const raw = input?.state?.trim();
  if (raw) {
    const code = raw.length === 2 ? raw.toUpperCase() : STATE_NAMES[raw.toLowerCase()];
    if (code && STATE_TIMEZONES[code]) return STATE_TIMEZONES[code];
  }

  const lng = input?.longitude;
  if (typeof lng === 'number' && Number.isFinite(lng)) {
    if (lng <= -150) return 'Pacific/Honolulu';
    if (lng <= -135) return 'America/Anchorage';
    if (lng <= -115) return 'America/Los_Angeles';
    if (lng <= -100) return 'America/Denver';
    if (lng <= -85) return 'America/Chicago';
    if (lng <= -60) return 'America/New_York';
  }

  return browserTimeZone();
}

/** Today's calendar date (yyyy-MM-dd) in the listing's timezone. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  return formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
}

/** Current hour (0-23) in the listing's timezone. */
export function currentHourInTimeZone(timeZone: string, now: Date = new Date()): number {
  return parseInt(formatInTimeZone(now, timeZone, 'HH'), 10);
}
