/**
 * Verified Seller — server-side state engine.
 *
 * Every transition between "Plaid said X" and "PayPal money moved" happens
 * here so the webhook, the refresh endpoint, the cancel action and the
 * cleanup job all behave identically and idempotently.
 */

import {
  capturePayPalAuthorization,
  getPayPalAuthorization,
  refundPayPalCapture,
  voidPayPalAuthorization,
} from "./paypal.ts";
import { getIdentityVerification, plaidLog } from "./plaid.ts";
import {
  decideFromPlaidStatus,
  extractCaptureId,
  extractCaptureStatus,
  isBadgeEligible,
  type PlaidIdvStatus,
  shouldApplyPlaidStatus,
  VERIFIED_SELLER,
  type VerificationRecord,
} from "./verifiedSellerLogic.ts";
import { alertAdminsOfPaymentOnce } from "./adminPaymentAlert.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

export interface VerificationRow extends VerificationRecord {
  user_id: string;
  current_attempt_id: string | null;
  template_id: string | null;
  last_reason_code: string | null;
  terms_version: string | null;
  identity_succeeded_at: string | null;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  reference: string;
  idempotency_key: string;
  paypal_order_id: string | null;
  paypal_authorization_id: string | null;
  paypal_capture_id: string | null;
  paypal_refund_id: string | null;
  amount_cents: number;
  currency: string;
  state: string;
  attempt_verification_id: string | null;
  expires_at: string | null;
  created_at: string;
}

const OPEN_PAYMENT_STATES = ["created", "authorized"];

export function log(step: string, details?: Record<string, unknown>) {
  console.log(
    `[VERIFIED-SELLER] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`,
  );
}

// ------------------------------------------------------------------- config
export async function isOfferEnabled(admin: Admin): Promise<boolean> {
  const { data } = await admin
    .from("app_feature_flags")
    .select("enabled")
    .eq("flag_key", VERIFIED_SELLER.flagKey)
    .maybeSingle();
  return data?.enabled !== false;
}

// -------------------------------------------------------------------- reads
export async function ensureVerification(
  admin: Admin,
  userId: string,
): Promise<VerificationRow> {
  const { data } = await admin
    .from("seller_verifications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data as VerificationRow;

  await admin
    .from("seller_verifications")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });

  const { data: created } = await admin
    .from("seller_verifications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return created as VerificationRow;
}

export async function latestOpenPayment(
  admin: Admin,
  userId: string,
): Promise<PaymentRow | null> {
  const { data } = await admin
    .from("seller_verification_payments")
    .select("*")
    .eq("user_id", userId)
    .in("state", OPEN_PAYMENT_STATES)
    .order("created_at", { ascending: false })
    .limit(1);
  return (data?.[0] as PaymentRow) ?? null;
}

export async function capturedPayment(
  admin: Admin,
  userId: string,
): Promise<PaymentRow | null> {
  const { data } = await admin
    .from("seller_verification_payments")
    .select("*")
    .eq("user_id", userId)
    .eq("state", "captured")
    .order("created_at", { ascending: false })
    .limit(1);
  return (data?.[0] as PaymentRow) ?? null;
}

// ----------------------------------------------------------- event dedupe
/**
 * Inserts an event row and returns false when the same event was already
 * processed. Backed by a unique index on (provider, event_key).
 */
export async function claimEvent(admin: Admin, input: {
  provider: string;
  eventKey: string;
  eventType?: string;
  userId?: string | null;
  verificationId?: string | null;
  outcome?: string;
}): Promise<boolean> {
  const { error } = await admin.from("seller_verification_events").insert({
    provider: input.provider,
    event_key: input.eventKey,
    event_type: input.eventType ?? null,
    user_id: input.userId ?? null,
    verification_id: input.verificationId ?? null,
    outcome: input.outcome ?? "claimed",
  });
  if (error) {
    log("event_already_processed", { provider: input.provider, key: input.eventKey });
    return false;
  }
  return true;
}

// ------------------------------------------------------------- money moves
async function markPayment(
  admin: Admin,
  paymentId: string,
  patch: Record<string, unknown>,
) {
  await admin
    .from("seller_verification_payments")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", paymentId);
}

/**
 * Captures a held authorization exactly once. A row already in `captured`
 * short-circuits, and PayPal's own idempotency key covers concurrent callers.
 */
