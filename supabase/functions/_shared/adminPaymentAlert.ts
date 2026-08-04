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
