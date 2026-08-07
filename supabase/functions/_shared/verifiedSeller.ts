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
  getPayPalOrder,
  refundPayPalCapture,
  voidPayPalAuthorization,
} from "./paypal.ts";
import { getIdentityVerification, plaidLog } from "./plaid.ts";
import {
  classifyVoidError,
  decideFromPlaidStatus,
  extractCaptureId,
  extractCaptureIdFromOrder,
  extractCaptureStatus,
  isBadgeEligible,
  type MoneyResolution,
  type MoneyState,
  type PlaidIdvStatus,
  resolveMoneyOutcome,
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
  purpose?: string | null;
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
/**
 * Reads the offer switch. FAILS CLOSED: any error, missing row or missing
 * flag means the offer is unavailable, never silently enabled.
 */
export async function isOfferEnabled(admin: Admin): Promise<boolean> {
  const { data, error } = await admin
    .from("app_feature_flags")
    .select("enabled")
    .eq("key", VERIFIED_SELLER.flagKey)
    .maybeSingle();
  if (error) {
    log("offer_flag_read_failed", { code: error.code ?? null });
    return false;
  }
  return data?.enabled === true;
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
 * Mirrors a money transition onto the authoritative seller record so the UI
 * never shows a stale payment state. Never downgrades a live paid badge.
 */
export async function syncPaymentState(admin: Admin, userId: string, state: string) {
  const query = admin
    .from("seller_verifications")
    .update({ payment_state: state, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (state !== "captured") query.neq("status", "verified");
  await query;
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
      await syncPaymentState(admin, payment.user_id, "failed");
      return { ok: false, errorCode: status || "CAPTURE_NOT_COMPLETED" };
    }

    await markPayment(admin, payment.id, {
      state: "captured",
      paypal_capture_id: captureId,
      captured_at: new Date().toISOString(),
      error_code: null,
    });
    await syncPaymentState(admin, payment.user_id, "captured");
    log("captured", { payment_id: payment.id });
    return { ok: true, captureId };
  } catch (err) {
    const code = (err as { errorCode?: string })?.errorCode ?? "CAPTURE_FAILED";
    await markPayment(admin, payment.id, { state: "failed", error_code: code });
    await syncPaymentState(admin, payment.user_id, "failed");
    log("capture_failed", { payment_id: payment.id, code });
    return { ok: false, errorCode: code };
  }
}

/**
 * Releases a held authorization exactly once and reports the AUTHORITATIVE
 * final money position. Never charges.
 *
 * Callers must persist `moneyState` — a successful emergency refund must never
 * be overwritten back to the earlier `authorized` / `captured` state.
 */
export async function voidAuthorizationOnce(
  admin: Admin,
  payment: PaymentRow,
  reason: string,
): Promise<MoneyResolution> {
  if (payment.state === "voided") {
    return resolveMoneyOutcome({ void: "benign" });
  }
  if (payment.state === "captured") {
    return await reconcileUnexpectedCapture(admin, payment, reason);
  }
  if (!payment.paypal_authorization_id) {
    await markPayment(admin, payment.id, {
      state: "voided",
      voided_at: new Date().toISOString(),
      error_code: reason,
    });
    await syncPaymentState(admin, payment.user_id, "voided");
    return resolveMoneyOutcome({ void: "confirmed" });
  }

  try {
    await voidPayPalAuthorization(
      payment.paypal_authorization_id,
      `vs-void-${payment.id}`,
    );
  } catch (err) {
    const code = (err as { errorCode?: string })?.errorCode ?? "";
    const text = `${code} ${(err as Error).message ?? ""}`;
    const kind = classifyVoidError(text);

    /**
     * ALREADY_CAPTURED is NOT a successful void — money moved. Reconcile the
     * real order and refund if identity did not succeed. Only confirmed
     * voided / expired / not-found outcomes may be recorded as a release.
     */
    if (kind === "already_captured") {
      return await reconcileUnexpectedCapture(admin, payment, reason);
    }

    if (kind === "failed") {
      await markPayment(admin, payment.id, { error_code: code || "VOID_FAILED" });
      log("void_failed", { payment_id: payment.id, code });
      await alertAdminsOfIssue(admin, payment.id, payment.user_id, "void_failed", {
        error_code: code || "VOID_FAILED",
      });
      return resolveMoneyOutcome({ void: "failed", errorCode: code || "VOID_FAILED" });
    }
  }

  await markPayment(admin, payment.id, {
    state: "voided",
    voided_at: new Date().toISOString(),
    error_code: reason,
  });
  await syncPaymentState(admin, payment.user_id, "voided");
  log("voided", { payment_id: payment.id, reason });
  return resolveMoneyOutcome({ void: "confirmed" });
}

/**
 * PayPal says the authorization was already captured. Record the true state
 * and, if the identity check did not succeed, refund it — a void that cannot
 * void must never be reported as a released hold.
 *
 * A GET on the AUTHORIZATION only returns a status, never the capture id, so
 * the capture id is recovered from the ORDER resource before refunding.
 */
async function reconcileUnexpectedCapture(
  admin: Admin,
  payment: PaymentRow,
  reason: string,
): Promise<MoneyResolution> {
  let captureId = payment.paypal_capture_id;

  if (!captureId && payment.paypal_authorization_id) {
    try {
      const auth = await getPayPalAuthorization(payment.paypal_authorization_id) as {
        status?: string;
      };
      log("void_reconcile", { payment_id: payment.id, auth_status: auth?.status ?? null });
    } catch {
      /* status is informational only */
    }
  }

  if (!captureId && payment.paypal_order_id) {
    try {
      const order = await getPayPalOrder(payment.paypal_order_id);
      captureId = extractCaptureIdFromOrder(order);
      log("capture_id_recovered", { payment_id: payment.id, found: !!captureId });
    } catch (err) {
      log("capture_id_lookup_failed", { payment_id: payment.id, message: (err as Error).message });
    }
  }

  await markPayment(admin, payment.id, {
    state: "captured",
    captured_at: payment.created_at ?? new Date().toISOString(),
    ...(captureId ? { paypal_capture_id: captureId } : {}),
    error_code: "ALREADY_CAPTURED",
  });
  await syncPaymentState(admin, payment.user_id, "captured");

  const record = await ensureVerification(admin, payment.user_id);
  if (record?.identity_status === "success") {
    // Legitimately paid — nothing to release.
    return resolveMoneyOutcome({ alreadyCaptured: true, identitySucceeded: true });
  }

  if (!captureId) {
    await alertAdminsOfIssue(admin, payment.id, payment.user_id, "already_captured_no_capture_id");
    return resolveMoneyOutcome({
      alreadyCaptured: true,
      refund: "not_attempted",
      errorCode: "ALREADY_CAPTURED_UNRESOLVED",
    });
  }

  const refreshed = { ...payment, state: "captured", paypal_capture_id: captureId } as PaymentRow;
  const refunded = await refundPaymentOnce(
    admin,
    refreshed,
    `already_captured:${reason}`.slice(0, 120),
  );
  if (!refunded.ok) {
    await alertAdminsOfIssue(admin, payment.id, payment.user_id, "already_captured_refund_failed");
    return resolveMoneyOutcome({ alreadyCaptured: true, refund: "failed" });
  }
  return resolveMoneyOutcome({ alreadyCaptured: true, refund: "succeeded" });
}


/**
 * Safety net: refunds any capture that should never have been taken, or a
 * duplicate capture beyond the first.
 */
export async function refundPaymentOnce(
  admin: Admin,
  payment: PaymentRow,
  reason: string,
  opts: { adminId?: string | null } = {},
): Promise<{ ok: boolean; refundId?: string }> {
  if (payment.paypal_refund_id) {
    await applyRefundToVerification(admin, payment.user_id, reason);
    return { ok: true, refundId: payment.paypal_refund_id };
  }
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
      refund_reason: reason.slice(0, 500),
      refunded_by: opts.adminId ?? null,
      error_code: reason,
    });
    // The badge must die with the money, in the same operation.
    await applyRefundToVerification(admin, payment.user_id, reason);
    log("refunded", { payment_id: payment.id, reason });
    return { ok: true, refundId: refundId ?? undefined };
  } catch (err) {
    log("refund_failed", { payment_id: payment.id, message: (err as Error).message });
    return { ok: false };
  }
}

