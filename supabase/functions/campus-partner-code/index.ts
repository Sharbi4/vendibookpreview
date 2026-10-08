/**
 * Campus Partner code at checkout (rental bookings and online purchases).
 *
 * Actions (all require the shopper's session; the browser sends a code and
 * the booking / sale id, never an amount):
 *   apply  -> validates the code, reserves the shopper's benefit for this
 *             booking / sale and returns the credit and the amount due
 *   status -> the code currently applied to this booking / sale, if any
 *   remove -> releases the reservation; the full total applies again
 *
 * The payment functions (square-rental-payment, paypal-create-order)
 * re-validate the reservation immediately before charging, so the amount
 * returned here is the amount the processor is asked for.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { checkRateLimit, clientIp } from "../_shared/rateLimit.ts";
import { rentalQuoteWithTax, saleQuoteWithTax } from "../_shared/checkoutQuote.ts";
import { applyCampusCredit, CAMPUS_INACTIVE_MESSAGE } from "../_shared/campusPartnerMath.ts";
import {
  bookingTakesCampusCredit,
  type CampusReservation,
  CampusCodeError,
  campusCreditForCheckout,
  findCampusCode,
  findReservation,
  releaseReservation,
  reserveCampusCredit,
  saleTakesCampusCredit,
} from "../_shared/campusPartner.ts";
import type { QuoteResult } from "../_shared/paypalAccounting.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// deno-lint-ignore no-explicit-any
type Admin = any;

type Target =
  | { type: "rental"; row: any; quote: QuoteResult; bookingRequestId: string; saleTransactionId: null }
  | { type: "sale"; row: any; quote: QuoteResult; bookingRequestId: null; saleTransactionId: string };

/** Loads the booking / sale the shopper is paying for, with its trusted quote. */
async function loadTarget(admin: Admin, userId: string, kind: string, id: string): Promise<Target | Response> {
  if (kind === "booking") {
    const { data: booking } = await admin.from("booking_requests")
      .select("*, listing:listings(title, city, state, address, host_id)").eq("id", id).maybeSingle();
    if (!booking) return jsonError(404, "not_found", "We couldn't find that booking.");
    if (booking.shopper_id !== userId) return jsonError(403, "forbidden", "You aren't the renter on this booking.");
    if (!bookingTakesCampusCredit(booking)) {
      return jsonError(409, "not_payable", "This booking can't take a code now.");
    }
    const { quote } = await rentalQuoteWithTax(admin, booking);
    return { type: "rental", row: booking, quote, bookingRequestId: booking.id, saleTransactionId: null };
  }
  if (kind === "sale") {
    const { data: tx } = await admin.from("sale_transactions")
      .select("*, listing:listings(title, city, state, address, freight_payer, vendibook_freight_enabled)")
      .eq("id", id).maybeSingle();
    if (!tx) return jsonError(404, "not_found", "We couldn't find that purchase.");
    if (tx.buyer_id !== userId) return jsonError(403, "forbidden", "You aren't the buyer on this purchase.");
    // Online purchases only: pay-in-person (cash) sales carry no Vendibook
    // commission and never receive the credit.
    if (!saleTakesCampusCredit(tx)) {
      return jsonError(409, "not_payable", "Campus Partner credit applies to online purchases only.");
    }
    const { quote } = await saleQuoteWithTax(tx);
    return { type: "sale", row: tx, quote, bookingRequestId: null, saleTransactionId: tx.id };
  }
  return jsonError(400, "invalid_kind", "Unknown checkout.");
}

function view(target: Target, reservation: CampusReservation | null) {
  const quote = { ...target.quote, breakdown: [...target.quote.breakdown] };
  if (reservation) applyCampusCredit(quote, reservation.creditCents);
  return {
    ok: true,
    applied: !!reservation,
    transaction_type: target.type,
    code: reservation?.code ?? null,
    partner_name: reservation?.partnerName ?? null,
    partner_slug: reservation?.partnerSlug ?? null,
    code_id: reservation?.codeId ?? null,
    credit_cents: reservation?.creditCents ?? 0,
    amount_due_cents: quote.grossCents,
    currency: quote.currency,
    tax_cents: quote.taxCents,
    breakdown: quote.breakdown,
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
    const kind = String(body?.kind ?? "");
    const id = String(body?.id ?? "");
    if (!UUID_RE.test(id)) return jsonError(400, "missing_fields", "Missing checkout.");

    const target = await loadTarget(admin, user.id, kind, id);
    if (target instanceof Response) return target;
    const scope = { bookingRequestId: target.bookingRequestId, saleTransactionId: target.saleTransactionId };

    if (action === "status") {
      const current = await campusCreditForCheckout(admin, {
        userId: user.id, type: target.type, ...scope, listingId: target.row.listing_id ?? null, quote: target.quote, row: target.row,
      });
      if (current.applied) return jsonResponse(200, view(target, current.reservation));
      const res = view(target, null);
      return jsonResponse(200, "error" in current
        ? { ...res, notice_code: current.error.code, notice: current.error.message }
        : res);
    }

    if (action === "remove") {
      const existing = await findReservation(admin, scope);
      if (existing && existing.user_id === user.id) await releaseReservation(admin, existing.id);
      return jsonResponse(200, view(target, null));
    }

    if (action !== "apply") return jsonError(400, "invalid_action", "Unknown action.");

    // Codes are short; slow down guessing.
    const allowed = await checkRateLimit("campus_code_user", user.id, 20, 60) &&
      await checkRateLimit("campus_code_ip", clientIp(req), 40, 60);
    if (!allowed) {
      return jsonResponse(200, { ...view(target, null), ok: false, code_error: "rate_limited",
        message: "Too many code attempts. Wait a little and try again, or continue without a code." });
    }

    const code = await findCampusCode(admin, body?.code);
    try {
      const reservation = await reserveCampusCredit(admin, {
        code, userId: user.id, type: target.type, ...scope,
        listingId: target.row.listing_id ?? null, quote: target.quote, row: target.row,
      });
      return jsonResponse(200, view(target, reservation));
    } catch (err) {
      if (!(err instanceof CampusCodeError)) throw err;
      // A bad code never disturbs a code that is already applied.
      const current = await campusCreditForCheckout(admin, {
        userId: user.id, type: target.type, ...scope, listingId: target.row.listing_id ?? null, quote: target.quote, row: target.row,
      });
      return jsonResponse(200, {
        ...view(target, current.applied ? current.reservation : null),
        ok: false,
        code_error: err.code,
        message: err.message || CAMPUS_INACTIVE_MESSAGE,
      });
    }
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
