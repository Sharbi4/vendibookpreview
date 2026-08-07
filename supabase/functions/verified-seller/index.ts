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
  publicOfferConfig,
  VERIFIED_SELLER,
} from "../_shared/verifiedSellerLogic.ts";
import {
  captureAuthorizationOnce,
  capturedPayment,
  ensureVerification,
  isOfferEnabled,
  latestOpenPayment,
  log,
  reconcileVerification,
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
) {
  const badge = isBadgeEligible(record);
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
    })
    .select()
    .single();

  if (insertErr || !inserted) {
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

/** Creates or resumes the Plaid session and returns a Link token. */
async function openPlaidSession(
  admin: any,
  userId: string,
  templateId: string,
  payment: PaymentRow | null,
) {
  const session = await createIdentityVerification({ clientUserId: userId, templateId });

  await admin.from("seller_verification_attempts").upsert({
    user_id: userId,
    plaid_verification_id: session.id,
    previous_verification_id: session.previous_attempt_id ?? null,
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

  const webhook = `${Deno.env.get("SUPABASE_URL")}/functions/v1/verified-seller-webhook`;
  const link = await createIdvLinkToken({ clientUserId: userId, templateId, webhook });

  return { session, linkToken: link.link_token };
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

    // ------------------------------------------------------------ status
    if (action === "status") {
      const payment = await latestOpenPayment(admin, userId);
      return jsonResponse(200, publicState(record, payment, enabled));
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
        ...publicState(record, null, enabled),
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
          ...publicState(record, open, enabled),
          resume: true,
          message: "Your payment is already authorized — continue to the identity check.",
        });
      }
      if (open?.state === "created" && open.paypal_order_id) {
        return jsonResponse(200, {
          ...publicState(record, open, enabled),
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
        ...publicState(record, created.payment, enabled),
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
          return jsonResponse(200, { ...publicState(await ensureVerification(admin, userId), null, enabled), ...settled });
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
        const { session, linkToken } = await openPlaidSession(
          admin,
          userId,
          templateId,
          payment,
        );

        await admin
          .from("seller_verifications")
          .update({
            status: "identity_in_progress",
            identity_status: session.status ?? "active",
            current_attempt_id: session.id,
            template_id: templateId,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        return jsonResponse(200, {
          status: "identity_in_progress",
          link_token: linkToken,
          badge_active: false,
        });
      } catch (err) {
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
    if (action === "link-token") {
      if (!templateId || !record.current_attempt_id) {
        return jsonError(400, "no_session", "There's no identity check in progress.");
      }
      const link = await createIdvLinkToken({
        clientUserId: userId,
        templateId,
        webhook: `${Deno.env.get("SUPABASE_URL")}/functions/v1/verified-seller-webhook`,
      });
      return jsonResponse(200, { link_token: link.link_token });
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
        ...publicState(fresh, payment, enabled),
        action_taken: result.action_taken,
        message: result.message,
      });
    }

    // ------------------------------------------------------------- retry
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

      // Fresh authorization for the retry — captured only if the retry passes.
      let payment = await latestOpenPayment(admin, userId);
      if (!payment) {
        const created = await createAuthorizeOrder(admin, userId);
        if (created instanceof Response) return created;
        payment = created.payment;
        await admin
          .from("seller_verifications")
          .update({ status: "awaiting_authorization", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
        return jsonResponse(200, {
          ...publicState(record, payment, enabled),
          status: "awaiting_authorization",
          order_id: created.orderId,
          retrying: true,
        });
      }

      // Plaid's dedicated retry endpoint — never `create`, which would bill again.
      const session = await retryIdentityVerification({ clientUserId: userId, templateId });
      await admin.from("seller_verification_attempts").upsert({
        user_id: userId,
        plaid_verification_id: session.id,
        previous_verification_id: session.previous_attempt_id ?? record.current_attempt_id,
        template_id: templateId,
        status: session.status ?? "active",
      }, { onConflict: "plaid_verification_id" });

      await admin
        .from("seller_verifications")
        .update({
          status: "identity_in_progress",
          identity_status: session.status ?? "active",
          current_attempt_id: session.id,
          retry_count: (record.retry_count ?? 0) + 1,
          last_reason_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      const link = await createIdvLinkToken({
        clientUserId: userId,
        templateId,
        webhook: `${Deno.env.get("SUPABASE_URL")}/functions/v1/verified-seller-webhook`,
      });
      return jsonResponse(200, { status: "identity_in_progress", link_token: link.link_token });
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
        return jsonResponse(200, { status: "payment_required", order_id: open.paypal_order_id });
      }
      const created = await createAuthorizeOrder(admin, userId);
      if (created instanceof Response) return created;
      return jsonResponse(200, { status: "payment_required", order_id: created.orderId });
    }

    // ------------------------------------------------------------ cancel
    if (action === "cancel") {
      const open = await latestOpenPayment(admin, userId);
      if (open) await voidAuthorizationOnce(admin, open, "user_canceled");
      await admin
        .from("seller_verifications")
        .update({
          status: "canceled",
          payment_state: open ? "voided" : record.payment_state,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .neq("status", "verified");

      return jsonResponse(200, {
        ...publicState(await ensureVerification(admin, userId), null, enabled),
        message: "Verification canceled. Nothing was charged and any hold was released.",
      });
    }

    return jsonError(400, "unknown_action", "That action isn't supported.");
  } catch (err) {
    log("unhandled_error", { message: (err as Error).message });
    return unknownErrorResponse(err);
  }
});
