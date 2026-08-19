/**
 * Shared helpers for listing dimensions.
 *
 * Dimensions are stored in INCHES on `listings.length_inches` /
 * `width_inches` / `height_inches`, but sellers think in feet — the wizard
 * therefore collects feet and converts here.
 *
 * Legacy data: some listings were saved with feet typed directly into the
 * inches fields (e.g. an 18 ft truck stored as `18`). `normalizeInches`
 * treats implausibly small values as feet so the detail page still reads
 * correctly instead of showing "1'6\" long".
 */

/** Below this, a value cannot plausibly be a truck/trailer measurement in inches. */
const MIN_PLAUSIBLE_INCHES = 40;

export const normalizeInches = (value?: number | null): number | null => {
  if (!value || value <= 0) return null;
  return value < MIN_PLAUSIBLE_INCHES ? Math.round(value * 12) : Math.round(value);
};

export const inchesToFeet = (value?: number | null): string => {
  const inches = normalizeInches(value);
  if (!inches) return '';
  const feet = inches / 12;
  return String(Math.round(feet * 10) / 10);
};

export const feetToInches = (feet: string | number | null | undefined): number | null => {
  const n = typeof feet === 'number' ? feet : parseFloat(String(feet ?? ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 12);
};

/** `18'` or `18'6"` from a stored inches value. */
export const formatFeetInches = (value?: number | null): string | null => {
  const inches = normalizeInches(value);
  if (!inches) return null;
  const feet = Math.floor(inches / 12);
  const rem = inches % 12;
  return rem > 0 ? `${feet}'${rem}"` : `${feet}'`;
};

/** `24' L × 8'6" W × 12' H` — omits missing parts. */
export const formatDimensionSummary = (
  lengthInches?: number | null,
  widthInches?: number | null,
  heightInches?: number | null,
): string | null => {
  const parts = [
    formatFeetInches(lengthInches) ? `${formatFeetInches(lengthInches)} L` : null,
    formatFeetInches(widthInches) ? `${formatFeetInches(widthInches)} W` : null,
    formatFeetInches(heightInches) ? `${formatFeetInches(heightInches)} H` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' × ') : null;
};
