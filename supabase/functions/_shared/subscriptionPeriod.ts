/**
 * Subscription period + grandfathering rules.
 *
 * A cancelled (or expired-at-provider) membership must keep its benefits until
 * the end of the period the member already paid for. Every place that mirrors
 * PayPal state into `host_subscriptions` runs through here so the rule cannot
 * drift between the webhook, the cancel endpoint and the reconciler.
 *
 * The helper is pure and idempotent: replaying the same provider state always
 * produces the same patch.
 */

export type MirrorStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled"
  | "incomplete";

export interface PeriodInput {
  /** Normalized provider state: active | payment_failed | suspended | cancelled | expired | ... */
  providerStatus: string;
  /** next_billing_time from PayPal (may be null once cancelled). */
  nextBillingTime?: string | null;
  /** Last successful payment timestamp, used as the period start. */
  lastPaymentAt?: string | null;
  /** Subscription start_time, fallback period start. */
  startTime?: string | null;
  /** Whatever we already stored — never regress a known paid-through date. */
  existingPeriodEnd?: string | null;
  existingPeriodStart?: string | null;
  now?: Date;
}

export interface PeriodPatch {
  status: MirrorStatus;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  /** True while the member still has paid-through access. */
  entitled: boolean;
}

const laterOf = (a?: string | null, b?: string | null): string | null => {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
};

export function resolveSubscriptionPeriod(input: PeriodInput): PeriodPatch {
  const now = input.now ?? new Date();
  const status = String(input.providerStatus ?? "").toLowerCase();

  // Never regress a paid-through date: PayPal stops returning
  // next_billing_time after a cancellation.
  const periodEnd = laterOf(input.existingPeriodEnd ?? null, input.nextBillingTime ?? null);
  const periodStart = laterOf(
    input.existingPeriodStart ?? null,
    input.lastPaymentAt ?? input.startTime ?? null,
  );
  const paidThrough = !!periodEnd && new Date(periodEnd).getTime() > now.getTime();

  const ended = status === "cancelled" || status === "canceled" || status === "expired";

  if (ended) {
    // Cancel anytime, no future renewal, benefits stay until the paid period ends.
    return {
      status: paidThrough ? "active" : "canceled",
      cancel_at_period_end: true,
      cancel_at: periodEnd,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      entitled: paidThrough,
    };
  }

  const mapped: MirrorStatus = status === "active"
    ? "active"
    : status === "payment_failed" || status === "past_due"
    ? "past_due"
    : status === "suspended" || status === "paused"
    ? "paused"
    : status === "trialing"
    ? "trialing"
    : "incomplete";

  return {
    status: mapped,
    cancel_at_period_end: false,
    cancel_at: null,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    entitled: mapped === "active" || mapped === "trialing" || mapped === "past_due",
  };
}
