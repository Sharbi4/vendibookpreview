/** PostgREST rejects with plain objects, not necessarily Error instances. */
export function listingPublishError(error: unknown): { message: string; limitReached: boolean } {
  const object = error && typeof error === 'object' ? error as Record<string, unknown> : null;
  const raw = typeof object?.message === 'string' ? object.message : typeof error === 'string' ? error : '';
  const code = typeof object?.code === 'string' ? object.code : '';
  const result = (message: string, limitReached = false) => ({ message, limitReached });
  if (/listing_publish_limit_reached/i.test(raw)) {
    return result('Your active listing limit has been reached. Review your listings or plan before publishing.', true);
  }
  if (/JWT|token.*expired/i.test(raw) || code === 'PGRST301') {
    return result('Please sign in again, then retry publishing. Keep this page open so you can recover your answers.');
  }
  if (code === '42501' || /row-level security|permission denied|not authorized/i.test(raw)) {
    return result('Publishing was not permitted for this account. Confirm you are signed in as the listing owner, or contact support.');
  }
  if (code === '23502' || /null value in column/i.test(raw)) {
    return result('A required listing detail is missing. Review the full editor before publishing.');
  }
  if (code === '23514' || /violates check constraint/i.test(raw)) {
    return result('A listing detail could not be accepted. Review your pricing, location and availability in the full editor.');
  }
  if (/network|fetch failed|failed to fetch|load failed/i.test(raw)) {
    return result('We could not reach the server. Check your connection, then retry publishing.');
  }
  // Keep application-authored errors; never expose database details/row data.
  if (error instanceof Error && !code && raw) return result(raw);
  return result('We could not confirm publishing. Keep this page open and retry, or contact support with your listing ID.');
}