export async function captureAuthorizationOnce(
  admin: Admin,
  payment: PaymentRow,
): Promise<{ ok: boolean; captureId?: string; errorCode?: string }> {
  if (payment.state === "captured" && payment.paypal_capture_id) {
    return { ok: true, captureId: payment.paypal_capture_id };
  }
  if (!payment.paypal_authorization_id) {
    return { ok: false, errorCode: "NO_AUTHORIZATION" };
  }

  try {
    const result = await capturePayPalAuthorization({
      authorizationId: payment.paypal_authorization_id,
      amountCents: payment.amount_cents,
      currency: payment.currency,
      invoiceId: payment.reference,
      idempotencyKey: `vs-capture-${payment.id}`,
    });
    const captureId = extractCaptureId(result);
    const status = (extractCaptureStatus(result) ?? "").toUpperCase();

    if (status !== "COMPLETED" || !captureId) {
      await markPayment(admin, payment.id, {
        state: "failed",
        error_code: status || "CAPTURE_NOT_COMPLETED",
      });
      return { ok: false, errorCode: status || "CAPTURE_NOT_COMPLETED" };
    }

    await markPayment(admin, payment.id, {
      state: "captured",
      paypal_capture_id: captureId,
      captured_at: new Date().toISOString(),
      error_code: null,
    });
    log("captured", { payment_id: payment.id });
    return { ok: true, captureId };
  } catch (err) {
    const code = (err as { errorCode?: string })?.errorCode ?? "CAPTURE_FAILED";
    await markPayment(admin, payment.id, { state: "failed", error_code: code });
    log("capture_failed", { payment_id: payment.id, code });
    return { ok: false, errorCode: code };
  }
}

/** Releases a held authorization exactly once. Never charges. */
export async function voidAuthorizationOnce(
  admin: Admin,
  payment: PaymentRow,
  reason: string,
): Promise<{ ok: boolean; errorCode?: string }> {
  if (payment.state === "voided") return { ok: true };
  if (payment.state === "captured") return { ok: false, errorCode: "ALREADY_CAPTURED" };
  if (!payment.paypal_authorization_id) {
    await markPayment(admin, payment.id, {
      state: "voided",
      voided_at: new Date().toISOString(),
      error_code: reason,
    });
    return { ok: true };
  }

  try {
    await voidPayPalAuthorization(
      payment.paypal_authorization_id,
      `vs-void-${payment.id}`,
    );
  } catch (err) {
    const code = (err as { errorCode?: string })?.errorCode ?? "";
    // Already voided / already captured / expired are all acceptable ends.
    const benign = /VOIDED|ALREADY|EXPIRED|NOT_FOUND|RESOURCE_NOT_FOUND/i.test(
      `${code} ${(err as Error).message ?? ""}`,
    );
    if (!benign) {
      await markPayment(admin, payment.id, { error_code: code || "VOID_FAILED" });
      log("void_failed", { payment_id: payment.id, code });
      return { ok: false, errorCode: code || "VOID_FAILED" };
    }
  }

  await markPayment(admin, payment.id, {
    state: "voided",
    voided_at: new Date().toISOString(),
    error_code: reason,
  });
  log("voided", { payment_id: payment.id, reason });
  return { ok: true };
}

/**
 * Safety net: refunds any capture that should never have been taken, or a
 * duplicate capture beyond the first.
 */
export async function refundPaymentOnce(
  admin: Admin,
  payment: PaymentRow,
  reason: string,
): Promise<{ ok: boolean; refundId?: string }> {
  if (payment.paypal_refund_id) return { ok: true, refundId: payment.paypal_refund_id };
  if (!payment.paypal_capture_id) return { ok: false };

  try {
    const result = await refundPayPalCapture({
      captureId: payment.paypal_capture_id,
      amountCents: payment.amount_cents,
      currency: payment.currency,
      reason: reason.slice(0, 120),
      idempotencyKey: `vs-refund-${payment.id}`,
    });
    const refundId = (result as { id?: string })?.id ?? null;
    await markPayment(admin, payment.id, {
      state: "refunded",
      paypal_refund_id: refundId,
      refunded_at: new Date().toISOString(),
      error_code: reason,
    });
    log("refunded", { payment_id: payment.id, reason });
    return { ok: true, refundId: refundId ?? undefined };
  } catch (err) {
    log("refund_failed", { payment_id: payment.id, message: (err as Error).message });
    return { ok: false };
  }
}

/** Collapses accidental duplicate captures down to a single charge. */
export async function refundDuplicateCaptures(admin: Admin, userId: string) {
  const { data } = await admin
    .from("seller_verification_payments")
    .select("*")
    .eq("user_id", userId)
    .eq("state", "captured")
    .order("captured_at", { ascending: true });
  const rows = (data ?? []) as PaymentRow[];
  if (rows.length <= 1) return;
  for (const dup of rows.slice(1)) {
    await refundPaymentOnce(admin, dup, "duplicate_charge");
  }
}

