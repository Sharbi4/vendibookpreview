/**
 * Campus Partner code client. The server validates the code, computes the
 * credit and reserves it; the browser only sends the code and the booking /
 * sale id and shows what the server returns.
 *
 * Analytics carry ids, the transaction type and the code id only: never
 * card or payment details.
 */
import { supabase } from '@/integrations/supabase/client';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

export type CampusCheckoutKind = 'booking' | 'sale';

export interface CampusCodeState {
  ok: boolean;
  applied: boolean;
  transaction_type: 'rental' | 'sale';
  code: string | null;
  partner_name: string | null;
  partner_slug: string | null;
  code_id: string | null;
  credit_cents: number;
  amount_due_cents: number;
  currency: string;
  tax_cents: number;
  /** Set when the request failed validation (bad, expired or used-up code). */
  code_error?: string;
  message?: string;
  /** Set by `status` when a previously applied code stopped qualifying. */
  notice?: string;
  notice_code?: string;
}

export async function campusCodeRequest(
  action: 'apply' | 'status' | 'remove',
  kind: CampusCheckoutKind,
  id: string,
  code?: string,
): Promise<CampusCodeState> {
  const { data, error } = await supabase.functions.invoke('campus-partner-code', {
    body: { action, kind, id, ...(code !== undefined ? { code } : {}) },
  });
  if (error || !data) throw new Error('unavailable');
  return data as CampusCodeState;
}

export type CampusEvent =
  | 'partner_code_entered'
  | 'partner_code_valid'
  | 'partner_code_invalid'
  | 'partner_credit_applied'
  | 'partner_credit_removed'
  | 'partner_checkout_started'
  | 'partner_transaction_completed';

export function trackCampus(
  event: CampusEvent,
  ctx: {
    kind: CampusCheckoutKind;
    targetId?: string;
    listingId?: string | null;
    codeId?: string | null;
    partnerSlug?: string | null;
    creditCents?: number;
    reason?: string;
  },
): void {
  const payload: Record<string, unknown> = {
    transaction_type: ctx.kind === 'booking' ? 'rental' : 'sale',
  };
  if (ctx.targetId) payload[ctx.kind === 'booking' ? 'booking_id' : 'sale_transaction_id'] = ctx.targetId;
  if (ctx.codeId) payload.code_id = ctx.codeId;
  if (ctx.partnerSlug) payload.partner_slug = ctx.partnerSlug;
  if (typeof ctx.creditCents === 'number') payload.credit_cents = Math.round(ctx.creditCents);
  if (ctx.reason) payload.reason = String(ctx.reason).slice(0, 48);
  void trackEventToDb(event, 'campus_partner', payload, ctx.listingId || undefined);
}

export const CAMPUS_FALLBACK_ERROR =
  "That Campus Partner code isn't active. Check the code with your school or continue without it.";
