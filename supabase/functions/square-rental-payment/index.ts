/**
 * Rental booking payments through Square (marketplace pattern).
 *
 * Actions (all require the renter's session; the browser sends identifiers
 * and a Square card token only, never an amount):
 *   config  -> which processor this booking pays with, plus the public Web
 *              Payments SDK ids (application id + the HOST's location id)
 *   pay     -> charges the card through Square: on the host's own Square
 *              account (Vendibook's share as app_fee_money) when connected,
 *              otherwise on Vendibook's live Square account (host paid via a
 *              seller payable), then finalises from Square's response
 *   status  -> server-verified payment state; reconciles a pending payment by
 *              asking Square directly
 *
 * A booking is marked paid only by finalizeCapture after Square confirms a
 * COMPLETED payment for the exact quoted amount (here or in
 * square-rental-webhook). Browser success is never trusted.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { hasCurrentLegalAcceptance } from "../_shared/legalVersions.ts";
import { assertRentalCheckoutReady } from "../_shared/rentalCheckoutReady.ts";
import { getListingPurchaseState, LISTING_UNAVAILABLE_MESSAGE } from "../_shared/listingGuard.ts";
import { resolveProStatus } from "../_shared/proEligibility.ts";
import { applyTaxToQuote, quoteBookingRequest, type QuoteResult } from "../_shared/paypalAccounting.ts";
import { parseStateZipFromAddress, quoteSalesTax } from "../_shared/tax.ts";
import { CaptureRejectedError, finalizeCapture } from "../_shared/paypalFinalize.ts";
import { safeLog } from "../_shared/paypal.ts";
import {
  recordSquareContext,
  rentalSquareContext,
  squareApi,
  SquareApiError,
} from "../_shared/squareMarketplace.ts";
import {
  friendlySquareError,
  splitRentalCharge,
  squareIdempotencyKey,
  squarePaymentFacts,
} from "../_shared/squareRentalMath.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Untyped like the other payment functions (no generated DB types in Deno).
// deno-lint-ignore no-explicit-any
type Admin = any;

/** Server-side quote: trusted booking row + Pro fee + sales tax. */
async function rentalQuote(admin: Admin, booking: any) {
  const locked = booking.host_platform_fee !== null && booking.host_platform_fee !== undefined;
  const hostPro = locked ? { isPro: !!booking.pro_fee_applied } : { isPro: (await resolveProStatus(admin, booking.host_id)).isPro };
  const quote: QuoteResult = quoteBookingRequest(booking, booking.listing?.title ?? "Listing", hostPro);
  const loc = parseStateZipFromAddress(booking.listing?.address);
  const tax = await quoteSalesTax({
    amountCents: quote.taxableBaseCents,
    destination: { state: booking.listing?.state ?? null, zip: loc.zip ?? null, city: booking.listing?.city ?? null },
    kind: "rental",
  });
  applyTaxToQuote(quote, tax);
  return { quote, tax };
}

async function loadBooking(admin: Admin, bookingId: string) {
  const { data } = await admin.from("booking_requests")
    .select("*, listing:listings(title, city, state, address, host_id)")
    .eq("id", bookingId).maybeSingle();
  return data as any;
}

/** Instant Book on a verified host, or a host-approved request. */
async function paymentAllowed(admin: Admin, booking: any) {
  if (booking.status === "declined" || booking.status === "cancelled" || booking.status === "completed") return false;
  if (booking.status === "approved") return true;
  if (!booking.is_instant_book) return false;
  const { data: verified } = await admin.rpc("is_seller_identity_verified", { _user_id: booking.host_id });
  return verified === true;
}

async function releaseLock(admin: Admin, record: any) {
  await admin.from("booking_requests").update({ payment_status: "unpaid", payment_lock_record_id: null })
    .eq("id", record.booking_request_id).eq("payment_lock_record_id", record.id).neq("payment_status", "paid");
}

/** Asks Square for the payment and finalises it (status checks). */
async function reconcileSquareRecord(admin: Admin, record: any, source: "capture_endpoint" | "webhook") {
  if (!record?.square_payment_id) return record;
  const ctx = await recordSquareContext(admin, record);
  if (!ctx) return record;
  const { payment } = await squareApi(`/v2/payments/${encodeURIComponent(record.square_payment_id)}`,
    { token: await ctx.token(), base: ctx.base });
  if (!payment || payment.location_id !== record.square_location_id) return record;
  const updated = await finalizeCapture(admin, record, squarePaymentFacts(payment), source);
  if (["failed", "cancelled", "declined"].includes(String(updated?.payment_status))) await releaseLock(admin, record);
  return updated;
}

