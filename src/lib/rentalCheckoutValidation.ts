/** Reject malformed or reversed URL dates before quoting or formatting a rental. */
export function isValidRentalDateRange(start?: Date, end?: Date): boolean {
  return !!start && !!end && Number.isFinite(start.getTime()) &&
    Number.isFinite(end.getTime()) && end.getTime() >= start.getTime();
}
