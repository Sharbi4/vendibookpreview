/**
 * Vendibook Campus Partner credits. Pure math plus server-side resolution on
 * top of the existing promo_codes / promo_code_uses tables.
 *
 * The credit is Vendibook-funded: it lowers what the buyer pays and is never
 * taken from the host/seller. Platform fees, seller proceeds, tax, deposits,
 * delivery and freight are untouched.
 */
import type { QuoteResult } from "./paypalAccounting.ts";

export type PartnerKind = "rental" | "purchase";

export interface PartnerCodeRow {
  id: string;
  code: string;
  partner_name: string | null;
  program: string;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  rental_percent: number | string | null;
  rental_cap_cents: number | null;
  purchase_credit_cents: number | null;
  purchase_min_cents: number | null;
  rental_uses_per_user: number | null;
  purchase_uses_per_user: number | null;
}

export const PARTNER_CREDIT_LABEL = "Campus Partner credit";

/** Case- and whitespace-insensitive code form. */
export function normalizePartnerCode(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, "").toUpperCase().slice(0, 40);
}

export type PartnerReason =
  | "invalid"
  | "inactive"
  | "not_started"
  | "expired"
  | "below_minimum"
  | "cash_excluded"
  | "limit_reached"
  | "not_eligible";

export function partnerCodeStatus(row: PartnerCodeRow | null, now = new Date()): PartnerReason | null {
  if (!row || row.program !== "campus_partner") return "invalid";
  if (!row.is_active) return "inactive";
  if (row.starts_at && new Date(row.starts_at) > now) return "not_started";
  if (row.expires_at && new Date(row.expires_at) <= now) return "expired";
  return null;
}

/** 10% (configurable) of the eligible rental base, capped. */
export function rentalPartnerCredit(row: PartnerCodeRow, eligibleBaseCents: number): number {
  const base = Math.max(0, Math.round(eligibleBaseCents));
  const pct = Number(row.rental_percent ?? 0);
  if (!(pct > 0) || base <= 0) return 0;
  return Math.max(0, Math.min(Math.floor((base * pct) / 100), Number(row.rental_cap_cents ?? 0), base));
}

/** Flat purchase credit when the eligible sale price meets the minimum. */
export function purchasePartnerCredit(row: PartnerCodeRow, salePriceCents: number): number {
  const price = Math.max(0, Math.round(salePriceCents));
  if (price < Number(row.purchase_min_cents ?? Infinity)) return 0;
  return Math.max(0, Math.min(Number(row.purchase_credit_cents ?? 0), price));
}

/**
 * Applies the credit to an already-taxed quote. Only gross, discount and the
 * itemized lines change; platform fee and seller proceeds stay as quoted.
 * Refuses when the payer total could no longer cover the seller's share.
 */
export function applyPartnerCredit(quote: QuoteResult, creditCents: number): QuoteResult {
  const credit = Math.max(0, Math.round(creditCents));
  if (credit === 0) return quote;
  if (quote.grossCents - credit < quote.sellerProceedsCents + quote.taxCents + quote.depositCents) {
    throw new Error("partner_credit_exceeds_platform_share");
  }
  quote.grossCents -= credit;
  quote.discountCents += credit;
  quote.breakdown.push({ label: PARTNER_CREDIT_LABEL, amountCents: -credit, kind: "credit" });
  return quote;
}

/** Eligible rental base: rental subtotal without renter fee, delivery, deposit, tax. */
export function rentalEligibleBaseCents(quote: QuoteResult, booking: Record<string, any>): number {
  const subtotal = quote.breakdown.find((l) => l.label === "Rental subtotal")?.amountCents ?? quote.taxableBaseCents;
  const delivery = booking.fulfillment_selected === "delivery"
    ? Math.round(Number(booking.delivery_fee_snapshot ?? 0) * 100)
    : 0;
  return Math.max(0, subtotal - delivery);
}

export interface PartnerResolution {
  ok: boolean;
  reason?: PartnerReason;
  message?: string;
  row?: PartnerCodeRow;
  creditCents: number;
  eligibleBaseCents: number;
}

export const PARTNER_MESSAGES: Record<PartnerReason, string> = {
  invalid: "That Campus Partner code isn't active. Check the code with your school or continue without it.",
  inactive: "That Campus Partner code isn't active. Check the code with your school or continue without it.",
  not_started: "That Campus Partner code isn't active. Check the code with your school or continue without it.",
  expired: "This Campus Partner code has expired. Check with your school for the current code.",
  below_minimum: "The Campus Partner purchase credit applies to equipment priced at $5,000 or more. You can continue without it.",
  cash_excluded: "Campus Partner credit applies to online checkout only, not pay-in-person purchases.",
  limit_reached: "You've already used the available Campus Partner benefit for this transaction type.",
  not_eligible: "This order isn't eligible for Campus Partner credit. You can continue without it.",
};