function bookingView(booking: any, record: any) {
  return {
    booking_id: booking.id,
    booking_status: booking.status,
    payment_status: booking.payment_status,
    payment_provider: booking.payment_provider ?? null,
    reference: record?.reference ?? null,
    record_status: record?.payment_status ?? null,
    receipt_url: record?.square_receipt_url ?? null,
    amount_cents: record?.gross_amount_cents ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "method_not_allowed", "POST required.");

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } });
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "unauthenticated", "Please sign in to continue.");
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Your session expired. Please sign in again.");

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const bookingId = String(body?.booking_id ?? "");
    if (!UUID_RE.test(bookingId)) return jsonError(400, "missing_fields", "Missing booking.");

    const booking = await loadBooking(admin, bookingId);
    if (!booking) return jsonError(404, "not_found", "We couldn't find that booking.");
    const isRenter = booking.shopper_id === user.id;
    const isHost = booking.host_id === user.id;
    if (!isRenter && !(action === "status" && isHost)) {
      return jsonError(403, "forbidden", "You aren't the renter on this booking.");
    }

    // ------------------------------------------------------------ status
    if (action === "status") {
      let { data: record } = await admin.from("payment_records").select("*")
        .eq("booking_request_id", booking.id).eq("provider", "square")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (record && record.square_payment_id && ["created", "pending", "approved", "authorized"].includes(record.payment_status)) {
        try {
          record = await reconcileSquareRecord(admin, record, "capture_endpoint");
        } catch (err) {
          safeLog("square_status_reconcile_failed", { reference: record.reference, code: (err as Error).message });
        }
      }
      const fresh = await loadBooking(admin, booking.id);
      return jsonResponse(200, bookingView(fresh ?? booking, record));
    }

    // ------------------------------------------------------------ config
    if (action === "config") {
      const ctx = await rentalSquareContext(admin, booking.host_id);
      if (!ctx) return jsonResponse(200, { provider: "unavailable", reason: "square_not_configured" });
      const { quote } = await rentalQuote(admin, booking);
      return jsonResponse(200, {
        provider: "square",
        environment: ctx.environment,
        application_id: ctx.applicationId,
        location_id: ctx.locationId,
        host_business_name: ctx.mode === "host" ? ctx.businessName : null,
        amount_cents: quote.grossCents,
        currency: quote.currency,
        breakdown: quote.breakdown,
        tax_cents: quote.taxCents,
      });
    }

    if (action !== "pay") return jsonError(400, "invalid_action", "Unknown action.");

    // ------------------------------------------------------------ pay
    const sourceId = String(body?.source_id ?? "");
    const attemptKey = String(body?.idempotency_key ?? "");
    const verificationToken = body?.verification_token ? String(body.verification_token) : null;
    if (!sourceId || sourceId.length > 512) return jsonError(400, "missing_fields", "Enter your card details.");
    if (!UUID_RE.test(attemptKey)) return jsonError(400, "missing_fields", "Refresh the page and try again.");

    // Legal gate, enforced server-side.
    for (const slug of ["terms-of-service", "payments-terms"] as const) {
      if (!(await hasCurrentLegalAcceptance(admin, user.id, slug))) {
        return jsonError(403, "legal_acceptance_required",
          "Please agree to the Vendibook Terms of Service, Payments Terms, and Privacy Policy before paying.");
      }
    }
    if (booking.host_id === user.id) return jsonError(403, "self_transaction", "You can't book your own listing.");
    if (booking.payment_status === "paid") return jsonError(409, "already_paid", "This booking is already paid.");
    try { await assertRentalCheckoutReady(admin, booking, authHeader); }
    catch (error) { return jsonError(409, "rental_requirements", (error as Error).message); }
    if (!(await paymentAllowed(admin, booking))) {
      return jsonError(409, "payment_not_ready", "The host needs to approve this request before payment.");
    }

    const ctx = await rentalSquareContext(admin, booking.host_id);
    if (!ctx) {
      return jsonError(409, "square_unavailable", "Card payment is temporarily unavailable. Nothing was charged. Please try again shortly.");
    }

    // Revalidate the listing and the dates immediately before charging.
    const listingState = await getListingPurchaseState(admin, booking.listing_id);
    if (!listingState.purchasable) return jsonError(409, "listing_unavailable", LISTING_UNAVAILABLE_MESSAGE);
    const { data: availability, error: availabilityError } = await admin.rpc("check_booking_availability", {
      p_listing_id: booking.listing_id,
      p_start_date: booking.start_date,
      p_end_date: booking.end_date,
      p_is_hourly_booking: !!booking.is_hourly_booking,
      p_hourly_slots: booking.hourly_slots ?? null,
      p_slot_number: booking.slot_number ?? null,
      p_exclude_booking_id: booking.id,
    });
    if (availabilityError || (availability as any)?.available === false) {
      return jsonError(409, "dates_unavailable",
        "These dates were just booked or blocked by the host. Nothing was charged. Pick new dates to continue.");
    }

    const { data: fingerprint, error: fingerprintError } = await admin.rpc("rental_checkout_fingerprint", { b: booking });
    if (fingerprintError || !fingerprint) return jsonError(409, "quote_unavailable", "We could not verify this booking. Please try again.");

    const { quote, tax } = await rentalQuote(admin, booking);
    // Host account: Vendibook's share rides as app_fee_money. Vendibook's own
    // account: the whole charge lands with Vendibook and the host's share is
    // a seller payable, so there is no app fee.
    let appFeeCents = 0;
    if (ctx.mode === "host") {
      try {
        appFeeCents = splitRentalCharge({ grossCents: quote.grossCents, sellerProceedsCents: quote.sellerProceedsCents }).appFeeCents;
      } catch (err) {
        safeLog("square_split_rejected", { booking: booking.id, reason: (err as Error).message });
        return jsonError(409, "payment_unavailable", "Card payment isn't available for this booking. Please contact support.");
      }
    }
    if (!Number.isSafeInteger(quote.grossCents) || quote.grossCents <= 0) {
      return jsonError(409, "invalid_amount", "This booking has no amount due.");
    }

    // Commitment point: lock the host fee and the tax snapshot on the booking.
    if (booking.host_platform_fee === null || booking.host_platform_fee === undefined) {
      await admin.from("booking_requests").update({
        host_platform_fee: (quote.hostFeeCents ?? 0) / 100,
        host_fee_rate_pct: quote.feeRatePct ?? null,
        host_pro_discount: (quote.proDiscountCents ?? 0) / 100,
        pro_fee_applied: !!quote.proFeeApplied,
        fee_locked_at: new Date().toISOString(),
      }).eq("id", booking.id).is("host_platform_fee", null);
    }
    await admin.from("booking_requests").update({
      tax_amount: tax.taxCents / 100, tax_rate_pct: tax.ratePct, tax_source: tax.source, tax_jurisdiction: tax.state,
    }).eq("id", booking.id).neq("payment_status", "paid");

    // One payment record per checkout attempt. A retry of the same attempt
    // (double click, timeout, refresh) reuses it and Square's idempotency key.
    const recordKey = `sq:${booking.id}:${attemptKey}`;
    let { data: record } = await admin.from("payment_records").select("*").eq("idempotency_key", recordKey).maybeSingle();
    if (record?.payment_status === "completed") {
      return jsonResponse(200, { status: "paid", ...bookingView(await loadBooking(admin, booking.id), record) });
    }
    if (record && record.gross_amount_cents !== quote.grossCents) {
      return jsonError(409, "quote_changed", "The total changed. Refresh to see the latest amount before paying.");
    }
    if (!record) {
      const { data: inserted, error: insertError } = await admin.from("payment_records").insert({
        reference: quote.reference,
        provider: "square",
        transaction_type: quote.transactionType,
        booking_request_id: booking.id,
        listing_id: quote.listingId,
        buyer_id: user.id,
        seller_id: quote.sellerId,
        buyer_email: user.email ?? null,
        currency: quote.currency,
        gross_amount_cents: quote.grossCents,
        platform_fee_cents: quote.platformFeeCents,
        fee_rate_pct: quote.feeRatePct ?? null,
        pro_discount_cents: quote.proDiscountCents ?? 0,
        pro_fee_applied: !!quote.proFeeApplied,
        tax_cents: quote.taxCents,
        deposit_cents: quote.depositCents,
        discount_cents: quote.discountCents,
        seller_proceeds_cents: quote.sellerProceedsCents,
        app_fee_cents: ctx.mode === "host" ? appFeeCents : null,
        square_location_id: ctx.locationId,
        square_merchant_id: ctx.merchantId,
        payment_status: "created",
        internal_status: "awaiting_payment",
        payment_strategy: "capture_now",
        balance_due_cents: 0,
        idempotency_key: recordKey,
        fee_breakdown: {
          checkout_source: "square_web_payments",
          rental_fingerprint: fingerprint,
          lines: quote.breakdown,
          release_at: quote.releaseAt,
          ...(ctx.mode === "host" ? { app_fee_cents: appFeeCents } : {}),
        },
        metadata: ctx.mode === "host"
          ? { square_mode: "host", multiparty: { routed: true, provider: "square", merchant_id: ctx.merchantId } }
          : { square_mode: "platform" },
      }).select().single();
      if (insertError || !inserted) {
        if ((insertError as any)?.code === "23505") {
          ({ data: record } = await admin.from("payment_records").select("*").eq("idempotency_key", recordKey).maybeSingle());
        }
        if (!record) {
          safeLog("square_record_insert_failed", { booking: booking.id, code: (insertError as any)?.code });
          return jsonError(500, "record_failed", "We couldn't start this payment. Nothing was charged. Please try again.");
        }
      } else {
        record = inserted;
      }
    }

    // Serialize: only one payment per booking can be in flight.
    const { error: claimError } = await admin.rpc("claim_rental_capture", { p_record: record.id });
    if (claimError) {
      await admin.from("payment_records").update({ payment_status: "cancelled", internal_status: "claim_rejected",
        last_error: { reason: claimError.message } }).eq("id", record.id).eq("payment_status", "created");
      return jsonError(409, "payment_in_progress", claimError.message);
    }

    let payment: any;
    try {
      ({ payment } = await squareApi("/v2/payments", {
        token: await ctx.token(),
        base: ctx.base,
        body: {
          source_id: sourceId,
          idempotency_key: squareIdempotencyKey("vb", record.reference, attemptKey.slice(0, 8)),
          amount_money: { amount: quote.grossCents, currency: quote.currency },
          ...(ctx.mode === "host" ? { app_fee_money: { amount: appFeeCents, currency: quote.currency } } : {}),
          autocomplete: true,
          location_id: ctx.locationId,
          reference_id: String(record.reference).slice(0, 40),
          note: `Vendibook rental ${record.reference}`.slice(0, 500),
          ...(user.email ? { buyer_email_address: user.email } : {}),
          ...(verificationToken ? { verification_token: verificationToken } : {}),
        },
      }));
    } catch (err) {
      const definitive = err instanceof SquareApiError && err.status >= 400 && err.status < 500 && err.status !== 429;
      const code = err instanceof SquareApiError ? err.code : "SQUARE_UNAVAILABLE";
      safeLog("square_payment_error", { reference: record.reference, code, definitive });
      if (definitive) {
        await admin.from("payment_records").update({
          payment_status: code === "CARD_DECLINED" || code === "GENERIC_DECLINE" || code === "INSUFFICIENT_FUNDS" ? "declined" : "failed",
          internal_status: "payment_failed", last_error: { reason: "square_error", code },
        }).eq("id", record.id).neq("payment_status", "completed");
        await releaseLock(admin, record);
        return jsonError(402, "payment_failed", friendlySquareError(code), { square_code: code });
      }
      // Ambiguous (timeout / 5xx): keep the lock; the webhook or a status
      // check settles it. Retrying with the same attempt key is safe.
      await admin.from("payment_records").update({ payment_status: "pending", internal_status: "verifying",
        last_error: { reason: "square_ambiguous", code } }).eq("id", record.id).eq("payment_status", "created");
      await admin.from("booking_requests").update({ payment_status: "pending" })
        .eq("id", booking.id).eq("payment_lock_record_id", record.id).neq("payment_status", "paid");
      return jsonResponse(202, { status: "verifying", ...bookingView(booking, record) });
    }

    // Verify Square's answer before trusting it.
    if (payment.location_id !== ctx.locationId ||
        Number(payment.app_fee_money?.amount ?? 0) !== appFeeCents) {
      safeLog("square_payment_mismatch", { reference: record.reference });
      await admin.from("payment_records").update({ square_payment_id: payment.id, internal_status: "needs_review",
        last_error: { reason: "square_payment_mismatch" } }).eq("id", record.id);
      return jsonError(409, "needs_review", `We received a payment response we couldn't verify. Our team has been alerted. Reference ${record.reference}.`);
    }
    await admin.from("payment_records").update({ square_payment_id: payment.id }).eq("id", record.id).is("square_payment_id", null);
    record.square_payment_id = payment.id;

    let finalRecord = record;
    try {
      finalRecord = await finalizeCapture(admin, record, squarePaymentFacts(payment), "capture_endpoint");
    } catch (err) {
      if (err instanceof CaptureRejectedError) {
        return jsonError(409, err.reason, err.message, { reference: record.reference });
      }
      throw err;
    }
    if (["failed", "cancelled", "declined"].includes(String(finalRecord?.payment_status))) {
      await releaseLock(admin, record);
      return jsonError(402, "payment_failed", friendlySquareError(null));
    }
    const fresh = await loadBooking(admin, booking.id);
    return jsonResponse(200, {
      status: finalRecord?.payment_status === "completed" ? "paid" : "verifying",
      ...bookingView(fresh ?? booking, finalRecord),
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
