// Pure, testable helpers extracted from stripe-webhook/index.ts
// so they can be unit-tested with a mock Supabase client.

export type ReferralAdjustOpts = {
  transactionId?: string | null;
  bookingId?: string | null;
  eventId: string;
  newStatus: "on_hold" | "voided";
  note: string;
  actionType: string;
};

export type RpcCall = {
  fn: string;
  args: Record<string, unknown>;
};

// Minimal shape the helper consumes — keep loose for testability.
// deno-lint-ignore no-explicit-any
type AnyClient = any;

/**
 * Auto-adjust referrals attached to a Stripe transaction (refund or dispute).
 * Selects referrals tied to either the transactionId or bookingId that are still
 * in an adjustable status, and logs the status change with a deterministic
 * idempotency key so retries don't double-log.
 */
export async function adjustReferralsForTransaction(
  supabaseClient: AnyClient,
  opts: ReferralAdjustOpts,
  log: (step: string, details?: Record<string, unknown>) => void = () => {},
): Promise<{ adjusted: number; idempotencyKeys: string[] }> {
  const { transactionId, bookingId, eventId, newStatus, note, actionType } = opts;
  const ids = [transactionId, bookingId].filter(Boolean) as string[];
  if (ids.length === 0) return { adjusted: 0, idempotencyKeys: [] };

  const { data: refs } = await supabaseClient
    .from("referrals")
    .select("id, status")
    .in("transaction_id", ids)
    .in("status", ["pending_review", "qualified", "transaction_started"]);

  const keys: string[] = [];
  for (const r of refs ?? []) {
    const idempotencyKey = `stripe-${eventId}-${r.id}`;
    const { error } = await supabaseClient.rpc("log_referral_status_change", {
      p_referral_id: r.id,
      p_new_status: newStatus,
      p_source: "system",
      p_note: note,
      p_idempotency_key: idempotencyKey,
      p_action_type: actionType,
    });
    if (error) {
      log("WARNING: referral auto-adjust failed", { referralId: r.id, error: error.message });
    } else {
      log("Referral auto-adjusted", { referralId: r.id, newStatus });
      keys.push(idempotencyKey);
    }
  }
  return { adjusted: keys.length, idempotencyKeys: keys };
}

/**
 * Pulls a normalized referral_code from a Stripe Checkout Session's metadata.
 * Returns null when missing/blank so callers can skip persistence.
 */
export function extractSessionReferralCode(
  session: { metadata?: Record<string, string> | null } | null | undefined,
): string | null {
  const raw = session?.metadata?.referral_code;
  if (!raw) return null;
  const trimmed = String(raw).trim();
  return trimmed.length > 0 ? trimmed : null;
}
