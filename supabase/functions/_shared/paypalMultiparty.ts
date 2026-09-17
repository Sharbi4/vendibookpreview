/**
 * Connected Path (multiparty) rollout switch.
 *
 * Money routing is decided SERVER-SIDE only. Nothing in the browser can turn
 * this on. While it is off — the default — every checkout behaves exactly as it
 * does today: Vendibook is the payee and sellers are paid by the existing
 * manual payout process.
 *
 * Resolution order:
 *   1. `PAYPAL_MULTIPARTY_ENABLED` env var ("true" enables) — per environment,
 *      so sandbox can run multiparty while live stays first-party.
 *   2. `app_feature_flags.paypal_multiparty_enabled` — runtime kill switch.
 *   3. Off.
 *
 * `sellerAllowed` additionally gates per seller, so a cohort can be moved over
 * without flipping every live seller at once.
 */
// deno-lint-ignore-file no-explicit-any

export const MULTIPARTY_FLAG_KEY = "paypal_multiparty_enabled";

/**
 * Environment-level switch. Synchronous so the PayPal request layer can use it
 * as a hard guard. Missing/any value other than "true" means OFF.
 */
export function multipartyEnvEnabled(): boolean {
  return (Deno.env.get("PAYPAL_MULTIPARTY_ENABLED") ?? "").toLowerCase() === "true";
}

function envEnabled(): boolean {
  return multipartyEnvEnabled();
}


/** True when the Connected Path flow is enabled for this environment at all. */
export async function multipartyEnabled(admin?: any): Promise<boolean> {
  if (envEnabled()) return true;
  if (!admin) return false;
  try {
    const { data } = await admin
      .from("app_feature_flags")
      .select("enabled")
      .eq("key", MULTIPARTY_FLAG_KEY)
      .maybeSingle();
    return data?.enabled === true;
  } catch {
    // A flag lookup failure must never enable money routing.
    return false;
  }
}

/**
 * True only when multiparty is on AND this specific seller is ready to receive
 * funds through PayPal. Step 2 fills in the readiness lookup; until the seller
 * connection table exists this always returns false, so live routing is
 * unchanged.
 */
export async function sellerMultipartyReady(
  admin: any,
  sellerId: string | null | undefined,
): Promise<{ enabled: boolean; merchantId: string | null }> {
  if (!sellerId) return { enabled: false, merchantId: null };
  if (!(await multipartyEnabled(admin))) return { enabled: false, merchantId: null };

  try {
    const { data, error } = await admin
      .from("seller_paypal_accounts")
      .select("merchant_id, primary_email_confirmed, payments_receivable, onboarding_status")
      .eq("user_id", sellerId)
      .maybeSingle();
    // Table does not exist yet (Step 2) → stay first-party.
    if (error || !data) return { enabled: false, merchantId: null };

    const ready = data.onboarding_status === "ready" &&
      data.primary_email_confirmed === true &&
      data.payments_receivable === true &&
      !!data.merchant_id;
    return { enabled: ready, merchantId: ready ? data.merchant_id : null };
  } catch {
    return { enabled: false, merchantId: null };
  }
}