/**
 * A refunded verification is never badge-eligible. Applied atomically with the
 * refund so `payment_state` can never stay `captured` behind a refunded charge.
 * Runs only when no OTHER capture still stands for the seller.
 */
async function applyRefundToVerification(admin: Admin, userId: string, reason: string) {
  const remaining = await capturedPayment(admin, userId);
  if (remaining) return; // another live capture still funds the badge

  await admin
    .from("seller_verifications")
    .update({
      payment_state: "refunded",
      status: "payment_required",
      verified_at: null,
      last_reason_code: `refunded:${reason}`.slice(0, 200),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
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

  /**
   * Attempt lineage. A webhook can arrive for a superseded attempt after a
   * retry created a newer one. We still record that attempt's own status, but
   * the seller's authoritative record must always follow the CURRENT attempt.
   */
  const eventAttemptId = opts.verificationId ?? null;
  const currentAttemptId = record.current_attempt_id ?? null;
  const isStaleAttempt = !!eventAttemptId && !!currentAttemptId &&
    eventAttemptId !== currentAttemptId;

  if (isStaleAttempt) {
    try {
      const stale = await getIdentityVerification(eventAttemptId!);
      await admin
        .from("seller_verification_attempts")
        .update({ status: stale.status ?? "active", updated_at: new Date().toISOString() })
        .eq("plaid_verification_id", eventAttemptId);
    } catch {
      /* recording history is best effort */
    }
    log("stale_attempt_ignored", { event_attempt: eventAttemptId, current: currentAttemptId });
    // Fall through and reconcile the CURRENT attempt instead.
  }

  const attemptId = isStaleAttempt ? currentAttemptId! : (eventAttemptId ?? currentAttemptId);
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
      /**
       * Preserve the AUTHORITATIVE final money state. A successful emergency
       * refund must never be overwritten back to the earlier payment row
       * state, and an unresolved void must never be reported as released.
       */
      paymentState = voided.moneyState === "unresolved"
        ? payment.state
        : voided.moneyState;
      if (voided.needsAdminAttention) {
        await alertAdminsOfIssue(admin, payment.id, userId, "void_needs_attention", {
          error_code: voided.errorCode,
          money_state: voided.moneyState,
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
    // Only a CONFIRMED release counts. Captured/unresolved money is left for
    // the admin queue rather than being silently marked as canceled.
    if (result.moneyState !== "voided") continue;
    voided += 1;

    /**
     * A pending_review seller keeps their identity session. Only the money is
     * released — if Plaid later reports success they move to payment_required
     * and pay without ever rerunning the check.
     */
    const stillPending = record.identity_status === "pending_review" ||
      record.status === "pending_review";

    await admin
      .from("seller_verifications")
      .update({
        status: stillPending ? "pending_review" : "canceled",
        payment_state: "voided",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", row.user_id)
      .neq("status", "verified");
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
