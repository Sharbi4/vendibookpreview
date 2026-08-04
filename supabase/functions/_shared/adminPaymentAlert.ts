/**
 * Fire-and-forget admin alert for revenue events (featured/boost purchases,
 * add-ons, one-time upgrades, and membership subscriptions).
 *
 * Recipients are resolved server-side inside `send-admin-notification`;
 * callers never carry the address list.
 */
export async function alertAdminsOfPayment(
  // deno-lint-ignore no-explicit-any
  admin: any,
  type:
    | "featured_purchase"
    | "addon_purchase"
    | "subscription_started"
    | "subscription_renewed",
  data: Record<string, unknown>,
): Promise<void> {
  try {
    await admin.functions.invoke("send-admin-notification", {
      body: { type, data },
    });
  } catch (_err) {
    // Never let alerting break fulfilment.
    console.error("admin_payment_alert_failed", type);
  }
}

export function formatUsd(cents: unknown): string | undefined {
  const n = typeof cents === "number" ? cents : Number(cents);
  if (!Number.isFinite(n)) return undefined;
  return `$${(n / 100).toFixed(2)}`;
}

/**
 * Same as `alertAdminsOfPayment` but guarded so retried webhooks (or a
 * client activation that raced the webhook) only email admins once.
 */
export async function alertAdminsOfPaymentOnce(
  // deno-lint-ignore no-explicit-any
  admin: any,
  key: string,
  userId: string,
  type: Parameters<typeof alertAdminsOfPayment>[1],
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await admin.from("edge_action_idempotency").insert({
      idempotency_key: `admin-payment-alert:${key}`,
      action: "admin_payment_alert",
      user_id: userId,
      response: { type },
    });
    if (error) return; // already sent (23505) or unavailable — do not duplicate
  } catch (_e) {
    return;
  }
  await alertAdminsOfPayment(admin, type, data);
}
