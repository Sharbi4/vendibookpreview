/**
 * Best-effort split of a Google-formatted address string into the discrete
 * fields the buyer-details step collects. Purely a convenience prefill — the
 * buyer can always correct any field, and nothing downstream depends on it.
 *
 * Handles the common shape: "123 Main St, Austin, TX 78701, USA"
 */
export interface ParsedAddress {
  address1: string;
  city: string;
  state: string;
  zipCode: string;
}

const US_SUFFIXES = new Set(['usa', 'us', 'united states']);

export const parseFormattedAddress = (formatted: string): ParsedAddress | null => {
  if (!formatted?.trim()) return null;

  const parts = formatted
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !US_SUFFIXES.has(p.toLowerCase()));

  if (parts.length < 3) return null;

  const last = parts[parts.length - 1];
  const stateZip = last.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!stateZip) return null;

  return {
    address1: parts.slice(0, parts.length - 2).join(', '),
    city: parts[parts.length - 2],
    state: stateZip[1].toUpperCase(),
    zipCode: stateZip[2],
  };
};
