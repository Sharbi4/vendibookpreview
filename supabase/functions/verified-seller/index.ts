import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  corsHeaders,
  jsonError,
  jsonResponse,
  unknownErrorResponse,
} from "../_shared/jsonError.ts";
import {
  authorizePayPalOrder,
  createPayPalAuthorizeOrder,
  PayPalError,
} from "../_shared/paypal.ts";
import {
  createIdentityVerification,
  createIdvLinkToken,
  PlaidError,
  plaidConfigStatus,
  plaidTemplateId,
  retryIdentityVerification,
} from "../_shared/plaid.ts";
import {
  extractAuthorizationId,
  extractAuthorizationStatus,
  isAuthorizationCapabilityIssue,
  isBadgeEligible,
  needsPaymentOnly,
  canSelfServiceRetry,
  type PaymentPurpose,
  publicOfferConfig,
  VERIFIED_SELLER,
} from "../_shared/verifiedSellerLogic.ts";
import {
  authorizationIsUsable,
  captureAuthorizationOnce,
  capturedPayment,
  ensureVerification,
  isOfferEnabled,
  latestOpenPayment,
  log,
  reconcileVerification,
  syncPaymentState,
  voidAuthorizationOnce,
  type PaymentRow,
  type VerificationRow,
} from "../_shared/verifiedSeller.ts";

/**
 * Verified Seller — authenticated seller-facing endpoint.
 *
 * Actions:
 *   status           read sanitized state + public offer config
 *   start            accept terms, create a $19.99 AUTHORIZE order
 *   authorize        authorize the approved order, then open/resume Plaid
 *   link-token       resume Plaid Link for an in-flight attempt
 *   refresh          pull authoritative Plaid status and settle the money
 *   retry            one free Plaid retry (re-authorizes, captures only on success)
 *   complete-payment identity already passed — take payment without a new Plaid session
 *   cancel           void any open authorization and stop
 *
 * The browser never sends amounts, template ids or provider ids.
 */

const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ?? null;

/** Sanitized shape the seller is allowed to see. Never provider secrets. */
function publicState(
  record: VerificationRow | null,
  payment: PaymentRow | null,
  enabled: boolean,
  /**
   * Legacy grandfathering: sellers who completed the retired identity check
   * keep the badge forever. They are never asked to pay again, and the badge
   * is derived server-side from `profiles.identity_verified`.
   */
  legacyVerified = false,
) {
  const badge = isBadgeEligible(record) || legacyVerified;
  return {
    offer: publicOfferConfig(enabled),
    status: badge ? "verified" : record?.status ?? "not_started",
    identity_status: record?.identity_status ?? null,
    payment_state: record?.payment_state ?? "none",
    badge_active: badge,
    verified_at: badge ? record?.verified_at ?? null : null,
    revoked: !!record?.revoked_at,
    needs_payment_only: needsPaymentOnly(record),
    can_retry: canSelfServiceRetry(record),
    retry_count: record?.retry_count ?? 0,
    retry_allowance: record?.retry_allowance ?? VERIFIED_SELLER.selfServiceRetryLimit,
    has_open_authorization: !!payment && payment.state === "authorized",
    terms_version: VERIFIED_SELLER.termsVersion,
  };
}

