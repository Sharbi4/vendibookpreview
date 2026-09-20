import { parseRentalDate } from './rentalCheckoutValidation';
export type HourlySelectionsByDate = Record<string, string[]>;

const uniqSorted = (values: string[]) => Array.from(new Set(values)).sort();

/**
 * Parses hourly selections passed via URL params.
 *
 * Supported formats:
 * - hourlyData=date1:07:00,08:00|date2:09:00,10:00
 *   (split on first `:` only — rest is the comma-separated slots)
 * - timeSlots=07:00,08:00 (single-day; requires startDate)
 */
export const parseHourlySelections = (params: {
  startDate: string | null;
  hourlyData: string | null;
  timeSlots: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}): HourlySelectionsByDate => {
  const { startDate, hourlyData, timeSlots } = params;

  if (hourlyData) {
    const out: HourlySelectionsByDate = {};

    for (const part of hourlyData.split('|')) {
      // Split on first `:` only (date is before, slots are after)
      const colonIdx = part.indexOf(':');
      if (colonIdx === -1) continue;

      const dateKey = part.slice(0, colonIdx).trim();
      const slotsRaw = part.slice(colonIdx + 1);

      if (!parseRentalDate(dateKey) || (startDate && dateKey < startDate) || (params.endDate && dateKey > params.endDate)) continue;

      const slots = slotsRaw
        .split(',')
        .map((s) => s.trim())
        .filter((slot) => /^([01]\d|2[0-3]):00$/.test(slot));

      if (slots.length > 0) out[dateKey] = uniqSorted(slots);
    }

    return out;
  }

  if (!timeSlots && startDate && parseRentalDate(startDate) && params.startTime && params.endTime && (!params.endDate || params.endDate === startDate)) {
    const validTime = /^([01]\d|2[0-3]):00$/;
    if (!validTime.test(params.startTime) || !validTime.test(params.endTime)) return {};
    const start = Number(params.startTime.slice(0, 2)), end = Number(params.endTime.slice(0, 2));
    if (end <= start) return {};
    return { [startDate]: Array.from({ length: end - start }, (_, index) => `${String(start + index).padStart(2, '0')}:00`) };
  }

  if (startDate && parseRentalDate(startDate) && timeSlots) {
    const slots = timeSlots
      .split(',')
      .map((s) => s.trim())
      .filter((slot) => /^([01]\d|2[0-3]):00$/.test(slot));

    return slots.length > 0 ? { [startDate]: uniqSorted(slots) } : {};
  }

  return {};
};

export const getTotalSelectedHours = (selections: HourlySelectionsByDate): number =>
  Object.values(selections).reduce((sum, slots) => sum + slots.length, 0);

export const getSelectedDaysCount = (selections: HourlySelectionsByDate): number =>
  Object.keys(selections).length;
