import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alertAdminsOfPaymentOnce, formatUsd } from "../_shared/adminPaymentAlert.ts";
import { corsHeaders, jsonResponse } from "../_shared/jsonError.ts";
import { centsFromPayPalAmount, safeLog, verifyPayPalWebhook } from "../_shared/paypal.ts";
import { extractCaptureFacts, finalizeCapture } from "../_shared/paypalFinalize.ts";
import { appendLedgerEntry, recalculatePayableAfterRefund } from "../_shared/paypalAccounting.ts";
import { notifyOrderParties, notifyUser } from "../_shared/notify.ts";
import { resolveSubscriptionPeriod } from "../_shared/subscriptionPeriod.ts";
import { grantMonthlyBoostCredit } from "../_shared/proBoostCredit.ts";
import { resolvePaidPeriodKind } from "../_shared/proMembershipEmail.ts";
import { sendSubscriptionLifecycleEmail } from "../_shared/subscriptionLifecycleEmail.ts";

/**
 * Verified, idempotent PayPal webhook receiver for both one-time payments
 * and recurring memberships. Never trusts an unverified payload.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const rawBody = await req.text();
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "Malformed webhook payload." });
  }

  const eventId = event?.id;
  const eventType = event?.event_type;
  if (!eventId || !eventType) {
    return jsonResponse(400, { error: "Missing event id or type." });
  }

  // ------------------------------------------------------------------ verify
  // Signature verification happens BEFORE the event id is reserved. Otherwise a
  // forged payload could "poison" a legitimate retry by claiming its id first.
  const verified = await verifyPayPalWebhook(req.headers, rawBody);
  if (!verified) {
    safeLog("webhook_rejected_unverified", { eventId, eventType });
    return jsonResponse(401, { error: "Signature verification failed." });
  }

  // --------------------------------------------------------------- idempotency
  // Reserve the event. A duplicate short-circuits ONLY when the earlier copy was
  // already processed successfully; an unprocessed or failed row stays claimable
  // so PayPal's retry (or reconciliation) can finish the job.
  const { error: insertErr } = await admin.from("paypal_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    resource_type: event?.resource_type ?? null,
    resource_id: event?.resource?.id ?? null,
    raw_event: event,
    verification_status: "verified",
  });
  if (insertErr) {
    if (insertErr.code === "23505") {
      const { data: existing } = await admin.from("paypal_webhook_events")
        .select("processed").eq("event_id", eventId).maybeSingle();
      if (existing?.processed) {
        safeLog("webhook_duplicate_ignored", { eventId, eventType });
        return jsonResponse(200, { received: true, duplicate: true });
      }
      // Verified retry of an event that never completed — mark verified and
      // fall through so processing is attempted again (handlers are idempotent).
      await admin.from("paypal_webhook_events")
        .update({ verification_status: "verified", raw_event: event })
        .eq("event_id", eventId);
      safeLog("webhook_retry_claimed", { eventId, eventType });
    } else {
      safeLog("webhook_store_failed", { eventId, message: insertErr.message });
      return jsonResponse(500, { error: "Could not store event." });
    }
  }


  try {
    await handleEvent(admin, event);
    await admin.from("paypal_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("event_id", eventId);
  } catch (err) {
    const message = (err as Error).message;
    safeLog("webhook_processing_failed", { eventId, eventType, message });
    await admin.from("paypal_webhook_events")
      .update({ processing_error: message })
      .eq("event_id", eventId);
    await alertAdmins(admin, `PayPal webhook ${eventType} failed`, message);
    // Retryable: the row stays unprocessed and re-claimable, so PayPal's retry
    // (and our reconciliation sweep) can complete the fulfillment.
    return jsonResponse(500, { received: false, processing_error: true });
  }

  return jsonResponse(200, { received: true });
});

async function handleEvent(admin: any, event: any) {
  const type: string = event.event_type;
  const resource = event.resource ?? {};

  switch (type) {
    case "CHECKOUT.ORDER.APPROVED":
      await admin.from("payment_records")
        .update({ payment_status: "approved", internal_status: "approved" })
        .eq("paypal_order_id", resource.id)
        .eq("payment_status", "created");
      return;

    // ── Authorization (temporary hold) lifecycle ───────────────────────
    // Idempotent: applyAuthorization / markAuthorizationExpired no-op when
    // the state has already been recorded by the authorize endpoint.
    case "PAYMENT.AUTHORIZATION.CREATED": {
      const reference = resource.custom_id || resource.invoice_id;
      const record = await findRecord(admin, reference, undefined, resource.supplementary_data);
      if (!record) return;
      await applyAuthorization(admin, record, {
        authorizationId: resource.id,
        status: String(resource.status ?? "CREATED").toLowerCase(),
        amountCents: centsFromPayPalAmount(resource.amount?.value),
        currency: resource.amount?.currency_code ?? "USD",
        expiresAt: resource.expiration_time ?? null,
      }, "webhook");
      return;
    }

    case "PAYMENT.AUTHORIZATION.VOIDED": {
      const reference = resource.custom_id || resource.invoice_id;
      const record = await findRecord(admin, reference, undefined, resource.supplementary_data);
      if (!record || record.payment_status === "completed") return;
      await admin.from("payment_records").update({
        authorization_status: "voided",
        authorization_voided_at: new Date().toISOString(),
        payment_status: "cancelled",
        internal_status: "authorization_voided:provider",
      }).eq("id", record.id).neq("payment_status", "completed");
      return;
    }

    case "PAYMENT.AUTHORIZATION.EXPIRED": {
      const reference = resource.custom_id || resource.invoice_id;
      const record = await findRecord(admin, reference, undefined, resource.supplementary_data);
      if (!record || record.payment_status === "completed") return;
      await markAuthorizationExpired(admin, record);
      return;
    }

    case "PAYMENT.CAPTURE.COMPLETED":
    case "PAYMENT.CAPTURE.PENDING":
    case "PAYMENT.CAPTURE.DENIED": {
      const reference = resource.custom_id || resource.invoice_id;
      const record = await findRecord(admin, reference, resource.id, resource.supplementary_data);
      if (!record) return;

      if (type === "PAYMENT.CAPTURE.DENIED") {
        await admin.from("payment_records").update({
          payment_status: "declined",
          internal_status: "declined",
          paypal_capture_id: resource.id,
        }).eq("id", record.id);
        await holdPayables(admin, record.id, "Payment was denied by PayPal.", "cancelled");
        return;
      }

      await finalizeCapture(admin, record, {
        captureId: resource.id,
        status: resource.status ?? (type.endsWith("COMPLETED") ? "COMPLETED" : "PENDING"),
        amountCents: centsFromPayPalAmount(resource.amount?.value),
        currency: resource.amount?.currency_code ?? "USD",
        payerId: null,
        paymentSource: null,
      }, "webhook");
      return;
    }

    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REVERSED": {
      const captureId = resource?.links
        ?.find((l: any) => l.rel === "up")?.href?.split("/")?.pop() ??
        resource?.id;
      const { data: record } = await admin.from("payment_records")
        .select("*")
        .or(`paypal_capture_id.eq.${captureId},reference.eq.${resource.invoice_id ?? "none"}`)
        .maybeSingle();
      if (!record) return;

      const refundCents = centsFromPayPalAmount(resource.amount?.value);
      const total = Math.min(record.gross_amount_cents, (record.refunded_cents ?? 0) + refundCents);
      const reversed = type.endsWith("REVERSED");

      await appendLedgerEntry(admin, {
        paymentRecordId: record.id,
        entryType: reversed ? "reversal" : "refund",
        amountCents: refundCents,
        currency: record.currency,
        direction: "debit",
        description: reversed ? "PayPal reversal" : "PayPal refund",
        externalReference: resource.id,
        dedupeKey: `${reversed ? "reversal" : "refund"}:${resource.id}`,
      });

      await admin.from("payment_records").update({
        refunded_cents: total,
        payment_status: reversed
          ? "reversed"
          : total >= record.gross_amount_cents
          ? "refunded"
          : "partially_refunded",
        refunded_at: new Date().toISOString(),
      }).eq("id", record.id);

      await applyRefundToPayable(admin, record.id, total, reversed);
      await notifyOrderParties(admin, record, {
        type: "refund_completed",
        buyer: {
          title: reversed ? "Payment reversed" : "Refund completed",
          message: `${(refundCents / 100).toLocaleString("en-US", { style: "currency", currency: record.currency ?? "USD" })} has been returned for order ${record.reference}.`,
        },
        seller: {
          title: reversed ? "A payment was reversed" : "A refund was issued",
          message: `Order ${record.reference} was ${reversed ? "reversed" : "refunded"}. Your payout has been adjusted accordingly.`,
        },
        dedupeKey: `refund:${resource.id}`,
      });
      return;
    }

    case "CUSTOMER.DISPUTE.CREATED":
    case "CUSTOMER.DISPUTE.UPDATED": {
      const captureId = resource?.disputed_transactions?.[0]?.seller_transaction_id;
      if (!captureId) return;
      const { data: record } = await admin.from("payment_records")
        .select("id, reference").eq("paypal_capture_id", captureId).maybeSingle();
      if (!record) return;
      await admin.from("payment_records")
        .update({ dispute_status: resource.status ?? "open" }).eq("id", record.id);
      await holdPayables(admin, record.id, "An active PayPal dispute is open.", "disputed");
      await alertAdmins(admin, "PayPal dispute opened", `Payment ${record.reference} is disputed.`);
      return;
    }

    case "CUSTOMER.DISPUTE.RESOLVED": {
      const captureId = resource?.disputed_transactions?.[0]?.seller_transaction_id;
      if (!captureId) return;
      await admin.from("payment_records")
        .update({ dispute_status: "resolved" }).eq("paypal_capture_id", captureId);
      return;
    }

    // ---------------- subscriptions ----------------
    case "BILLING.SUBSCRIPTION.ACTIVATED":
      await syncSubscription(admin, resource, "active", event.id);
      return;
    case "BILLING.SUBSCRIPTION.CREATED":
      await syncSubscription(admin, resource, "approval_pending", event.id);
      return;
    case "BILLING.SUBSCRIPTION.UPDATED":
      await syncSubscription(admin, resource, null, event.id);
      return;
    case "BILLING.SUBSCRIPTION.SUSPENDED":
      await syncSubscription(admin, resource, "suspended", event.id);
      return;
    case "BILLING.SUBSCRIPTION.CANCELLED":
      await syncSubscription(admin, resource, "cancelled", event.id);
      return;
    case "BILLING.SUBSCRIPTION.EXPIRED":
      await syncSubscription(admin, resource, "expired", event.id);
      return;
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
      await syncSubscription(admin, resource, "payment_failed", event.id);
      return;
    case "PAYMENT.SALE.COMPLETED": {
      if (!resource.billing_agreement_id) return;
      await admin.from("paypal_subscriptions").update({
        last_payment_at: new Date().toISOString(),
        status: "active",
        last_webhook_event_id: event.id,
      }).eq("paypal_subscription_id", resource.billing_agreement_id);
      await mirrorHostSubscription(admin, resource.billing_agreement_id, "active");
      return;
    }
    default:
      safeLog("webhook_unhandled", { type });
  }
}

async function findRecord(admin: any, reference?: string, captureId?: string, supp?: any) {
  if (reference) {
    const { data } = await admin.from("payment_records").select("*")
      .eq("reference", reference).maybeSingle();
    if (data) return data;
  }
  const orderId = supp?.related_ids?.order_id;
  if (orderId) {
    const { data } = await admin.from("payment_records").select("*")
      .eq("paypal_order_id", orderId).maybeSingle();
    if (data) return data;
  }
  if (captureId) {
    const { data } = await admin.from("payment_records").select("*")
      .eq("paypal_capture_id", captureId).maybeSingle();
    if (data) return data;
  }
  return null;
}

async function holdPayables(admin: any, paymentRecordId: string, reason: string, status: string) {
  await admin.from("seller_payables").update({
    status,
    hold_reason: reason,
    dispute_status: status === "disputed" ? "open" : "none",
  }).eq("payment_record_id", paymentRecordId).neq("status", "payout_completed");
}

async function applyRefundToPayable(
  admin: any,
  paymentRecordId: string,
  totalRefundedCents: number,
  reversed: boolean,
) {
  const { data: payable } = await admin.from("seller_payables").select("*")
    .eq("payment_record_id", paymentRecordId).maybeSingle();
  if (!payable) return;

  if (payable.status === "payout_completed") {
    // Seller was already paid — flag for administrator recovery review.
    await admin.from("payout_actions").insert({
      payable_id: payable.id,
      action: "recovery_required",
      from_status: payable.status,
      to_status: payable.status,
      note:
        `Refund/reversal of ${(totalRefundedCents / 100).toFixed(2)} received after payout completed. Manual recovery review required.`,
    });
    await alertAdmins(
      admin,
      "Refund after payout",
      `Payable ${payable.id} needs a recovery review.`,
    );
    return;
  }

  const next = recalculatePayableAfterRefund(payable, totalRefundedCents);
  await admin.from("seller_payables").update({
    refunded_cents: totalRefundedCents,
    net_payout_cents: next.net_payout_cents,
    status: reversed ? "reversed" : next.status,
    hold_reason: next.hold_reason,
  }).eq("id", payable.id);
}

async function alertSubscriptionPayment(
  // deno-lint-ignore no-explicit-any
  admin: any,
  sub: any,
  kind: "subscription_started" | "subscription_renewed",
) {
  if (!sub?.user_id || !sub?.paypal_subscription_id) return;
  const period = kind === "subscription_renewed"
    ? (sub.last_payment_at ?? new Date().toISOString())
    : "initial";
  await alertAdminsOfPaymentOnce(
    admin,
    `${sub.paypal_subscription_id}:${kind}:${period}`,
    sub.user_id,
    kind,
    {
      tier: sub.tier ?? undefined,
      billing_interval: sub.billing_interval ?? undefined,
      amount: formatUsd(sub.recurring_amount_cents),
      provider: "paypal",
      paypal_subscription_id: sub.paypal_subscription_id,
      user_id: sub.user_id,
      next_billing_time: sub.next_billing_time ?? undefined,
    },
  );
}

async function syncSubscription(
  admin: any,
  resource: any,
  status: string | null,
  eventId: string,
) {
  const subId = resource.id;
  if (!subId) return;

  const patch: Record<string, unknown> = { last_webhook_event_id: eventId, last_reconciled_at: new Date().toISOString() };
  if (status) patch.status = status;
  if (resource.billing_info?.next_billing_time) {
    patch.next_billing_time = resource.billing_info.next_billing_time;
  }
  if (status === "cancelled") patch.cancelled_at = new Date().toISOString();
  if (status === "suspended") patch.suspended_at = new Date().toISOString();
  if (status === "expired") patch.expires_at = new Date().toISOString();

  await admin.from("paypal_subscriptions").update(patch).eq("paypal_subscription_id", subId);
  if (status) await mirrorHostSubscription(admin, subId, status);
}

/** Keeps the existing entitlement table (host_subscriptions) authoritative. */
async function mirrorHostSubscription(admin: any, paypalSubId: string, status: string) {
  const { data: sub } = await admin.from("paypal_subscriptions").select("*")
    .eq("paypal_subscription_id", paypalSubId).maybeSingle();
  if (!sub) return;

  const entitlementActive = status === "active";

  const { data: existing } = await admin.from("host_subscriptions")
    .select("id, current_period_start, current_period_end")
    .eq("user_id", sub.user_id).maybeSingle();

  // Grandfathering: a cancelled/expired membership keeps its benefits until the
  // paid-through date already on file. Pure + idempotent, so webhook retries
  // and the reconciler converge on the same row.
  const period = resolveSubscriptionPeriod({
    providerStatus: status,
    nextBillingTime: sub.next_billing_time,
    lastPaymentAt: sub.last_payment_at,
    startTime: sub.start_time,
    existingPeriodEnd: existing?.current_period_end ?? null,
    existingPeriodStart: existing?.current_period_start ?? null,
  });

  const payload = {
    user_id: sub.user_id,
    tier: sub.tier,
    status: period.status,
    payment_provider: "paypal",
    paypal_subscription_id: paypalSubId,
    cancel_at_period_end: period.cancel_at_period_end,
    cancel_at: period.cancel_at,
    current_period_start: period.current_period_start,
    current_period_end: period.current_period_end,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await admin.from("host_subscriptions").update(payload).eq("id", existing.id);
  } else {
    await admin.from("host_subscriptions").insert(payload);
  }

  if (entitlementActive) {
    // One non-rolling Featured Boost credit per paid Vendibook Pro period.
    try {
      await grantMonthlyBoostCredit(admin, {
        userId: sub.user_id,
        tier: sub.tier,
        periodStart: period.current_period_start,
        periodEnd: period.current_period_end,
        subscriptionId: existing?.id ?? null,
        paypalSubscriptionId: paypalSubId,
      });
    } catch (err) {
      console.error("[paypal-webhook] boost credit grant failed", err);
    }

    // First paid period vs renewal, resolved durably (see resolvePaidPeriodKind).
    const paidKind = await resolvePaidPeriodKind(
      admin,
      paypalSubId,
      sub.user_id,
      period.current_period_end,
    );
    if (paidKind !== "duplicate") {
      await alertSubscriptionPayment(
        admin,
        sub,
        paidKind === "renewed" ? "subscription_renewed" : "subscription_started",
      );
      await sendSubscriptionLifecycleEmail(admin, sub, paidKind, {
        accessThrough: period.current_period_end,
        stamp: paidKind === "renewed" ? (period.current_period_end ?? sub.last_payment_at ?? "") : "",
      });
    }
  }

  if (status === "payment_failed") {
    await sendSubscriptionLifecycleEmail(admin, sub, "payment_failed", {
      accessThrough: period.current_period_end,
    });
  }
  if (status === "cancelled" || status === "expired") {
    await sendSubscriptionLifecycleEmail(admin, sub, "cancelled", {
      accessThrough: period.entitled ? period.current_period_end : null,
    });
  }


  await notifySubscriptionState(admin, sub, status, period.entitled ? period.current_period_end : null);
}

