export function isBookingClosed(status: string | null | undefined): boolean {
  return ['cancelled', 'declined', 'expired', 'completed'].includes(status ?? '');
}