// deno-lint-ignore no-explicit-any
export async function loadPartnerCode(admin: any, raw: unknown): Promise<PartnerCodeRow | null> {
  const code = normalizePartnerCode(raw);
  if (code.length < 3) return null;
  const { data } = await admin.from("promo_codes").select(
    "id, code, partner_name, program, is_active, starts_at, expires_at, rental_percent, rental_cap_cents, purchase_credit_cents, purchase_min_cents, rental_uses_per_user, purchase_uses_per_user",
  ).eq("normalized_code", code).maybeSingle();
  return (data as PartnerCodeRow) ?? null;
}

/** Full server-side check for one user and one transaction. */
export async function resolvePartnerCredit(
  // deno-lint-ignore no-explicit-any
  admin: any,
  opts: { code: unknown; userId: string; kind: PartnerKind; eligibleBaseCents: number; isCash?: boolean },
): Promise<PartnerResolution> {
  const fail = (reason: PartnerReason, row?: PartnerCodeRow): PartnerResolution => ({
    ok: false, reason, message: PARTNER_MESSAGES[reason], row, creditCents: 0, eligibleBaseCents: opts.eligibleBaseCents,
  });
  const row = await loadPartnerCode(admin, opts.code);
  const status = partnerCodeStatus(row);
  if (status) return fail(status, row ?? undefined);
  if (opts.isCash) return fail("cash_excluded", row!);
  const credit = opts.kind === "rental"
    ? rentalPartnerCredit(row!, opts.eligibleBaseCents)
    : purchasePartnerCredit(row!, opts.eligibleBaseCents);
  if (credit <= 0) return fail(opts.kind === "purchase" ? "below_minimum" : "not_eligible", row!);
  const { data: used } = await admin.rpc("partner_code_active_uses", {
    p_code_id: row!.id, p_user: opts.userId, p_kind: opts.kind, p_exclude_record: null,
  });
  const limit = opts.kind === "rental" ? row!.rental_uses_per_user : row!.purchase_uses_per_user;
  if (Number(used ?? 0) >= Number(limit ?? 0)) return fail("limit_reached", row!);
  return { ok: true, row: row!, creditCents: credit, eligibleBaseCents: opts.eligibleBaseCents };
}

/** Reserves the redemption against a payment record. Returns an error reason or null. */
export async function reservePartnerRedemption(
  // deno-lint-ignore no-explicit-any
  admin: any,
  args: { codeId: string; userId: string; kind: PartnerKind; paymentRecordId: string; creditCents: number;
    eligibleBaseCents: number; grossCents: number; platformFeeCents: number },
): Promise<PartnerReason | null> {
  const { data, error } = await admin.rpc("reserve_partner_redemption", {
    p_code_id: args.codeId, p_user: args.userId, p_kind: args.kind, p_payment_record: args.paymentRecordId,
    p_credit_cents: args.creditCents, p_base_cents: args.eligibleBaseCents, p_gross_cents: args.grossCents,
    p_platform_fee_cents: args.platformFeeCents,
  });
  if (error) return "not_eligible";
  if (data === "ok") return null;
  if (data === "limit_reached") return "limit_reached";
  if (data === "expired") return "expired";
  return "inactive";
}

/** fee_breakdown snapshot for the payment record. */
export function partnerSnapshot(res: PartnerResolution, kind: PartnerKind) {
  return {
    promo_code_id: res.row!.id,
    code: res.row!.code,
    partner_name: res.row!.partner_name,
    kind,
    credit_cents: res.creditCents,
    eligible_base_cents: res.eligibleBaseCents,
    funded_by: "vendibook",
  };
}

/** Snapshot stored on payment_records.fee_breakdown.campus_partner, when any. */
export function campusPartnerFromBreakdown(feeBreakdown: unknown): { code: string | null; partner_name: string | null; credit_cents: number } | null {
  // deno-lint-ignore no-explicit-any
  const snap = (feeBreakdown as any)?.campus_partner;
  const credit = Math.round(Number(snap?.credit_cents ?? 0));
  if (!(credit > 0)) return null;
  return { code: snap?.code ?? null, partner_name: snap?.partner_name ?? null, credit_cents: credit };
}

/** Buyer email fields: "Vendibook Campus Partner credit -$XX" plus the school. */
export function campusPartnerEmailFields(feeBreakdown: unknown, currency = "USD"): { campusCredit?: string; campusPartnerName?: string } {
  const snap = campusPartnerFromBreakdown(feeBreakdown);
  if (!snap) return {};
  return {
    campusCredit: new Intl.NumberFormat("en-US", { style: "currency", currency }).format(snap.credit_cents / 100),
    campusPartnerName: snap.partner_name ?? undefined,
  };
}
