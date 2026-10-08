/**
 * Campus Partner codes, server side. Codes live in public.discount_codes
 * (campaign_type = 'campus_partner'); every use is a row in
 * public.discount_code_redemptions, reserved when the shopper applies the
 * code and completed by the payment_records trigger when the processor
 * confirms the capture.
 *
 * Nothing here trusts the browser: the credit is recomputed from the trusted
 * quote and the code is re-validated immediately before every charge.
 */
import type { QuoteResult } from "./paypalAccounting.ts";
import {
  CAMPUS_INACTIVE_MESSAGE,
  type CampusTransactionType,
  computeCampusCredit,
  normalizePartnerCode,
  rentalEligibleSubtotalCents,
} from "./campusPartnerMath.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

const CODE_SHAPE = /^[A-Z0-9-]{3,40}$/;
const cents = (n: unknown) => Math.round(Number(n ?? 0) * 100);
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export class CampusCodeError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export interface CampusCodeRow {
  id: string;
  code: string;
  code_normalized: string;
  campaign_type: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  rental_percent: number | string | null;
  rental_cap_cents: number | null;
  purchase_credit_cents: number | null;
  purchase_min_cents: number | null;
  partner_id: string;
  partner?: { id: string; name: string; slug: string; active: boolean } | null;
}

const CODE_SELECT = "id, code, code_normalized, campaign_type, active, starts_at, ends_at, rental_percent, " +
  "rental_cap_cents, purchase_credit_cents, purchase_min_cents, partner_id, partner:campus_partners(id, name, slug, active)";

export async function findCampusCode(admin: Admin, raw: unknown): Promise<CampusCodeRow | null> {
  const normalized = normalizePartnerCode(raw);
  if (!CODE_SHAPE.test(normalized)) return null;
  const { data } = await admin.from("discount_codes").select(CODE_SELECT)
    .eq("code_normalized", normalized).eq("campaign_type", "campus_partner").maybeSingle();
  return (data as CampusCodeRow) ?? null;
}

export function campusCodeIsLive(code: CampusCodeRow | null, now = Date.now()): code is CampusCodeRow {
  if (!code || code.campaign_type !== "campus_partner" || !code.active) return false;
  if (!code.partner?.active) return false;
  if (code.starts_at && new Date(code.starts_at).getTime() > now) return false;
  if (code.ends_at && new Date(code.ends_at).getTime() <= now) return false;
  return true;
}

/**
 * Only an open online purchase can take the purchase credit: pay-in-person
 * (cash) sales carry no Vendibook commission and are never eligible.
 */
export function saleTakesCampusCredit(tx: Record<string, any>): boolean {
  return ["pending", "payment_failed"].includes(String(tx?.status));
}

/** Only an unpaid, still-open booking can take the rental credit. */
export function bookingTakesCampusCredit(booking: Record<string, any>): boolean {
  return booking?.payment_status !== "paid" &&
    !["declined", "cancelled", "completed"].includes(String(booking?.status));
}

/** What the credit is computed on, from the trusted row + quote. */
export function campusBasis(type: CampusTransactionType, quote: QuoteResult, row: Record<string, any>) {
  if (type === "rental") {
    return {
      eligibleSubtotalCents: rentalEligibleSubtotalCents(quote.taxableBaseCents, cents(row.delivery_fee_snapshot)),
      // Renter fee + host commission: the credit can never exceed it.
      platformFeeCents: quote.platformFeeCents,
      gmvCents: quote.taxableBaseCents,
    };
  }
  return {
    // Equipment price only: never freight, delivery or tax.
    eligibleSubtotalCents: cents(row.amount),
    platformFeeCents: quote.platformFeeCents,
    gmvCents: quote.taxableBaseCents,
  };
}

const LIMIT_MESSAGE: Record<CampusTransactionType, string> = {
  rental: "You've already used this school's Campus Partner rental benefit the maximum number of times this school year. You can continue without it.",
  sale: "You've already used this school's Campus Partner purchase benefit this school year. You can continue without it.",
};

export interface CampusReservation {
  redemptionId: string;
  creditCents: number;
  eligibleSubtotalCents: number;
  codeId: string;
  code: string;
  partnerId: string;
  partnerName: string;
  partnerSlug: string;
}

