/**
 * Vendibook Pro eligibility at the transaction commitment point.
 *
 * Pro is active while the member is paid through `current_period_end` — which
 * includes cancel-at-period-end members (Step 1 keeps their host_subscriptions
 * row `active` with cancel_at_period_end until the paid period lapses).
 *
 * Never throws: any failure resolves to "not Pro" so a lookup problem can only
 * charge the standard fee, never under-charge.
 */

export interface ProStatus {
  isPro: boolean;
  subscriptionId: string | null;
  periodEnd: string | null;
  reason: "active_subscription" | "paid_through" | "not_pro";
}

const PRO_SLUGS = new Set(["vendibook_pro", "vendibook-pro", "pro", "host_pro", "host_growth"]);

const isProTier = (raw: string | null | undefined) => {
  if (!raw) return false;
  const k = String(raw).toLowerCase().replace(/_annual$/, "").replace(/_monthly$/, "");
  return PRO_SLUGS.has(k) || k.endsWith("_pro");
};

// deno-lint-ignore no-explicit-any
export async function resolveProStatus(admin: any, userId: string | null): Promise<ProStatus> {
  const miss: ProStatus = { isPro: false, subscriptionId: null, periodEnd: null, reason: "not_pro" };
  if (!userId) return miss;

  try {
    const { data: subs } = await admin
      .from("host_subscriptions")
      .select("id, tier, status, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .limit(10);

    const now = Date.now();
    for (const sub of subs ?? []) {
      if (!isProTier(sub.tier)) continue;
      const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
      const paidThrough = end !== null && end > now;
      const statusActive = ["active", "trialing", "past_due"].includes(String(sub.status));

      // Active with no stored period end (edge case) or still paid through a
      // cancelled period both count as Pro.
      if (statusActive && (end === null || paidThrough)) {
        return {
          isPro: true,
          subscriptionId: sub.id,
          periodEnd: sub.current_period_end ?? null,
          reason: sub.cancel_at_period_end ? "paid_through" : "active_subscription",
        };
      }
      if (paidThrough) {
        return {
          isPro: true,
          subscriptionId: sub.id,
          periodEnd: sub.current_period_end,
          reason: "paid_through",
        };
      }
    }
  } catch (_err) {
    return miss;
  }
  return miss;
}
