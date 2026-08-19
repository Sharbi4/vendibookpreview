/**
 * Vendibook Pro membership lifecycle emails.
 *
 * Shared by the PayPal webhook and the cancel endpoint so both use the SAME
 * idempotency key convention — a cancellation confirmed in-app and a later
 * BILLING.SUBSCRIPTION.CANCELLED webhook can never send two emails.
 *
 * Pro-only by design: the copy talks about the 10.9% seller fee and the monthly
 * Featured Boost credit, which do not apply to PermitPath Plus or any other
 * recurring product. Non-Pro tiers are skipped here rather than mis-branded.
 */
import { formatUsd } from "./adminPaymentAlert.ts";
import { isProTierSlug } from "./proBoostCredit.ts";

export type MembershipEmailKind = "activated" | "renewed" | "cancelled" | "payment_failed";

// deno-lint-ignore no-explicit-any
type Admin = any;

export interface MembershipSubscription {
  user_id?: string | null;
  tier?: string | null;
  billing_interval?: string | null;
  recurring_amount_cents?: number | null;
  next_billing_time?: string | null;
  last_payment_at?: string | null;
  paypal_subscription_id?: string | null;
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

/**
 * Stable key so every producer of a given lifecycle email agrees.
 * `activated` and `cancelled` are once-per-subscription; `renewed` and
 * `payment_failed` are stamped with the period they belong to.
 */
export function membershipEmailKey(
  paypalSubscriptionId: string,
  kind: MembershipEmailKind,
  stamp?: string | null,
): string {
  return `${paypalSubscriptionId}:${kind}${stamp ? `:${stamp}` : ""}`;
}

/**
 * Claims the first paid period for a subscription.
 * Returns true exactly once per PayPal subscription id, so activation vs
 * renewal is unambiguous even when `last_payment_at` was already written by an
 * earlier PAYMENT.SALE.COMPLETED for the same first period.
 */
export async function claimFirstPaidPeriod(
  admin: Admin,
  paypalSubscriptionId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { error } = await admin.from("edge_action_idempotency").insert({
      idempotency_key: `subscription-first-period:${paypalSubscriptionId}`,
      action: "subscription_first_period",
      user_id: userId,
      response: { paypal_subscription_id: paypalSubscriptionId },
    });
    return !error; // 23505 → a paid period was already recorded → renewal
  } catch (_err) {
    return false;
  }
}

/** Sends a branded Pro lifecycle email. No-ops for non-Pro tiers. */
export async function sendProMembershipEmail(
  admin: Admin,
  sub: MembershipSubscription,
  kind: MembershipEmailKind,
  opts: { accessThrough?: string | null; stamp?: string | null } = {},
): Promise<void> {
  try {
    if (!sub?.user_id || !sub?.paypal_subscription_id) return;
    if (!isProTierSlug(sub.tier ?? "vendibook_pro")) return;

    const { data: profile } = await admin.from("profiles")
      .select("email, first_name").eq("id", sub.user_id).maybeSingle();
    if (!profile?.email) return;

    // Price source of truth: the subscription record, falling back to the live
    // monetization catalog so emails never show a stale hard-coded amount.
    let amountCents: number | null = sub.recurring_amount_cents ?? null;
    if (!amountCents && sub.tier) {
      const { data: product } = await admin.from("monetization_products")
        .select("price_cents").eq("slug", sub.tier).eq("is_active", true).maybeSingle();
      amountCents = product?.price_cents ?? null;
    }

    const stamp = opts.stamp ??
      (kind === "renewed"
        ? sub.last_payment_at ?? ""
        : kind === "payment_failed"
        ? sub.next_billing_time ?? ""
        : "");

    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: `pro-membership-${kind.replace("_", "-")}`,
        recipientEmail: profile.email,
        idempotencyKey: membershipEmailKey(sub.paypal_subscription_id, kind, stamp),
        templateData: {
          firstName: profile.first_name ?? undefined,
          planName: "Vendibook Pro",
          amount: amountCents ? formatUsd(amountCents) : undefined,
          interval: sub.billing_interval === "year" ? "year" : "month",
          nextBillingDate: fmtDate(sub.next_billing_time),
          accessThrough: fmtDate(opts.accessThrough ?? sub.next_billing_time),
        },
      },
    });
  } catch (err) {
    console.error("[proMembershipEmail] send failed", kind, err);
  }
}
