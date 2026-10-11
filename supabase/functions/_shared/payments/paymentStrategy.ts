/**
 * Deterministic payment policy for Vendibook rentals and sales.
 *
 * This is the ONLY place that decides whether a transaction captures money
 * immediately, places a PayPal payment authorization (a temporary hold) that
 * is captured later, collects a disclosed reservation deposit now with the
 * balance due closer to the rental, or is settled in person.
 *
 * Pure and side-effect free on purpose: edge functions and the vitest suite
 * both import this exact file, so server behaviour and tests can never drift.
 *
 * Vocabulary: "payment authorization" / "temporary hold". Never "escrow", and
 * never "Vendibook is holding your money" — PayPal holds it, we do not.
 */

/** PayPal's strongest capture window after an authorization is created. */
export const AUTHORIZATION_HONOR_DAYS = 3;
/** PayPal's outer limit. We never design a flow that relies on reaching it. */
export const AUTHORIZATION_MAX_DAYS = 29;
/**
 * Longest booking lead time we are willing to secure with a single
 * authorization. Comfortably inside the 29-day ceiling so a re-check,
 * a support pause, or a weekend can never push a capture past expiry.
 */
export const DEFAULT_SHORT_LEAD_MAX_DAYS = 10;
/** How far before the rental starts the remaining balance becomes due. */
export const DEFAULT_BALANCE_DUE_LEAD_DAYS = 7;

export const DAY_MS = 86_400_000;

export type TransactionMode = "sale" | "rent";

export type PaymentMethod = "paypal" | "card" | "in_person";

export type PaymentStrategyName =
  /** Charge the full amount now (today's default behaviour). */
  | "immediate_capture"
  /** Place a temporary hold now, capture after the gating step clears. */
  | "authorize_then_capture"
  /** Charge the disclosed reservation deposit now; balance due later. */
  | "deposit_now_balance_later"
  /** Cash / pay-in-person. PayPal is not involved at all. */
  | "pay_in_person"
  /** Host has not decided yet — never hold a renter's funds pre-decision. */
  | "awaiting_host_approval"
  /** A pre-booking document requirement is still outstanding. */
  | "blocked_pending_requirements";

export type PaymentIntent = "CAPTURE" | "AUTHORIZE" | "NONE";

export interface PaymentStrategyContext {
  mode: TransactionMode;
  /** Total the buyer/renter owes for the rental or purchase, in cents.
   * For rentals this INCLUDES the refundable security deposit, which is
   * charged today and held by the platform (refunded after the rental minus
   * any damages / fees). */
  grossCents: number;
  /**
   * Refundable damage/security deposit in cents. Surfaced separately for
   * tracking/refund. For rentals it is part of `grossCents` (charged today,
   * never treated as revenue or seller proceeds).
   */
  securityDepositCents?: number;
  /** Disclosed, non-refundable-per-terms reservation deposit, in cents. */
  reservationDepositCents?: number;
  paymentMethod?: PaymentMethod;

  // ---- rental inputs
  instantBook?: boolean;
  /** ISO timestamp the booking starts. */
  bookingStartAt?: string | null;
  /** Host approval decision for request-to-book. */
  hostApproved?: boolean | null;
  hostDeclined?: boolean;

  // ---- sale inputs
  /** Online sale where the seller must accept / sign before we take money. */
  requiresSellerAcceptance?: boolean;

  /** Requirements that must be satisfied BEFORE booking/payment may proceed. */
  unmetPreBookingRequirements?: string[];

  /** Evaluation clock. Defaults to now — injected by tests. */
  now?: Date;

  // ---- tunables (config, not magic numbers at the call site)
  shortLeadMaxDays?: number;
  balanceDueLeadDays?: number;
}

export interface PaymentStrategyDecision {
  strategy: PaymentStrategyName;
  /** PayPal Orders v2 intent to use for the next order, if any. */
  intent: PaymentIntent;
  /** Amount to place a temporary hold on now. */
  authorizeCents: number;
  /** Amount to actually charge now. */
  captureNowCents: number;
  /** Amount still owed after this step. */
  balanceDueCents: number;
  /** When the remaining balance becomes payable, ISO or null. */
  balanceDueAt: string | null;
  /** Refundable security deposit, surfaced separately from the rental charge. */
  securityDepositCents: number;
  /** Latest moment a resulting authorization could still be captured. */
  authorizationExpiresAt: string | null;
  /** End of PayPal's strongest capture window. */
  honorPeriodEndsAt: string | null;
  /** True when no money movement may be attempted yet. */
  blocked: boolean;
  /** Machine-readable justification, safe to log and store. */
  reason: string;
  /** Buyer-facing sentence. Never uses "escrow" or "we hold your funds". */
  buyerMessage: string;
}

const cents = (n: number | null | undefined) => Math.max(0, Math.round(Number(n ?? 0)));

