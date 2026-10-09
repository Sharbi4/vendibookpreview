import { parseISO } from 'date-fns';

/** Rental dates are calendar days, not midnight UTC instants. */
export function parseRentalDate(value: string): Date {
  return parseISO(value);
}

export function rentalDateRange(start: string, end: string): string | null {
  const first = parseRentalDate(start);
  const last = parseRentalDate(end);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return null;
  return `${first.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
