import { supabase } from '@/integrations/supabase/client';

/**
 * Abandoned-checkout recovery for equipment sales.
 *
 * When a signed-in buyer reaches the final sale checkout step (payment or
 * Request to Buy), we save a sale_checkout_drafts row. The abandonment sweep
 * (send-booking-abandonment-emails) follows up at 2h / 24h unless the buyer
 * paid or submitted a request. Best-effort: never blocks checkout.
 */

export interface SaleDraftRecoveryInput {
  userId: string;
  listingId: string;
  email: string;
  totalPrice?: number | null;
  requestOnly: boolean;
  resumePath?: string | null;
}

/** Resume links must stay on this site's sale checkout. */
export const isSafeSaleResumePath = (path: string | null | undefined): path is string =>
  typeof path === 'string' &&
  !path.startsWith('//') &&
  (path.startsWith('/checkout/') || path.startsWith('/purchase-request/'));

export const buildSaleDraftRow = (input: SaleDraftRecoveryInput) => ({
  user_id: input.userId,
  listing_id: input.listingId,
  email: input.email.trim().toLowerCase(),
  total_price: input.totalPrice ?? null,
  request_only: input.requestOnly,
  resume_path: isSafeSaleResumePath(input.resumePath) ? input.resumePath : null,
  // A fresh attempt re-arms recovery.
  completed_at: null,
  email_2h_sent_at: null,
  email_24h_sent_at: null,
  updated_at: new Date().toISOString(),
});

export async function saveSaleDraftForRecovery(input: SaleDraftRecoveryInput): Promise<void> {
  if (!input.userId || !input.listingId || !input.email?.trim()) return;
  const { error } = await supabase
    .from('sale_checkout_drafts')
    .upsert(buildSaleDraftRow(input), { onConflict: 'user_id,listing_id' });
  if (error) console.warn('sale draft recovery save failed', error.message);
}

export async function markSaleDraftCompleted(userId: string | undefined, listingId: string | undefined): Promise<void> {
  if (!userId || !listingId) return;
  const { error } = await supabase
    .from('sale_checkout_drafts')
    .update({ completed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .is('completed_at', null);
  if (error) console.warn('sale draft completion mark failed', error.message);
}
