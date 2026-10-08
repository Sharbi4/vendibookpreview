/**
 * Campus Partner checkout events (category `campus_partner`). Completed and
 * refunded events are written server-side when the payment settles.
 * Payloads carry the code, partner, kind and amounts only, never payment details.
 */
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

export type CampusPartnerEvent =
  | 'partner_code_entered'
  | 'partner_code_valid'
  | 'partner_code_invalid'
  | 'partner_credit_applied'
  | 'partner_credit_removed'
  | 'partner_checkout_started';

export interface CampusPartnerEventContext {
  kind: 'rental' | 'purchase';
  code?: string;
  listingId?: string;
  reason?: string;
  creditCents?: number;
  promoCodeId?: string | null;
  partnerName?: string | null;
}

export function trackCampusPartner(event: CampusPartnerEvent, ctx: CampusPartnerEventContext) {
  const payload: Record<string, unknown> = { kind: ctx.kind, transaction_type: ctx.kind };
  if (ctx.code) payload.code = ctx.code.slice(0, 40);
  if (ctx.reason) payload.reason = ctx.reason.slice(0, 40);
  if (typeof ctx.creditCents === 'number') payload.credit_cents = Math.round(ctx.creditCents);
  if (ctx.promoCodeId) payload.promo_code_id = ctx.promoCodeId;
  if (ctx.partnerName) payload.partner_name = ctx.partnerName.slice(0, 120);
  void trackEventToDb(event, 'campus_partner', payload, ctx.listingId);
}

/** Mirrors the server: case- and whitespace-insensitive. */
export const normalizePartnerCode = (raw: string) => raw.replace(/\s+/g, '').toUpperCase().slice(0, 40);