const usd = (c: number) =>
  `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Whole days between now and the booking start. Negative when in the past. */
export function leadTimeDays(startAt: string | null | undefined, now: Date): number | null {
  if (!startAt) return null;
  const start = new Date(startAt).getTime();
  if (!Number.isFinite(start)) return null;
  return (start - now.getTime()) / DAY_MS;
}

/**
 * Decides how a single transaction should move money. Callers persist the
 * result (`payment_strategy`, `payment_intent`, amounts) alongside the
 * payment record so the decision is auditable after the fact.
 */
export function determinePaymentStrategy(
  ctx: PaymentStrategyContext,
): PaymentStrategyDecision {
  const now = ctx.now ?? new Date();
  const gross = cents(ctx.grossCents);
  const securityDeposit = cents(ctx.securityDepositCents);
  const reservationDeposit = Math.min(cents(ctx.reservationDepositCents), gross);
  const shortLeadMaxDays = ctx.shortLeadMaxDays ?? DEFAULT_SHORT_LEAD_MAX_DAYS;
  const balanceLead = ctx.balanceDueLeadDays ?? DEFAULT_BALANCE_DUE_LEAD_DAYS;

  const base = {
    authorizeCents: 0,
    captureNowCents: 0,
    balanceDueCents: 0,
    balanceDueAt: null as string | null,
    securityDepositCents: securityDeposit,
    authorizationExpiresAt: null as string | null,
    honorPeriodEndsAt: null as string | null,
    blocked: false,
  };

  const holdWindow = () => ({
    authorizationExpiresAt: new Date(now.getTime() + AUTHORIZATION_MAX_DAYS * DAY_MS).toISOString(),
    honorPeriodEndsAt: new Date(now.getTime() + AUTHORIZATION_HONOR_DAYS * DAY_MS).toISOString(),
  });

  // 1. Pay in person never touches PayPal.
  if (ctx.paymentMethod === "in_person") {
    return {
      ...base,
      strategy: "pay_in_person",
      intent: "NONE",
      reason: "payment_method_in_person",
      buyerMessage: "You'll settle this in person. No online payment is taken.",
    };
  }

  // 2. Genuine pre-booking blockers stop every money movement.
  const blockers = (ctx.unmetPreBookingRequirements ?? []).filter(Boolean);
  if (blockers.length > 0) {
    return {
      ...base,
      strategy: "blocked_pending_requirements",
      intent: "NONE",
      blocked: true,
      reason: `unmet_pre_booking_requirements:${blockers.length}`,
      buyerMessage:
        "A required document is still outstanding. Nothing is charged or held until it's approved.",
    };
  }

  // ------------------------------------------------------------------ sale
  if (ctx.mode === "sale") {
    if (ctx.requiresSellerAcceptance === false) {
      return {
        ...base,
        strategy: "immediate_capture",
        intent: "CAPTURE",
        captureNowCents: gross,
        reason: "sale_no_seller_gate",
        buyerMessage: "Your payment is processed now.",
      };
    }
    // Default for online marketplace sales: hold now, capture only after the
    // seller accepts and the Bill of Sale stage completes.
    const window = holdWindow();
    return {
      ...base,
      ...window,
      strategy: "authorize_then_capture",
      intent: "AUTHORIZE",
      authorizeCents: gross,
      reason: "sale_awaiting_seller_acceptance",
      buyerMessage:
        `PayPal places a temporary hold of ${usd(gross)}. You are not charged until the seller accepts and the bill of sale is signed.`,
    };
  }

  // ---------------------------------------------------------------- rental
  if (ctx.hostDeclined) {
    return {
      ...base,
      strategy: "awaiting_host_approval",
      intent: "NONE",
      blocked: true,
      reason: "host_declined",
      buyerMessage: "This request was declined. Nothing was charged or held.",
    };
  }

  const instant = !!ctx.instantBook;
  if (!instant && ctx.hostApproved !== true) {
    // Request-to-book: never hold a renter's money before the host decides.
    return {
      ...base,
      strategy: "awaiting_host_approval",
      intent: "NONE",
      blocked: true,
      reason: "awaiting_host_decision",
      buyerMessage:
        "Your request goes to the host first. No payment is taken or held until they approve.",
    };
  }

  const lead = leadTimeDays(ctx.bookingStartAt, now);

  // Short-lead: a hold is appropriate and can be captured inside the window.
  if (lead === null || lead <= shortLeadMaxDays) {
    const window = holdWindow();
    return {
      ...base,
      ...window,
      strategy: "authorize_then_capture",
      intent: "AUTHORIZE",
      authorizeCents: gross,
      reason: lead === null ? "rental_unknown_start_treated_as_short_lead" : "rental_short_lead",
      buyerMessage:
        `PayPal places a temporary hold of ${usd(gross)} to confirm your booking. The charge is completed shortly after.`,
    };
  }

  // Long-lead with a disclosed reservation deposit: charge the deposit now.
  if (reservationDeposit > 0) {
    const start = new Date(ctx.bookingStartAt as string).getTime();
    const dueAt = new Date(Math.max(now.getTime(), start - balanceLead * DAY_MS)).toISOString();
    const balance = Math.max(0, gross - reservationDeposit);
    return {
      ...base,
      strategy: "deposit_now_balance_later",
      intent: "CAPTURE",
      captureNowCents: reservationDeposit,
      balanceDueCents: balance,
      balanceDueAt: dueAt,
      reason: "rental_long_lead_with_reservation_deposit",
      buyerMessage:
        `Your ${usd(reservationDeposit)} reservation deposit is charged now. Remaining balance: ${usd(balance)}, due before your rental starts.`,
    };
  }

  // Long-lead, no deposit configured: we do NOT place a months-long hold and
  // we do NOT pretend funds are secured. Collect the rental now, as today.
  return {
    ...base,
    strategy: "immediate_capture",
    intent: "CAPTURE",
    captureNowCents: gross,
    reason: "rental_long_lead_no_deposit_configured",
    buyerMessage: "Your payment is processed now to secure these dates.",
  };
}

/** True when a stored authorization may still be captured. */
export function isAuthorizationCapturable(opts: {
  authorizationStatus?: string | null;
  expiresAt?: string | null;
  now?: Date;
}): boolean {
  const status = (opts.authorizationStatus ?? "").toUpperCase();
  if (status && !["CREATED", "PENDING", "PARTIALLY_CAPTURED"].includes(status)) return false;
  if (opts.expiresAt) {
    const exp = new Date(opts.expiresAt).getTime();
    if (Number.isFinite(exp) && exp <= (opts.now ?? new Date()).getTime()) return false;
  }
  return true;
}
