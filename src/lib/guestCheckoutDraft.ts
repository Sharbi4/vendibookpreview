import { supabase } from '@/integrations/supabase/client';

/**
 * Guest checkout recovery: a visitor who isn't signed in leaves just an email
 * at the first checkout step, so the abandonment sweep can email a link back
 * (2h / 24h). Saved server-side by save-guest-checkout-draft.
 */
export interface GuestCheckoutDraftInput {
  flow: 'sale' | 'rental';
  listingId: string;
  email: string;
  totalPrice?: number | null;
  requestOnly?: boolean;
  startDate?: string | null; // yyyy-MM-dd
  endDate?: string | null;
  resumePath?: string | null;
}

export const GUEST_CHECKOUT_EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export const isValidGuestCheckoutEmail = (email: string) => {
  const e = email.trim();
  return e.length >= 5 && e.length <= 200 && GUEST_CHECKOUT_EMAIL_RE.test(e);
};

export type GuestCheckoutDraftResult = { ok: true } | { ok: false; message: string };

export async function saveGuestCheckoutDraft(input: GuestCheckoutDraftInput): Promise<GuestCheckoutDraftResult> {
  if (!isValidGuestCheckoutEmail(input.email)) return { ok: false, message: 'Please enter a valid email address.' };
  try {
    const { data, error } = await supabase.functions.invoke('save-guest-checkout-draft', {
      body: { ...input, email: input.email.trim().toLowerCase() },
    });
    if (error) {
      let message = 'We couldn’t save that right now. Please try again.';
      try {
        const ctx = (error as { context?: Response }).context;
        const parsed = ctx ? await ctx.json() : null;
        if (parsed?.message) message = parsed.message;
      } catch { /* keep generic message */ }
      return { ok: false, message };
    }
    return data?.ok ? { ok: true } : { ok: false, message: 'We couldn’t save that right now. Please try again.' };
  } catch {
    return { ok: false, message: 'We couldn’t save that right now. Please try again.' };
  }
}
