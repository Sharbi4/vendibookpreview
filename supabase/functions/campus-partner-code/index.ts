/**
 * Checks a Campus Partner code for the signed-in buyer before payment.
 * Display only: paypal-create-order and square-rental-payment re-validate and
 * reserve the redemption immediately before any order or charge is created.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, jsonError, jsonResponse, unknownErrorResponse } from "../_shared/jsonError.ts";
import { checkRateLimit, clientIp } from "../_shared/rateLimit.ts";
import { quoteBookingRequest } from "../_shared/paypalAccounting.ts";
import {
  loadPartnerCode,
  normalizePartnerCode,
  PARTNER_MESSAGES,
  type PartnerCodeRow,
  partnerCodeStatus,
  type PartnerResolution,
  rentalEligibleBaseCents,
  rentalPartnerCredit,
  resolvePartnerCredit,
} from "../_shared/campusPartner.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ok = (row: PartnerCodeRow, extra: Record<string, unknown> = {}) =>
  jsonResponse(200, { valid: true, promo_code_id: row.id, code: row.code, partner_name: row.partner_name, ...extra });

const fromResolution = (res: PartnerResolution) =>
  res.ok
    ? ok(res.row!, { credit_cents: res.creditCents })
    : jsonResponse(200, {
      valid: false, reason: res.reason, message: res.message,
      promo_code_id: res.row?.id ?? null, partner_name: res.row?.partner_name ?? null,
    });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "method_not_allowed", "POST required.");
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } });
    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return jsonError(401, "unauthenticated", "Please sign in to use a Campus Partner code.");

    const body = await req.json().catch(() => ({}));
    const code = normalizePartnerCode(body?.code);
    const kind = body?.kind === "purchase" ? "purchase" : body?.kind === "rental" ? "rental" : null;
    const listingId = String(body?.listing_id ?? "");
    if (!code || !kind || !UUID_RE.test(listingId)) return jsonError(400, "missing_fields", "Enter a code.");

    // Codes are short and guessable, so attempts are throttled per user and per IP.
    const allowed = await checkRateLimit("campus_code_user", user.id, 20, 60) &&
      await checkRateLimit("campus_code_ip", clientIp(req), 40, 60);
    if (!allowed) {
      return jsonResponse(200, {
        valid: false, reason: "rate_limited",
        message: "Too many code attempts. Wait a little and try again, or continue without a code.",
      });
    }

    const { data: listing } = await admin.from("listings").select("id, host_id, price_sale").eq("id", listingId).maybeSingle();
    if (!listing) return jsonError(404, "not_found", "Listing not found.");
    if (listing.host_id === user.id) return jsonResponse(200, { valid: false, reason: "not_eligible", message: PARTNER_MESSAGES.not_eligible });

    if (kind === "purchase") {
      // Same base and cash rule as paypal-create-order: the buyer's own sale row when known.
      let priceCents = Math.round(Number(listing.price_sale ?? 0) * 100);
      let isCash = body?.payment_method === "cash";
      const saleId = String(body?.sale_transaction_id ?? "");
      if (UUID_RE.test(saleId)) {
        const { data: tx } = await admin.from("sale_transactions")
          .select("*").eq("id", saleId).maybeSingle();
        if (tx && tx.buyer_id === user.id && tx.listing_id === listingId) {
          priceCents = Math.round(Number(tx.amount ?? 0) * 100);
          isCash ||= String(tx.status) === "pending_cash" || tx.is_cash_sale === true ||
            /cash|in_person/i.test(String(tx.payment_method ?? ""));
        }
      }
      return fromResolution(await resolvePartnerCredit(admin, { code, userId: user.id, kind, eligibleBaseCents: priceCents, isCash }));
    }

    // Rental with a booking: the exact credit from the server booking quote.
    const bookingId = String(body?.booking_id ?? "");
    if (UUID_RE.test(bookingId)) {
      const { data: booking } = await admin.from("booking_requests").select("*").eq("id", bookingId).maybeSingle();
      if (booking && booking.shopper_id === user.id && booking.listing_id === listingId) {
        const quote = quoteBookingRequest(booking, "Listing", { isPro: !!booking.pro_fee_applied });
        return fromResolution(await resolvePartnerCredit(admin, {
          code, userId: user.id, kind: "rental", eligibleBaseCents: rentalEligibleBaseCents(quote, booking),
        }));
      }
    }

    // Rental before a booking exists: check the code and remaining uses only.
    const row = await loadPartnerCode(admin, code);
    const status = partnerCodeStatus(row);
    if (status) {
      return jsonResponse(200, { valid: false, reason: status, message: PARTNER_MESSAGES[status], promo_code_id: row?.id ?? null });
    }
    const { data: used } = await admin.rpc("partner_code_active_uses", {
      p_code_id: row!.id, p_user: user.id, p_kind: "rental", p_exclude_record: null,
    });
    if (Number(used ?? 0) >= Number(row!.rental_uses_per_user ?? 0)) {
      return jsonResponse(200, {
        valid: false, reason: "limit_reached", message: PARTNER_MESSAGES.limit_reached,
        promo_code_id: row!.id, partner_name: row!.partner_name,
      });
    }
    const subtotal = Number(body?.rental_subtotal_cents);
    return ok(row!, {
      rental_percent: Number(row!.rental_percent),
      rental_cap_cents: row!.rental_cap_cents,
      ...(Number.isFinite(subtotal) && subtotal > 0 ? { estimated_credit_cents: rentalPartnerCredit(row!, subtotal) } : {}),
    });
  } catch (err) {
    return unknownErrorResponse(err);
  }
});
