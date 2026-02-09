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

      if (!dateKey) continue;

      const slots = slotsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (slots.length > 0) out[dateKey] = uniqSorted(slots);
    }

    return out;
  }

  if (startDate && timeSlots) {
    const slots = timeSlots
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return slots.length > 0 ? { [startDate]: uniqSorted(slots) } : {};
  }

  return {};
};

export const getTotalSelectedHours = (selections: HourlySelectionsByDate): number =>
  Object.values(selections).reduce((sum, slots) => sum + slots.length, 0);

export const getSelectedDaysCount = (selections: HourlySelectionsByDate): number =>
  Object.keys(selections).length;
