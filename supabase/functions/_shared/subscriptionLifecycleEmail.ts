/**
 * Routes a recurring-subscription lifecycle email to the right product family.
 *
 * Vendibook Pro and PermitPath Plus are separate products with separate PayPal
 * subscriptions, so their lifecycle emails must never cross: a PermitPath-only
 * member must never see the 10.9% Pro fee or the Featured Boost credit, and a
 * Pro member must never get a "$7.99 PermitPath" receipt.
 *
 * Both families share the SAME idempotency key convention
 * (`membershipEmailKey`), so a cancellation confirmed in-app and a later PayPal
 * webhook can only ever send one email.
 */
import { formatUsd } from "./adminPaymentAlert.ts";
import { isProTierSlug } from "./proBoostCredit.ts";
import {
import { invokeTransactionalEmail } from './invokeTransactionalEmail.ts'
  type MembershipEmailKind,
  membershipEmailKey,
  type MembershipSubscription,
  sendProMembershipEmail,
} from "./proMembershipEmail.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

const PERMIT_PLUS_PLAN_NAME = "PermitPath Plus";

const normalizeTier = (raw?: string | null) =>
  String(raw ?? "").toLowerCase().replace(/[-_](monthly|annual)$/, "");

/** True for the standalone PermitPath Plus subscription tier. */
export const isPermitPlusTierSlug = (tier?: string | null) => {
  const key = normalizeTier(tier);
  return key === "permit_path_plus" || key === "permit-path-plus" || key === "permitpath_plus";
};

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

/** Sends a branded PermitPath Plus lifecycle email. No-ops for other tiers. */
export async function sendPermitPlusEmail(
  admin: Admin,
  sub: MembershipSubscription,
  kind: MembershipEmailKind,
  opts: { accessThrough?: string | null; stamp?: string | null } = {},
): Promise<void> {
  try {
    if (!sub?.user_id || !sub?.paypal_subscription_id) return;
    if (!isPermitPlusTierSlug(sub.tier)) return;

    const { data: profile } = await admin.from("profiles")
      .select("email, first_name").eq("id", sub.user_id).maybeSingle();
    if (!profile?.email) return;

    // Price source of truth: the subscription record, then the live catalog.
    let amountCents: number | null = sub.recurring_amount_cents ?? null;
    if (!amountCents) {
      const { data: product } = await admin.from("monetization_products")
        .select("price_cents")
        .in("slug", ["permit_path_plus_monthly", "permit_path_plus"])
        .eq("is_active", true)
        .maybeSingle();
      amountCents = product?.price_cents ?? null;
    }

    const stamp = opts.stamp ??
      (kind === "renewed"
        ? sub.last_payment_at ?? ""
        : kind === "payment_failed"
        ? sub.next_billing_time ?? ""
        : "");

    await invokeTransactionalEmail({
        templateName: `permitpath-plus-${kind.replace("_", "-")}`,
        recipientEmail: profile.email,
        idempotencyKey: membershipEmailKey(sub.paypal_subscription_id, kind, stamp),
        templateData: {
          firstName: profile.first_name ?? undefined,
          planName: PERMIT_PLUS_PLAN_NAME,
          amount: amountCents ? formatUsd(amountCents) : undefined,
          interval: sub.billing_interval === "year" ? "year" : "month",
          paidOn: kind === "renewed" ? fmtDate(sub.last_payment_at) : undefined,
          nextBillingDate: fmtDate(sub.next_billing_time),
          accessThrough: fmtDate(opts.accessThrough ?? sub.next_billing_time),
        },
      });
  } catch (err) {
    console.error("[permitPlusEmail] send failed", kind, err);
  }
}

/** Product-aware dispatcher — safe to call for any recurring subscription. */
export async function sendSubscriptionLifecycleEmail(
  admin: Admin,
  sub: MembershipSubscription,
  kind: MembershipEmailKind,
  opts: { accessThrough?: string | null; stamp?: string | null } = {},
): Promise<void> {
  if (isPermitPlusTierSlug(sub?.tier)) {
    await sendPermitPlusEmail(admin, sub, kind, opts);
    return;
  }
  if (isProTierSlug(sub?.tier ?? "vendibook_pro")) {
    await sendProMembershipEmail(admin, sub, kind, opts);
  }
  // Any other recurring product stays silent until it has its own templates.
}