/** In-app notification for every subscription lifecycle transition. */
async function notifySubscriptionState(
  admin: any,
  sub: any,
  status: string,
  accessThrough: string | null = null,
) {
  const accessThroughLabel = accessThrough
    ? new Date(accessThrough).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
    : null;
  const link = "/account/subscription";
  const key = `${sub.paypal_subscription_id}:${status}`;
  const plan = sub.tier ? `${sub.tier} plan` : "your plan";

  const copy: Record<string, { type: string; title: string; message: string }> = {
    active: {
      type: sub.last_payment_at ? "subscription_renewed" : "subscription_activated",
      title: sub.last_payment_at ? "Membership renewed" : "Membership active",
      message: sub.last_payment_at
        ? `Your ${plan} renewed successfully. Everything stays unlocked.`
        : `Your ${plan} is now active. All included features are unlocked.`,
    },
    payment_failed: {
      type: "subscription_payment_failed",
      title: "Membership payment failed",
      message:
        `We couldn't collect the latest payment for your ${plan}. Update your PayPal payment method to avoid losing access.`,
    },
    suspended: {
      type: "subscription_suspended",
      title: "Membership paused",
      message: `Your ${plan} is paused, so premium features are unavailable until it resumes.`,
    },
    cancelled: {
      type: "subscription_cancelled",
      title: "Membership cancelled",
      message: accessThroughLabel
        ? `Your ${plan} is cancelled — no future renewal. Your benefits remain active through ${accessThroughLabel}.`
        : `Your ${plan} has been cancelled. You can resubscribe at any time.`,
    },
    expired: {
      type: "subscription_cancelled",
      title: "Membership expired",
      message: `Your ${plan} has expired and premium features are now locked.`,
    },
  };

  const entry = copy[status];
  if (!entry) return;
  await notifyUser(admin, {
    userId: sub.user_id,
    type: entry.type,
    title: entry.title,
    message: entry.message,
    link,
    dedupeKey: key,
  });
}

async function alertAdmins(admin: any, title: string, message: string) {
  try {
    await admin.functions.invoke("send-admin-notification", {
      body: { type: "payments_alert", data: { title, message } },
    });
  } catch {
    safeLog("admin_alert_failed", { title });
  }
}
