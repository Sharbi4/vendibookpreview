/**
 * Rental booking funnel events (category `rental_checkout`).
 *
 * Complements the generic checkout_step_view / checkout_abandoned events from
 * checkoutFunnel.ts with the rental-specific milestones. Payloads carry ids,
 * step, flow and provider only: never card data, tokens, names, emails,
 * addresses or provider payloads.
 */
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

export type RentalCheckoutEvent =
  | 'booking_started'
  | 'dates_selected'
  | 'booking_details_completed'
  | 'delivery_selected'
  | 'agreements_completed'
  | 'review_reached'
  | 'payment_started'
  | 'payment_completed'
  | 'booking_completed'
  | 'booking_abandoned'
  | 'square_payment_failed';

export interface RentalCheckoutContext {
  listingId?: string | null;
  bookingId?: string | null;
  step?: number;
  flow?: 'instant' | 'request';
  provider?: 'square' | 'paypal' | null;
  fulfillment?: 'pickup' | 'delivery' | 'on_site';
  /** Stable machine code only (e.g. CARD_DECLINED), never a message. */
  errorCode?: string | null;
  totalCents?: number | null;
}

/** Events that should count once per checkout session and listing. */
const ONCE: ReadonlySet<RentalCheckoutEvent> = new Set([
  'booking_started',
  'review_reached',
  'payment_completed',
  'booking_completed',
  'booking_abandoned',
]);
const fired = new Set<string>();

export function trackRentalCheckout(event: RentalCheckoutEvent, ctx: RentalCheckoutContext = {}): void {
  const key = `${event}:${ctx.listingId ?? ''}:${ctx.bookingId ?? ''}`;
  if (ONCE.has(event)) {
    if (fired.has(key)) return;
    fired.add(key);
  }
  const payload: Record<string, unknown> = {};
  if (ctx.bookingId) payload.booking_id = ctx.bookingId;
  if (typeof ctx.step === 'number') payload.step = ctx.step;
  if (ctx.flow) payload.flow = ctx.flow;
  if (ctx.provider) payload.provider = ctx.provider;
  if (ctx.fulfillment) payload.fulfillment = ctx.fulfillment;
  if (ctx.errorCode) payload.error_code = String(ctx.errorCode).slice(0, 64);
  if (typeof ctx.totalCents === 'number' && Number.isFinite(ctx.totalCents)) payload.total_cents = Math.round(ctx.totalCents);
  void trackEventToDb(event, 'rental_checkout', payload, ctx.listingId || undefined);
}

/** Test hook: forget once-per-session events. */
export function resetRentalCheckoutAnalytics() {
  fired.clear();
}
