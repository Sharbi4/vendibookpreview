/**
 * Normalizes weekly schedule keys from full day names to abbreviated keys.
 * e.g., "monday" -> "mon", "tuesday" -> "tue", etc.
 * Already-abbreviated keys pass through unchanged.
 */

const FULL_TO_ABBREV: Record<string, string> = {
  monday: 'mon',
  tuesday: 'tue',
  wednesday: 'wed',
  thursday: 'thu',
  friday: 'fri',
  saturday: 'sat',
  sunday: 'sun',
};

export function normalizeScheduleKeys(schedule: any): any {
  if (!schedule || typeof schedule !== 'object') return null;

  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(schedule)) {
    const lower = key.toLowerCase();
    const mapped = FULL_TO_ABBREV[lower] || lower;
    normalized[mapped] = value;
  }

  return normalized;
}