// ------------------------------------------------------------- notifications
async function sendVerifiedReceipt(admin: Admin, userId: string, payment: PaymentRow) {
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("email, first_name, full_name")
      .eq("id", userId)
      .maybeSingle();
    const email = profile?.email;
    if (!email) return;

    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "verified-seller-receipt",
        recipientEmail: email,
        idempotencyKey: `verified-seller-receipt-${payment.id}`,
        templateData: {
          firstName: profile?.first_name ?? profile?.full_name?.split(" ")?.[0] ?? null,
          amount: `$${(payment.amount_cents / 100).toFixed(2)}`,
          orderDate: new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          paypalTransactionId: payment.paypal_order_id,
          paypalCaptureId: payment.paypal_capture_id,
          verifiedAt: new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        },
      },
    });
  } catch (err) {
    log("receipt_failed", { message: (err as Error).message });
  }
}

/** Admin visibility for states that need a human, with no PII in the payload. */
export async function alertAdminsOfIssue(
  admin: Admin,
  key: string,
  userId: string,
  issue: string,
  details: Record<string, unknown> = {},
) {
  await alertAdminsOfPaymentOnce(
    admin,
    `verified-seller-${issue}-${key}`,
    userId,
    "addon_purchase",
    {
      product: "Verified Seller identity check",
      issue,
      user_id: userId,
      ...details,
    },
  );
}

// ----------------------------------------------------------- the state engine
export interface ReconcileResult {
  status: string;
  identity_status: PlaidIdvStatus | null;
  payment_state: string;
  badge_active: boolean;
  action_taken: "capture" | "void" | "wait" | "none";
  message?: string;
}

/**
 * Pulls the authoritative Plaid status for a user's current attempt and moves
 * money accordingly. Safe to call from a webhook, a client refresh, a retry
 * return, or the cleanup job — repeated calls converge on the same state.
 */