async function createAuthorizeOrder(
  admin: any,
  userId: string,
  purpose: PaymentPurpose = "initial",
): Promise<{ payment: PaymentRow; orderId: string } | Response> {
  const reference = `VS-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;
  const idempotencyKey = `vs-order-${userId}-${reference}`;

  const { data: inserted, error: insertErr } = await admin
    .from("seller_verification_payments")
    .insert({
      user_id: userId,
      reference,
      idempotency_key: idempotencyKey,
      amount_cents: VERIFIED_SELLER.priceCents,
      currency: VERIFIED_SELLER.currency,
      state: "created",
      purpose,
    })
    .select()
    .single();

  if (insertErr || !inserted) {
    /**
     * The one-open-payment unique index won the race (double-click, two tabs).
     * Return the order that already exists rather than a generic failure —
     * never create a second hold.
     */
    if ((insertErr as { code?: string })?.code === "23505") {
      const existing = await latestOpenPayment(admin, userId);
      if (existing?.paypal_order_id) {
        log("reusing_open_order", { payment_id: existing.id });
        return { payment: existing, orderId: existing.paypal_order_id };
      }
    }
    return jsonError(500, "payment_setup_failed", "We couldn't start the payment. Please try again.");
  }

  try {
    const order = await createPayPalAuthorizeOrder({
      reference,
      description: VERIFIED_SELLER.productLabel,
      amountCents: VERIFIED_SELLER.priceCents,
      currency: VERIFIED_SELLER.currency,
      idempotencyKey,
      softDescriptor: "VENDIBOOK ID",
    }) as { id?: string };

    if (!order?.id) throw new Error("PayPal did not return an order id.");

    await admin
      .from("seller_verification_payments")
      .update({ paypal_order_id: order.id })
      .eq("id", inserted.id);

    return { payment: { ...inserted, paypal_order_id: order.id } as PaymentRow, orderId: order.id };
  } catch (err) {
    const issue = (err as PayPalError)?.issue ?? null;
    await admin
      .from("seller_verification_payments")
      .update({ state: "failed", error_code: issue ?? "ORDER_CREATE_FAILED" })
      .eq("id", inserted.id);

    if (isAuthorizationCapabilityIssue(issue)) {
      log("authorization_capability_missing", { issue });
      return jsonError(
        503,
        "authorization_unavailable",
        "Card authorization isn't available on this payment account right now, so we can't safely hold your $19.99. Nothing was charged — please try again later or contact support.",
      );
    }
    return jsonError(
      502,
      "payment_setup_failed",
      "PayPal couldn't start the payment. Nothing was charged. Please try again.",
    );
  }
}

async function issueLinkToken(userId: string, templateId: string) {
  const link = await createIdvLinkToken({
    clientUserId: userId,
    templateId,
    webhook: `${Deno.env.get("SUPABASE_URL")}/functions/v1/verified-seller-webhook`,
  });
  return link.link_token;
}

async function recordAttempt(
  admin: any,
  userId: string,
  templateId: string,
  session: { id: string; status?: string; previous_attempt_id?: string | null; request_id?: string },
  payment: PaymentRow | null,
  previousFallback?: string | null,
) {
  await admin.from("seller_verification_attempts").upsert({
    user_id: userId,
    plaid_verification_id: session.id,
    previous_verification_id: session.previous_attempt_id ?? previousFallback ?? null,
    template_id: templateId,
    status: session.status ?? "active",
    request_id: session.request_id ?? null,
  }, { onConflict: "plaid_verification_id" });

  if (payment) {
    await admin
      .from("seller_verification_payments")
      .update({ attempt_verification_id: session.id })
      .eq("id", payment.id);
  }
}

/**
 * Persists a freshly created Plaid session as the CURRENT attempt.
 *
 * This runs the moment Plaid returns a session id — before a Link token is
 * requested — so a Link-token failure can never orphan a session that Plaid
 * has already created (and, for a retry, already counted).
 */
async function persistSession(
  admin: any,
  userId: string,
  templateId: string,
  session: { id: string; status?: string; previous_attempt_id?: string | null; request_id?: string },
  payment: PaymentRow | null,
  previousFallback?: string | null,
) {
  await recordAttempt(admin, userId, templateId, session, payment, previousFallback);
  const { error: updateErr } = await admin
    .from("seller_verifications")
    .update({
      current_attempt_id: session.id,
      identity_status: session.status ?? "active",
      status: "identity_in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateErr) {
    throw new Error(`Failed to persist verification session: ${updateErr.message}`);
  }
}

/**
 * Best-effort Link token issuance. A failure here is RECOVERABLE: the Plaid
 * session and the PayPal authorization both stay valid and the seller resumes
 * the very same session via the `link-token` action.
 */
async function tryIssueLinkToken(userId: string, templateId: string): Promise<string | null> {
  try {
    return await issueLinkToken(userId, templateId);
  } catch (err) {
    log("link_token_failed", { message: (err as Error).message });
    return null;
  }
}

/**
 * Starts the Plaid work that belongs to an authorized payment.
 *
 * A payment recorded with purpose `retry` ALWAYS uses Plaid's
 * /identity_verification/retry endpoint — never /create, which would start a
 * second billable session. The retry allowance is consumed atomically in the
 * database and released ONLY when the retry call itself failed before Plaid
 * returned a session. Once Plaid returns a session the retry is consumed for
 * good, even if the Link token cannot be issued right away.
 */
async function startPlaidForPayment(
  admin: any,
  userId: string,
  templateId: string,
  payment: PaymentRow | null,
  record: VerificationRow,
): Promise<{ linkToken: string | null; sessionId: string } | Response> {
  const isRetry = payment?.purpose === "retry";

  if (isRetry) {
    const { data: claimed } = await admin.rpc("claim_seller_verification_retry", {
      _user_id: userId,
    });
    if (claimed !== true) {
      return jsonError(
        403,
        "retry_limit_reached",
        "You've used your free retry. Contact support and we'll review your verification.",
      );
    }

    let session;
    try {
      session = await retryIdentityVerification({ clientUserId: userId, templateId });
    } catch (err) {
      // Plaid never created the attempt — give the allowance back.
      await admin.rpc("release_seller_verification_retry", { _user_id: userId });
      throw err;
    }

    // The retry now exists at Plaid. It stays consumed from here on.
    await persistSession(
      admin,
      userId,
      templateId,
      session,
      payment,
      record.current_attempt_id,
    );
    return { linkToken: await tryIssueLinkToken(userId, templateId), sessionId: session.id };
  }

  const session = await createIdentityVerification({ clientUserId: userId, templateId });
  await persistSession(admin, userId, templateId, session, payment);
  return { linkToken: await tryIssueLinkToken(userId, templateId), sessionId: session.id };
}

/** Recoverable response when Plaid has a session but no Link token yet. */
function linkTokenPending(sessionId: string) {
  return jsonResponse(200, {
    ok: false,
    error_code: "link_token_unavailable",
    session_id: sessionId,
    resumable: true,
    message:
      "Your identity check is reserved and your payment is still on hold — nothing extra was charged. " +
      "Reopen the check in a moment to finish it.",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in to continue.");
    const { data: userData, error: userErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    const user = userData?.user;
    if (userErr || !user) {
      return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");
    }
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "status");

    const enabled = await isOfferEnabled(admin);
    const record = await ensureVerification(admin, userId);

    // Grandfathered sellers from the retired identity provider stay verified.
    const { data: legacyProfile } = await admin
      .from("profiles")
      .select("identity_verified")
      .eq("id", userId)
      .maybeSingle();
    const legacyVerified = legacyProfile?.identity_verified === true;

    // ------------------------------------------------------------ status
    if (action === "status") {
      const payment = await latestOpenPayment(admin, userId);
      return jsonResponse(200, publicState(record, payment, enabled, legacyVerified));
    }

    if (!enabled) {
      return jsonError(
        403,
        "offer_unavailable",
        "Verified Seller isn't available right now. Nothing was charged.",
      );
    }

    if (isBadgeEligible(record) && action !== "refresh") {
      return jsonResponse(200, {
        ...publicState(record, null, enabled, legacyVerified),
        message: "You're already verified.",
      });
    }

    const templateId = plaidTemplateId();

    // ------------------------------------------------------------- start
    if (action === "start") {
      if (body?.accepted_terms !== true) {
        return jsonError(400, "terms_required", "Please accept the Verified Seller terms to continue.");
      }
      if (!templateId) {
        log("plaid_not_configured", plaidConfigStatus());
        return jsonError(
          503,
          "verification_unavailable",
          "Identity verification isn't available right now. Nothing was charged.",
        );
      }

      await admin.from("seller_verification_terms").insert({
        user_id: userId,
        terms_version: VERIFIED_SELLER.termsVersion,
        ip_address: clientIp(req),
        user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
      });

      // Reuse an authorization the seller already has open.
      const open = await latestOpenPayment(admin, userId);
      if (open?.state === "authorized") {
        return jsonResponse(200, {
          ...publicState(record, open, enabled, legacyVerified),
          resume: true,
          message: "Your payment is already authorized — continue to the identity check.",
        });
      }
      if (open?.state === "created" && open.paypal_order_id) {
        return jsonResponse(200, {
          ...publicState(record, open, enabled, legacyVerified),
          order_id: open.paypal_order_id,
        });
      }

      const created = await createAuthorizeOrder(admin, userId);
      if (created instanceof Response) return created;

      await admin
        .from("seller_verifications")
        .update({
          status: "awaiting_authorization",
          terms_version: VERIFIED_SELLER.termsVersion,
          template_id: templateId,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      return jsonResponse(200, {
        ...publicState(record, created.payment, enabled, legacyVerified),
        status: "awaiting_authorization",
        order_id: created.orderId,
      });
    }

    // --------------------------------------------------------- authorize
    if (action === "authorize") {
      const orderId = String(body?.order_id ?? "");
      if (!orderId) return jsonError(400, "missing_fields", "Missing payment reference.");

      const { data: paymentRow } = await admin
        .from("seller_verification_payments")
        .select("*")
        .eq("user_id", userId)
        .eq("paypal_order_id", orderId)
        .maybeSingle();
      const payment = paymentRow as PaymentRow | null;
      if (!payment) return jsonError(404, "not_found", "We couldn't find that payment.");

      // Double-click / redirect replay: already authorized, just continue.
      let authorizationId = payment.paypal_authorization_id;
      if (!authorizationId) {
        try {
          const authorized = await authorizePayPalOrder(orderId, `vs-auth-${payment.id}`);
          authorizationId = extractAuthorizationId(authorized);
          const authStatus = extractAuthorizationStatus(authorized);
          if (!authorizationId) throw new Error("No authorization returned.");

          await admin
            .from("seller_verification_payments")
            .update({
              paypal_authorization_id: authorizationId,
              state: "authorized",
              authorized_at: new Date().toISOString(),
              expires_at: new Date(
                Date.now() + VERIFIED_SELLER.authorizationTtlHours * 3600_000,
              ).toISOString(),
              error_code: authStatus && authStatus !== "CREATED" ? authStatus : null,
            })
            .eq("id", payment.id);

          // Keep the authoritative seller record truthful about the hold.
          await syncPaymentState(admin, userId, "authorized");
        } catch (err) {
          const issue = (err as PayPalError)?.issue ?? null;
          await admin
            .from("seller_verification_payments")
            .update({ state: "failed", error_code: issue ?? "AUTHORIZE_FAILED" })
            .eq("id", payment.id);

          if (isAuthorizationCapabilityIssue(issue)) {
            return jsonError(
              503,
              "authorization_unavailable",
              "This payment account can't hold an authorization right now. Nothing was charged — please contact support.",
            );
          }
          return jsonError(
            502,
            "authorization_failed",
            "PayPal couldn't hold the payment. Nothing was charged. Please try again.",
          );
        }
      }

      // Identity already passed earlier — this order is the payment retry.
      if (record.identity_status === "success") {
        const fresh = await latestOpenPayment(admin, userId);
        if (fresh) {
          const capture = await captureAuthorizationOnce(admin, fresh);
          if (!capture.ok) {
            return jsonError(
              502,
              "capture_failed",
              "We couldn't complete the payment. Your identity check is still valid — please try again.",
            );
          }
          const settled = await reconcileVerification(admin, userId);
          return jsonResponse(200, { ...publicState(await ensureVerification(admin, userId), null, enabled, legacyVerified), ...settled });
        }
      }

      if (!templateId) {
        // Never leave money held when we cannot start the check.
        const open = await latestOpenPayment(admin, userId);
        if (open) await voidAuthorizationOnce(admin, open, "verification_unavailable");
        return jsonError(
          503,
          "verification_unavailable",
          "Identity verification isn't available right now. Your authorization was released and you were not charged.",
        );
      }

      try {
        const started = await startPlaidForPayment(admin, userId, templateId, payment, record);
        if (started instanceof Response) {
          // Retry allowance exhausted — release the fresh hold, never charge.
          const open = await latestOpenPayment(admin, userId);
          if (open) await voidAuthorizationOnce(admin, open, "retry_not_allowed");
          return started;
        }

        await admin
          .from("seller_verifications")
          .update({
            status: "identity_in_progress",
            identity_status: "active",
            current_attempt_id: started.sessionId,
            template_id: templateId,
            last_reason_code: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        /**
         * Plaid has the session but the Link token could not be minted. The
         * hold stays put and the session is resumable — voiding here would
         * strand a consumed Plaid attempt.
         */
        if (!started.linkToken) return linkTokenPending(started.sessionId);

        return jsonResponse(200, {
          status: "identity_in_progress",
          link_token: started.linkToken,
          badge_active: false,
        });
      } catch (err) {
        // Only a failure to CREATE the session releases the money.
        const open = await latestOpenPayment(admin, userId);
        if (open) await voidAuthorizationOnce(admin, open, "plaid_session_failed");
        log("plaid_session_failed", { code: (err as PlaidError)?.errorCode });
        return jsonError(
          502,
          "verification_start_failed",
          "We couldn't start the identity check. Your authorization was released and you were not charged.",
        );
      }
    }

    // -------------------------------------------------------- link-token
    /**
     * Resume. Reopens Plaid Link for an identity check already in flight so
     * the seller never accepts terms twice or authorizes a second payment.
     */
    if (action === "link-token") {
      if (!templateId) {
        return jsonError(503, "verification_unavailable", "Identity verification isn't available right now.");
      }

      if (record.current_attempt_id) {
        return jsonResponse(200, {
          link_token: await issueLinkToken(userId, templateId),
          status: record.status,
          resumed: true,
        });
      }

      /**
       * An authorization is held but no Plaid session exists — reconcile
       * safely rather than stranding the hold: open the session now if the
       * money is still usable, otherwise release it.
       */
      const open = await latestOpenPayment(admin, userId);
      if (open?.state === "authorized") {
        if (open.paypal_authorization_id && await authorizationIsUsable(open.paypal_authorization_id)) {
          const started = await startPlaidForPayment(admin, userId, templateId, open, record);
          if (started instanceof Response) return started;
          await admin
            .from("seller_verifications")
            .update({
              status: "identity_in_progress",
              identity_status: "active",
              current_attempt_id: started.sessionId,
              template_id: templateId,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
          if (!started.linkToken) return linkTokenPending(started.sessionId);
          return jsonResponse(200, {
            link_token: started.linkToken,
            status: "identity_in_progress",
            resumed: true,
          });
        }
        const released = await voidAuthorizationOnce(admin, open, "unusable_authorization");
        if (!released.ok) {
          return jsonError(
            502,
            "hold_not_released",
            "We couldn't confirm the release of your payment hold. Our team has been alerted and will resolve it — please don't start again yet.",
          );
        }
        return jsonError(
          409,
          "authorization_expired",
          "Your payment hold expired before the identity check started. Nothing was charged — you can start again.",
        );
      }

      return jsonError(400, "no_session", "There's no identity check in progress.");
    }


    // ----------------------------------------------------------- refresh
    /**
     * The only path that can activate a badge from the client side — and it
     * does so by asking Plaid, never by trusting the browser. Plaid Link's
     * onSuccess callback lands here and still proves nothing on its own.
     */
    if (action === "refresh") {
      const result = await reconcileVerification(admin, userId);
      const fresh = await ensureVerification(admin, userId);
      const payment = await latestOpenPayment(admin, userId);
      return jsonResponse(200, {
        ...publicState(fresh, payment, enabled, legacyVerified),
        action_taken: result.action_taken,
        message: result.message,
      });
    }

    // ------------------------------------------------------------- retry
    /**
     * One free self-service retry. This action only ARRANGES the money: it
     * records a payment whose purpose is `retry`, so once PayPal approval
     * comes back through `authorize` the server calls Plaid's
     * /identity_verification/retry endpoint — never /create.
     */
    if (action === "retry") {
      if (!templateId) {
        return jsonError(503, "verification_unavailable", "Identity verification isn't available right now.");
      }
      if (!canSelfServiceRetry(record)) {
        return jsonError(
          403,
          "retry_limit_reached",
          "You've used your free retry. Contact support and we'll review your verification.",
        );
      }

      const open = await latestOpenPayment(admin, userId);

      // An authorization is already held for this retry — go straight to Plaid.
      if (open?.state === "authorized" && open.purpose === "retry") {
        const started = await startPlaidForPayment(admin, userId, templateId, open, record);
        if (started instanceof Response) return started;
        await admin
          .from("seller_verifications")
          .update({
            status: "identity_in_progress",
            identity_status: "active",
            current_attempt_id: started.sessionId,
            last_reason_code: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        if (!started.linkToken) return linkTokenPending(started.sessionId);
        return jsonResponse(200, {
          status: "identity_in_progress",
          link_token: started.linkToken,
          badge_active: false,
        });
      }

      // Reuse an unapproved order, otherwise create a fresh retry order.
      if (open?.state === "created" && open.paypal_order_id) {
        await admin
          .from("seller_verification_payments")
          .update({ purpose: "retry" })
          .eq("id", open.id);
        return jsonResponse(200, {
          ...publicState(record, open, enabled, legacyVerified),
          status: "awaiting_authorization",
          order_id: open.paypal_order_id,
          retrying: true,
        });
      }

      const created = await createAuthorizeOrder(admin, userId, "retry");
      if (created instanceof Response) return created;
      await admin
        .from("seller_verifications")
        .update({ status: "awaiting_authorization", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      return jsonResponse(200, {
        ...publicState(record, created.payment, enabled, legacyVerified),
        status: "awaiting_authorization",
        order_id: created.orderId,
        retrying: true,
      });
    }


    // -------------------------------------------------- complete-payment
    /**
     * Identity succeeded but the money never landed. Issues a brand new
     * $19.99 authorization WITHOUT touching Plaid, so the seller is never
     * asked to verify twice.
     */
    if (action === "complete-payment") {
      if (!needsPaymentOnly(record)) {
        return jsonError(400, "not_applicable", "There's no outstanding payment for your verification.");
      }
      const already = await capturedPayment(admin, userId);
      if (already) {
        const settled = await reconcileVerification(admin, userId);
        return jsonResponse(200, settled);
      }
      const open = await latestOpenPayment(admin, userId);
      if (open?.paypal_order_id && open.state === "created") {
        // Relabel: this order buys the badge only, it must never start Plaid.
        if (open.purpose !== "payment_only") {
          await admin
            .from("seller_verification_payments")
            .update({ purpose: "payment_only" })
            .eq("id", open.id);
        }
        return jsonResponse(200, { status: "payment_required", order_id: open.paypal_order_id });
      }
      const created = await createAuthorizeOrder(admin, userId, "payment_only");
      if (created instanceof Response) return created;
      return jsonResponse(200, { status: "payment_required", order_id: created.orderId });
    }

    // ------------------------------------------------------------ cancel
    /**
     * Cancel may only claim "nothing was charged" when PayPal actually
     * confirms the release. An unresolved or captured hold stays truthful in
     * the authoritative record and is escalated instead of being papered over.
     */
    if (action === "cancel") {
      const open = await latestOpenPayment(admin, userId);
      const released = open
        ? await voidAuthorizationOnce(admin, open, "user_canceled")
        : null;

      if (released && !released.ok) {
        return jsonError(
          502,
          "hold_not_released",
          released.moneyState === "captured"
            ? "Your payment went through before we could cancel, so we're sorting it out now. Our team has been alerted and will follow up — please don't try again yet."
            : "We couldn't confirm that your payment hold was released. Our team has been alerted and will resolve it — please don't try again yet.",
        );
      }

      await admin
        .from("seller_verifications")
        .update({
          status: "canceled",
          payment_state: released ? released.moneyState : record.payment_state,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .neq("status", "verified");

      return jsonResponse(200, {
        ...publicState(await ensureVerification(admin, userId), null, enabled, legacyVerified),
        message: released?.moneyState === "refunded"
          ? "Verification canceled and your payment was refunded."
          : "Verification canceled. Nothing was charged and any hold was released.",
      });
    }

    return jsonError(400, "unknown_action", "That action isn't supported.");
  } catch (err) {
    log("unhandled_error", { message: (err as Error).message });
    return unknownErrorResponse(err);
  }
});