/** Validates, computes and atomically reserves the credit for one booking / sale. */
export async function reserveCampusCredit(admin: Admin, opts: {
  code: CampusCodeRow | null;
  userId: string;
  type: CampusTransactionType;
  bookingRequestId?: string | null;
  saleTransactionId?: string | null;
  listingId: string | null;
  quote: QuoteResult;
  row: Record<string, any>;
}): Promise<CampusReservation> {
  const code = opts.code;
  if (!campusCodeIsLive(code)) throw new CampusCodeError("partner_code_inactive", CAMPUS_INACTIVE_MESSAGE);
  const basis = campusBasis(opts.type, opts.quote, opts.row);
  const result = computeCampusCredit({ type: opts.type, terms: code, ...basis });
  if (!result.eligible) {
    if (result.reason === "below_minimum") {
      throw new CampusCodeError("partner_code_below_minimum",
        `The Campus Partner purchase credit applies to equipment priced at ${usd(result.minimumCents ?? 0)} or more. You can continue without it.`);
    }
    throw new CampusCodeError("partner_code_not_applicable",
      opts.type === "rental"
        ? "This Campus Partner code doesn't include a rental benefit. You can continue without it."
        : "This Campus Partner code doesn't include a purchase benefit. You can continue without it.");
  }
  const { data, error } = await admin.rpc("campus_reserve_redemption", {
    p_code_id: code.id,
    p_user_id: opts.userId,
    p_transaction_type: opts.type,
    p_booking_request_id: opts.type === "rental" ? opts.bookingRequestId ?? null : null,
    p_sale_transaction_id: opts.type === "sale" ? opts.saleTransactionId ?? null : null,
    p_listing_id: opts.listingId,
    p_eligible_subtotal_cents: result.eligibleSubtotalCents,
    p_discount_cents: result.creditCents,
    p_gmv_cents: basis.gmvCents,
    p_platform_fee_cents: basis.platformFeeCents,
  });
  if (error || !data) {
    const msg = String(error?.message ?? "");
    if (msg.includes("campus_limit_reached")) throw new CampusCodeError("partner_code_limit", LIMIT_MESSAGE[opts.type]);
    if (msg.includes("campus_already_redeemed")) {
      throw new CampusCodeError("partner_code_already_applied", "A Campus Partner credit is already applied to this order.");
    }
    if (msg.includes("campus_code_inactive")) throw new CampusCodeError("partner_code_inactive", CAMPUS_INACTIVE_MESSAGE);
    throw new CampusCodeError("partner_code_unavailable",
      "We couldn't apply the Campus Partner code right now. You can continue without it or try again.");
  }
  return {
    redemptionId: String(data),
    creditCents: result.creditCents,
    eligibleSubtotalCents: result.eligibleSubtotalCents,
    codeId: code.id,
    code: code.code_normalized,
    partnerId: code.partner_id,
    partnerName: code.partner?.name ?? "",
    partnerSlug: code.partner?.slug ?? "",
  };
}

/** The shopper's reserved (not yet paid) redemption on a booking / sale. */
export async function findReservation(admin: Admin, target: { bookingRequestId?: string | null; saleTransactionId?: string | null }) {
  let q = admin.from("discount_code_redemptions").select("id, code_id, user_id, status")
    .eq("campaign_type", "campus_partner").eq("status", "reserved");
  q = target.bookingRequestId ? q.eq("booking_request_id", target.bookingRequestId) : q.eq("sale_transaction_id", target.saleTransactionId);
  const { data } = await q.maybeSingle();
  return data as { id: string; code_id: string; user_id: string; status: string } | null;
}

export async function releaseReservation(admin: Admin, redemptionId: string) {
  await admin.from("discount_code_redemptions")
    .update({ status: "released", released_at: new Date().toISOString() })
    .eq("id", redemptionId).eq("status", "reserved");
}

export type CheckoutCampusCredit =
  | { applied: false }
  | { applied: true; reservation: CampusReservation }
  | { applied: false; error: CampusCodeError };

/**
 * Called by every payment function right before it creates the processor
 * charge / order. Re-validates the reserved code against the current quote.
 * A code that stopped qualifying is released and reported, so the shopper is
 * never charged an amount different from the one they were shown.
 */
export async function campusCreditForCheckout(admin: Admin, opts: {
  userId: string;
  type: CampusTransactionType;
  bookingRequestId?: string | null;
  saleTransactionId?: string | null;
  listingId: string | null;
  quote: QuoteResult;
  row: Record<string, any>;
}): Promise<CheckoutCampusCredit> {
  const reservation = await findReservation(admin, opts);
  if (!reservation) return { applied: false };
  if (reservation.user_id !== opts.userId) {
    await releaseReservation(admin, reservation.id);
    return { applied: false };
  }
  const { data: code } = await admin.from("discount_codes").select(CODE_SELECT).eq("id", reservation.code_id).maybeSingle();
  try {
    const fresh = await reserveCampusCredit(admin, { ...opts, code: (code as CampusCodeRow) ?? null });
    return { applied: true, reservation: fresh };
  } catch (err) {
    await releaseReservation(admin, reservation.id);
    if (err instanceof CampusCodeError) return { applied: false, error: err };
    throw err;
  }
}

/**
 * Checked after the payment record (carrying the redemption id) exists and
 * before the processor is called: a reservation released in between (the
 * shopper applied the code to another checkout) must not be charged.
 */
export async function reservationStillHeld(admin: Admin, redemptionId: string): Promise<boolean> {
  const { data } = await admin.from("discount_code_redemptions").select("status").eq("id", redemptionId).maybeSingle();
  return data?.status === "reserved" || data?.status === "completed";
}

export const CAMPUS_MOVED_MESSAGE =
  "Your Campus Partner code was applied to another checkout, so it was removed here. Review your total before paying.";

/** Stored on payment_records.fee_breakdown.campus_partner (the trigger reads redemption_id). */
export function campusFeeBreakdown(r: CampusReservation) {
  return {
    campaign_type: "campus_partner",
    funded_by: "vendibook",
    redemption_id: r.redemptionId,
    code_id: r.codeId,
    code: r.code,
    partner_id: r.partnerId,
    partner_slug: r.partnerSlug,
    credit_cents: r.creditCents,
    eligible_subtotal_cents: r.eligibleSubtotalCents,
  };
}
