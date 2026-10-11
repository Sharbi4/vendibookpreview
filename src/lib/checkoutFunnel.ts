/**
 * Checkout drop-off tracking.
 *
 * Records which wizard step a buyer or renter reached and where they left the
 * flow, so the admin funnel can show the exact abandonment point. Purely
 * analytics metadata — it never touches totals, payments, or order state.
 */
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

export type CheckoutFlow = 'sale' | 'rental';

/** Step ids mirror the wizard steps in SaleCheckout / BookingCheckout. */
export const CHECKOUT_FUNNEL_STEPS: Record<CheckoutFlow, string[]> = {
  sale: ['review', 'fulfillment', 'details', 'agreement', 'payment'],
  rental: ['review', 'use', 'details', 'agreement', 'payment'],
};

export const checkoutStepId = (flow: CheckoutFlow, step: number): string =>
  CHECKOUT_FUNNEL_STEPS[flow][step - 1] ?? `step_${step}`;

export const CHECKOUT_STEP_VIEW_EVENT = 'checkout_step_view';
export const CHECKOUT_ABANDONED_EVENT = 'checkout_abandoned';
export const CHECKOUT_COMPLETED_EVENT = 'checkout_completed';

type Ctx = {
  flow: CheckoutFlow;
  step: number;
  listingId?: string | null;
};

const meta = ({ flow, step }: Ctx) => ({
  flow,
  step,
  step_id: checkoutStepId(flow, step),
});

/** One step-view per session, per flow, per listing, per step. */
const seen = new Set<string>();

export const trackCheckoutStepView = (ctx: Ctx): void => {
  const key = `${ctx.flow}:${ctx.listingId ?? 'unknown'}:${ctx.step}`;
  if (seen.has(key)) return;
  seen.add(key);
  void trackEventToDb(
    CHECKOUT_STEP_VIEW_EVENT,
    'checkout',
    meta(ctx),
    ctx.listingId || undefined,
  );
};

export const trackCheckoutAbandoned = (
  ctx: Ctx & { reason?: 'left_page' | 'closed_tab' },
): void => {
  void trackEventToDb(
    CHECKOUT_ABANDONED_EVENT,
    'checkout',
    { ...meta(ctx), reason: ctx.reason ?? 'left_page' },
    ctx.listingId || undefined,
  );
};

export const trackCheckoutCompleted = (ctx: Ctx): void => {
  void trackEventToDb(
    CHECKOUT_COMPLETED_EVENT,
    'checkout',
    meta(ctx),
    ctx.listingId || undefined,
  );
};

/** Paths that mean the flow finished rather than was abandoned. */
export const isCheckoutSuccessPath = (path: string): boolean =>
  /^\/(order-tracking|booking-confirmation|payment-success|order)\b/.test(path);
