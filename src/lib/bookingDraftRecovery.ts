import { supabase } from '@/integrations/supabase/client';

/**
 * Abandoned-checkout recovery for rentals.
 *
 * When a renter reaches the review step we save a booking_drafts row so the
 * send-booking-abandonment-emails sweep can follow up by email (2h / 24h).
 * When the booking is paid or the request is sent, the row is marked
 * completed so no recovery email goes out.
 */

export interface BookingDraftRecoveryInput {
  userId: string;
  listingId: string;
  email: string;
  startDate?: string | null; // yyyy-MM-dd
  endDate?: string | null; // yyyy-MM-dd
  totalPrice?: number | null;
  /** Checkout path (with query string) the resume button should reopen. */
  resumePath?: string | null;
}

export interface BookingDraftRow {
  user_id: string;
  listing_id: string;
  email: string;
  start_date: string | null;
  end_date: string | null;
  total_price: number | null;
  resume_path: string | null;
  completed_at: null;
  updated_at: string;
}

/** A resume path must stay on this site's checkout — never an external URL. */
export const isSafeResumePath = (path: string | null | undefined): path is string =>
  typeof path === 'string' && path.startsWith('/book/') && !path.startsWith('//');

export const buildBookingDraftRow = (input: BookingDraftRecoveryInput): BookingDraftRow => ({
  user_id: input.userId,
  listing_id: input.listingId,
  email: input.email.trim().toLowerCase(),
  start_date: input.startDate ?? null,
  end_date: input.endDate ?? null,
  total_price: input.totalPrice ?? null,
  resume_path: isSafeResumePath(input.resumePath) ? input.resumePath : null,
  // A fresh checkout attempt re-arms recovery even if an older draft completed.
  completed_at: null,
  updated_at: new Date().toISOString(),
});

/** Upsert the recovery draft for this renter + listing. Best-effort: never blocks checkout. */
export async function saveBookingDraftForRecovery(input: BookingDraftRecoveryInput): Promise<void> {
  if (!input.userId || !input.listingId || !input.email?.trim()) return;
  const { error } = await supabase
    .from('booking_drafts')
    .upsert(buildBookingDraftRow(input), { onConflict: 'user_id,listing_id' });
  if (error) console.warn('booking draft recovery save failed', error.message);
}

/** Mark the draft completed so the abandonment sweep skips it. */
export async function markBookingDraftCompleted(userId: string, listingId: string): Promise<void> {
  if (!userId || !listingId) return;
  const { error } = await supabase
    .from('booking_drafts')
    .update({ completed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .is('completed_at', null);
  if (error) console.warn('booking draft completion mark failed', error.message);
}