export async function reconcileVerification(
  admin: Admin,
  userId: string,
  opts: { verificationId?: string | null } = {},
): Promise<ReconcileResult> {
  const record = await ensureVerification(admin, userId);

  // A live, paid badge is terminal. Stale events can never undo it.
  if (isBadgeEligible(record)) {
    return {
      status: "verified",
      identity_status: record.identity_status,
      payment_state: record.payment_state,
      badge_active: true,
      action_taken: "none",
    };
  }

  const attemptId = opts.verificationId ?? record.current_attempt_id;
  if (!attemptId) {
    return {
      status: record.status,
      identity_status: record.identity_status,
      payment_state: record.payment_state,
      badge_active: false,
      action_taken: "none",
    };
  }

  let session;
  try {
    session = await getIdentityVerification(attemptId);
  } catch (err) {
    plaidLog("reconcile_fetch_failed", { message: (err as Error).message });
    return {
      status: record.status,
      identity_status: record.identity_status,
      payment_state: record.payment_state,
      badge_active: false,
      action_taken: "none",
      message: "Could not reach the verification provider. Please try again.",
    };
  }

  const incoming = (session.status ?? "active") as PlaidIdvStatus;
  if (
    !shouldApplyPlaidStatus(record.identity_status, incoming, {
      alreadyPaidAndVerified: isBadgeEligible(record),
    })
  ) {
    log("stale_status_ignored", { current: record.identity_status, incoming });
    return {
      status: record.status,
      identity_status: record.identity_status,
      payment_state: record.payment_state,
      badge_active: isBadgeEligible(record),
      action_taken: "none",
    };
  }

  const decision = decideFromPlaidStatus(incoming);
  const nowIso = new Date().toISOString();

  await admin
    .from("seller_verification_attempts")
    .update({
      status: incoming,
      request_id: session.request_id ?? null,
      completed_at: decision.identitySucceeded || decision.terminalFailure ? nowIso : null,
      updated_at: nowIso,
    })
    .eq("plaid_verification_id", attemptId);

  const payment = await latestOpenPayment(admin, userId);
  let actionTaken: ReconcileResult["action_taken"] = "wait";
  let nextStatus: string = decision.status;
  let paymentState = record.payment_state;
  let message: string | undefined;

  if (decision.action === "capture") {
    if (!payment) {
      // Identity passed but no usable authorization remains.
      const already = await capturedPayment(admin, userId);
      if (already) {
        paymentState = "captured";
        actionTaken = "none";
      } else {
        nextStatus = "payment_required";
        paymentState = "none";
        actionTaken = "none";
        message = "Identity confirmed. Complete payment to activate your badge.";
      }
    } else {
      const capture = await captureAuthorizationOnce(admin, payment);
      actionTaken = "capture";
      if (capture.ok) {
        paymentState = "captured";
        nextStatus = "verified";
      } else {
        paymentState = "failed";
        nextStatus = "payment_required";
        message = "Identity confirmed. Complete payment to activate your badge.";
        await alertAdminsOfIssue(admin, payment.id, userId, "capture_failed", {
          error_code: capture.errorCode,
        });
      }
    }
  } else if (decision.action === "void") {
    if (payment) {
      const voided = await voidAuthorizationOnce(admin, payment, incoming);
      actionTaken = "void";
      paymentState = voided.ok ? "voided" : payment.state;
      if (!voided.ok) {
        await alertAdminsOfIssue(admin, payment.id, userId, "void_failed", {
          error_code: voided.errorCode,
        });
      }
    } else {
      actionTaken = "none";
      // Guard against a legacy immediate-capture path charging without success.
      const charged = await capturedPayment(admin, userId);
      if (charged) {
        await refundPaymentOnce(admin, charged, "verification_not_successful");
        paymentState = "refunded";
      }
    }
  } else {
    actionTaken = "wait";
  }

  const verified = nextStatus === "verified" && paymentState === "captured";

  await admin
    .from("seller_verifications")
    .update({
      status: nextStatus,
      identity_status: incoming,
      identity_succeeded_at: decision.identitySucceeded
        ? record.identity_succeeded_at ?? nowIso
        : record.identity_succeeded_at,
      payment_state: paymentState,
      verified_at: verified ? record.verified_at ?? nowIso : record.verified_at,
      current_attempt_id: attemptId,
      last_reason_code: decision.terminalFailure ? incoming : null,
      updated_at: nowIso,
    })
    .eq("user_id", userId);

  if (verified) {
    await refundDuplicateCaptures(admin, userId);
    const paid = await capturedPayment(admin, userId);
    if (paid) {
      await sendVerifiedReceipt(admin, userId, paid);
      await alertAdminsOfPaymentOnce(
        admin,
        `verified-seller-${paid.id}`,
        userId,
        "addon_purchase",
        {
          product: "Verified Seller identity check",
          amount: `$${(paid.amount_cents / 100).toFixed(2)}`,
          paypal_capture_id: paid.paypal_capture_id,
          user_id: userId,
        },
      );
    }
  }

  if (nextStatus === "pending_review") {
    await alertAdminsOfIssue(admin, attemptId, userId, "pending_review");
  }

  log("reconciled", { user_id: userId, incoming, action: actionTaken, next: nextStatus });

  return {
    status: nextStatus,
    identity_status: incoming,
    payment_state: paymentState,
    badge_active: verified,
    action_taken: actionTaken,
    message,
  };
}

/**
 * Voids authorizations left open past the TTL. Idempotent — already-voided
 * rows are skipped, and PayPal errors for stale authorizations are benign.
 */
export async function cleanupAbandonedAuthorizations(
  admin: Admin,
  hours = VERIFIED_SELLER.authorizationTtlHours,
): Promise<{ scanned: number; voided: number }> {
  const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data } = await admin
    .from("seller_verification_payments")
    .select("*")
    .in("state", OPEN_PAYMENT_STATES)
    .lt("created_at", cutoff)
    .limit(200);

  const rows = (data ?? []) as PaymentRow[];
  let voided = 0;
  for (const row of rows) {
    // Never touch money for a user whose badge is already live.
    const record = await ensureVerification(admin, row.user_id);
    if (isBadgeEligible(record)) continue;

    // Respect a late-but-successful identity result.
    if (row.paypal_authorization_id && record.identity_status === "success") continue;

    const result = await voidAuthorizationOnce(admin, row, "abandoned_authorization");
    if (result.ok) {
      voided += 1;
      await admin
        .from("seller_verifications")
        .update({
          status: record.status === "verified" ? record.status : "canceled",
          payment_state: "voided",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", row.user_id)
        .neq("status", "verified");
    }
  }
  log("cleanup_complete", { scanned: rows.length, voided });
  return { scanned: rows.length, voided };
}

/** Confirms an authorization is still usable before starting a Plaid session. */
export async function authorizationIsUsable(authorizationId: string): Promise<boolean> {
  try {
    const auth = await getPayPalAuthorization(authorizationId) as { status?: string };
    return (auth?.status ?? "").toUpperCase() === "CREATED" ||
      (auth?.status ?? "").toUpperCase() === "PENDING";
  } catch {
    return false;
  }
}
