export type ExpiringOffer = {
  status: string; created_at: string; expires_at: string | null;
  responded_at?: string | null; counter_expires_at?: string | null;
};
const plus48Hours = (value: string) => Date.parse(value) + 48 * 60 * 60 * 1000;

/** Mirrors backend deadlines, including legacy rows with missing deadlines. */
export function offerDeadline(offer: ExpiringOffer): number {
  if (offer.status === 'countered') {
    return offer.counter_expires_at ? Date.parse(offer.counter_expires_at)
      : offer.responded_at ? plus48Hours(offer.responded_at)
      : offer.expires_at ? Date.parse(offer.expires_at) : plus48Hours(offer.created_at);
  }
  return offer.expires_at ? Date.parse(offer.expires_at) : plus48Hours(offer.created_at);
}
export function effectiveOfferStatus(offer: ExpiringOffer, now = Date.now()): string {
  if (!['pending','countered'].includes(offer.status)) return offer.status;
  const deadline = offerDeadline(offer);
  return !Number.isFinite(deadline) || deadline <= now ? 'expired' : offer.status;
}
