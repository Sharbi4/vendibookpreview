/**
 * Vendibook Pro — one Featured Boost credit per paid billing period.
 *
 * Non-rolling: a credit belongs to the period it was granted in and expires
 * with it. Grants are keyed on (user_id, period_start) with a unique index, so
 * duplicate webhook deliveries and the reconciler can both call this safely.
 */

const PRO_TIERS = new Set(["vendibook_pro", "vendibook-pro", "pro"]);

export const isProTierSlug = (tier?: string | null) =>
  !!tier && PRO_TIERS.has(String(tier).toLowerCase().replace(/_(monthly|annual)$/, ""));

export interface GrantArgs {
  userId: string;
  tier?: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  subscriptionId?: string | null;
  paypalSubscriptionId?: string | null;
}

/** Idempotently grant this period's boost credit. Returns true if newly granted. */
// deno-lint-ignore no-explicit-any
export async function grantMonthlyBoostCredit(admin: any, args: GrantArgs): Promise<boolean> {
  if (!args.userId || !isProTierSlug(args.tier)) return false;
  if (!args.periodStart || !args.periodEnd) return false;

  const { error } = await admin.from("pro_boost_credits").insert({
    user_id: args.userId,
    subscription_id: args.subscriptionId ?? null,
    paypal_subscription_id: args.paypalSubscriptionId ?? null,
    period_start: args.periodStart,
    period_end: args.periodEnd,
    status: "available",
    source: "vendibook_pro",
  });

  // 23505 = the unique index already holds this period's credit.
  if (error && error.code !== "23505") throw error;
  return !error;
}

/** Expire any unused credits whose period has lapsed (non-rolling). */
// deno-lint-ignore no-explicit-any
export async function expireLapsedBoostCredits(admin: any, userId: string) {
  await admin
    .from("pro_boost_credits")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "available")
    .lt("period_end", new Date().toISOString());
}

/** The credit a member can spend right now, if any. */
// deno-lint-ignore no-explicit-any
export async function getAvailableBoostCredit(admin: any, userId: string) {
  await expireLapsedBoostCredits(admin, userId);
  const { data } = await admin
    .from("pro_boost_credits")
    .select("id, period_start, period_end")
    .eq("user_id", userId)
    .eq("status", "available")
    .gt("period_end", new Date().toISOString())
    .order("period_end", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/**
 * Spend a credit. Conditional on status still being 'available', so two
 * concurrent redemptions can never both win.
 */
// deno-lint-ignore no-explicit-any
export async function consumeBoostCredit(
  admin: any,
  creditId: string,
  ctx: { listingId?: string | null; purchaseId?: string | null } = {},
): Promise<boolean> {
  const { data } = await admin
    .from("pro_boost_credits")
    .update({
      status: "used",
      used_at: new Date().toISOString(),
      listing_id: ctx.listingId ?? null,
      purchase_id: ctx.purchaseId ?? null,
    })
    .eq("id", creditId)
    .eq("status", "available")
    .select("id")
    .maybeSingle();
  return !!data;
}
