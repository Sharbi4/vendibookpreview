/**
 * Shared handling of PayPal payment authorizations (temporary holds).
 *
 * A hold is NOT a payment and NOT escrow: PayPal reserves the payer's funds,
 * Vendibook never touches them, and nothing is charged until an explicit
 * capture. Every write here is idempotent so the authorize endpoint, the
 * settle endpoint and the webhook can arrive in any order.
 */

import { safeLog } from "./paypal.ts";
import {
  CaptureRejectedError,
  finalizeCapture,
  TERMINAL_PAYMENT_STATES,
} from "./paypalFinalize.ts";
import { recordOrderEvent } from "./orders/orderEvents.ts";
import { getPaymentProvider } from "./payments/index.ts";
import { supportsAuthorization } from "./payments/types.ts";
import { isAuthorizationCapturable } from "./payments/paymentStrategy.ts";

export interface AuthorizationFacts {
  authorizationId: string;
  status: string;
  amountCents: number;
  currency: string;
  expiresAt: string | null;
}

/** Authorization states that mean the hold no longer exists. */
export const DEAD_AUTHORIZATION_STATES = new Set(["voided", "expired", "denied"]);

/**
 * Persists a newly created (or re-observed) hold on the payment record.
 * Safe to call repeatedly with the same authorization id.
 */
export async function applyAuthorization(
  supabase: any,
  record: Record<string, any>,
  facts: AuthorizationFacts,
  source: "authorize_endpoint" | "webhook",
) {
  if (TERMINAL_PAYMENT_STATES.has(String(record.payment_status))) {
    safeLog("authorization_terminal_state_ignored", {
      reference: record.reference,
      state: record.payment_status,
      source,
    });
    return record;
  }

  // A different authorization id on the same record means the event belongs
  // elsewhere. Never overwrite a live hold with a foreign one.
  if (
    record.paypal_authorization_id &&
    facts.authorizationId &&
    record.paypal_authorization_id !== facts.authorizationId
  ) {
    safeLog("authorization_id_mismatch", { reference: record.reference, source });
    return record;
  }

  const { data: updated } = await supabase
    .from("payment_records")
    .update({
      paypal_authorization_id: facts.authorizationId,
      authorization_status: facts.status,
      authorized_at: record.authorized_at ?? new Date().toISOString(),
      authorization_expires_at: facts.expiresAt,
      payment_status: "approved",
      internal_status: "payment_authorized",
      metadata: {
        ...(record.metadata ?? {}),
        authorization_source: source,
      },
    })
    .eq("id", record.id)
    .select()
    .single();

  await recordOrderEvent(supabase, {
    paymentRecordId: record.id,
    code: "payment_authorized",
    title: "Payment authorized — not charged yet",
    description:
      "PayPal is holding these funds temporarily. The charge only happens when the transaction is confirmed.",
    actorRole: "system",
    visibility: "both",
    dedupeKey: `authorized:${facts.authorizationId}`,
    metadata: { expires_at: facts.expiresAt },
  }).catch(() => {});

  // Reflect the hold on the business record without inventing new statuses.
  if (record.sale_transaction_id) {
    await supabase
      .from("sale_transactions")
      .update({ status: "payment_authorized" })
      .eq("id", record.sale_transaction_id)
      .eq("status", "pending");
  }

  return updated ?? record;
}

export type SettleOutcome =
  | { action: "captured"; record: Record<string, any>; captureId: string }
  | { action: "voided"; record: Record<string, any> }
  | { action: "noop"; record: Record<string, any>; reason: string };

/**
 * Captures a held authorization. Money moves here and only here.
 * Returns `noop` when the payment was already completed.
 */
export async function captureHold(
  supabase: any,
  record: Record<string, any>,
  opts: { reason: string; amountCents?: number },
): Promise<SettleOutcome> {
  if (record.payment_status === "completed") {
    return { action: "noop", record, reason: "already_captured" };
  }
  const authorizationId = record.paypal_authorization_id;
  if (!authorizationId) return { action: "noop", record, reason: "no_authorization" };

  if (
    !isAuthorizationCapturable({
      authorizationStatus: record.authorization_status,
      expiresAt: record.authorization_expires_at,
    })
  ) {
    await markAuthorizationExpired(supabase, record);
    return { action: "noop", record, reason: "authorization_expired" };
  }

  const provider = getPaymentProvider();
  if (!supportsAuthorization(provider)) {
    return { action: "noop", record, reason: "provider_unsupported" };
  }

  const amountCents = opts.amountCents ?? record.gross_amount_cents;
  const result = await provider.captureAuthorization(
    authorizationId,
    `capture-auth:${record.reference}`,
    { amountCents, currency: record.currency ?? "USD" },
  );

  const fresh = await refreshRecord(supabase, record.id);
  const finalized = await finalizeCapture(
    supabase,
    fresh,
    {
      captureId: result.captureId,
      status: result.status === "completed" ? "COMPLETED" : "PENDING",
      amountCents: result.amount.amountCents,
      currency: result.amount.currency,
    },
    "capture_endpoint",
  );

  await supabase
    .from("payment_records")
    .update({
      authorization_status: "captured",
      captured_amount_cents: result.amount.amountCents,
    })
    .eq("id", record.id);

  safeLog("authorization_captured", { reference: record.reference, reason: opts.reason });
  return { action: "captured", record: finalized, captureId: result.captureId };
}

/** Releases a hold without charging. Always safe to retry. */
export async function voidHold(
  supabase: any,
  record: Record<string, any>,
  reason: string,
): Promise<SettleOutcome> {
  if (record.payment_status === "completed") {
    return { action: "noop", record, reason: "already_captured" };
  }
  const authorizationId = record.paypal_authorization_id;
  if (!authorizationId) return { action: "noop", record, reason: "no_authorization" };

  const provider = getPaymentProvider();
  if (supportsAuthorization(provider)) {
    await provider.voidAuthorization(authorizationId);
  }

  const { data: updated } = await supabase
    .from("payment_records")
    .update({
      authorization_status: "voided",
      authorization_voided_at: new Date().toISOString(),
      payment_status: "cancelled",
      internal_status: `authorization_voided:${reason}`.slice(0, 60),
    })
    .eq("id", record.id)
    .select()
    .single();

  await recordOrderEvent(supabase, {
    paymentRecordId: record.id,
    code: "payment_hold_released",
    title: "Temporary hold released",
    description: "PayPal released the hold. Nothing was charged.",
    actorRole: "system",
    visibility: "both",
    dedupeKey: `voided:${authorizationId}`,
    metadata: { reason },
  }).catch(() => {});

  return { action: "voided", record: updated ?? record };
}

export async function markAuthorizationExpired(supabase: any, record: Record<string, any>) {
  await supabase
    .from("payment_records")
    .update({
      authorization_status: "expired",
      internal_status: "authorization_expired",
      last_error: { reason: "authorization_expired" },
    })
    .eq("id", record.id)
    .neq("payment_status", "completed");

  await recordOrderEvent(supabase, {
    paymentRecordId: record.id,
    code: "payment_hold_expired",
    title: "Temporary hold expired",
    description:
      "The payment hold expired before it could be charged. Nothing was taken — the payment can be restarted.",
    actorRole: "system",
    visibility: "both",
    dedupeKey: `expired:${record.id}`,
  }).catch(() => {});
}

async function refreshRecord(supabase: any, id: string) {
  const { data } = await supabase.from("payment_records").select("*").eq("id", id).maybeSingle();
  return data;
}

export { CaptureRejectedError };
