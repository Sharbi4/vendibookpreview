/**
 * Keeps an in-progress rental checkout across refresh and back/forward
 * navigation. Dates, slot and hours already live in the URL; this stores the
 * rest of the renter's progress for that exact selection.
 *
 * Never stores card data, tokens or agreement acceptance: agreement boxes
 * always start unticked, and consent is recorded server-side when accepted.
 *
 * `requestKey` is sent with the booking insert (booking_requests
 * .client_request_key, unique per renter), so retrying the same checkout can
 * never create a second booking request.
 */
export interface RentalCheckoutDraft {
  step: number;
  furthestStep: number;
  fulfillment?: 'pickup' | 'delivery' | 'on_site';
  deliveryAddress?: string;
  message?: string;
  requestKey: string;
  bookingId?: string | null;
  savedAt: number;
}

const PREFIX = 'vb:rental-checkout:v1:';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function rentalDraftKey(parts: {
  listingId: string;
  start?: string | null;
  end?: string | null;
  slot?: string | null;
  hourly?: string | null;
}) {
  return `${PREFIX}${parts.listingId}:${parts.start ?? ''}:${parts.end ?? ''}:${parts.slot ?? ''}:${parts.hourly ?? ''}`;
}

const storage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

export function loadRentalDraft(key: string): RentalCheckoutDraft | null {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as RentalCheckoutDraft;
    if (!draft || typeof draft.requestKey !== 'string' || Date.now() - Number(draft.savedAt) > MAX_AGE_MS) {
      storage()?.removeItem(key);
      return null;
    }
    const step = Math.min(5, Math.max(1, Math.round(Number(draft.step) || 1)));
    const furthestStep = Math.min(5, Math.max(step, Math.round(Number(draft.furthestStep) || step)));
    return { ...draft, step, furthestStep };
  } catch {
    return null;
  }
}

export function saveRentalDraft(key: string, draft: Omit<RentalCheckoutDraft, 'savedAt'>) {
  try {
    storage()?.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    /* storage full or blocked: checkout still works, it just won't resume */
  }
}

export function clearRentalDraft(key: string) {
  try {
    storage()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function newRequestKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}
