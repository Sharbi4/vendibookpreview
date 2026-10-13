/**
 * Sales-tax engine for Vendibook checkouts (Square and PayPal).
 *
 * Model: marketplace facilitator. Vendibook COLLECTS estimated sales tax from
 * the buyer on top of the merchandise/rental/service amount and REMITS it
 * itself. Tax is therefore never part of the seller/host payout and never
 * part of the commission base — it rides on top of gross and is booked to a
 * `tax_collected` ledger entry at capture time.
 *
 * Rate source (owner decision 2026-10-13): each state's statewide rate PLUS
 * its population-weighted average local (city/county) rate, from the Tax
 * Foundation's "State and Local Sales Tax Rates, Midyear 2026" (rates as of
 * July 1, 2026). This is closer to what is actually owed than the statewide
 * base alone; it is still an average, not an address-exact rate. No external
 * tax API is called, so checkout never depends on a third-party service.
 *
 * Digital items (Pro subscriptions, listing boosts and other Vendibook
 * add-ons) are taxed only in states that tax software/digital services
 * (DIGITAL_TAX_RULES), owner decision 2026-10-13.
 *
 * Exemptions: a buyer with an active exemption certificate for the
 * destination state pays no tax (source "exempt"). Lookup lives in
 * taxExemption.ts so this module stays dependency-free.
 *
 * Historical receipts may carry `source: "taxjar"` from the retired TaxJar
 * integration; that value is kept for backward compatibility only.
 */

/** "digital" = Vendibook subscriptions, boosts and other online add-ons. */
export type TaxKind = "sale" | "rental" | "service" | "product" | "digital";

export interface TaxDestination {
  state?: string | null;
  zip?: string | null;
  city?: string | null;
}

export type TaxSource =
  | "taxjar"
  | "state_table"
  | "no_tax_state"
  | "no_destination"
  | "not_taxable"
  | "exempt";

export interface TaxQuote {
  taxCents: number;
  /** Effective rate used, e.g. 8.54 for 8.54%. */
  ratePct: number;
  /** Normalized 2-letter state the quote is based on, if known. */
  state: string | null;
  source: TaxSource;
  taxableAmountCents: number;
  /** Short human label for breakdown lines, e.g. "Estimated tax (AZ)". */
  label: string;
  /** Active exemption certificate applied to this quote, if any. */
  exemptionId?: string | null;
}

export const TAX_RATES_AS_OF = "2026-07-01";
export const TAX_RATES_SOURCE = "Tax Foundation, State and Local Sales Tax Rates, Midyear 2026";

/**
 * Combined state + average local sales-tax rate by state, in percent
 * (Tax Foundation midyear 2026). States with no general sales tax are 0,
 * except Alaska, where only local taxes apply.
 */
export const STATE_SALES_TAX_RATES: Record<string, number> = {
  AL: 9.46, AK: 1.82, AZ: 8.54, AR: 9.48, CA: 9.03, CO: 7.89, CT: 6.35, DE: 0,
  DC: 6.0, FL: 6.98, GA: 7.56, HI: 4.5, ID: 6.03, IL: 8.98, IN: 7.0, IA: 6.94,
  KS: 8.71, KY: 6.0, LA: 10.13, ME: 5.5, MD: 6.0, MA: 6.25, MI: 6.0, MN: 8.14,
  MS: 7.06, MO: 8.44, MT: 0, NE: 6.98, NV: 8.24, NH: 0, NJ: 6.6, NM: 7.68,
  NY: 8.54, NC: 7.1, ND: 7.09, OH: 7.29, OK: 9.06, OR: 0, PA: 6.34, RI: 7.0,
  SC: 7.49, SD: 6.11, TN: 9.61, TX: 8.2, UT: 7.42, VT: 6.43, VA: 5.77,
  WA: 9.57, WV: 6.6, WI: 5.72, WY: 5.39,
};

/**
 * States that tax software/digital services (Numeral, "Sales Tax and SaaS:
 * State By State Breakdown", 2026). `share` taxes only part of the price
 * (Texas taxes 80% of data-processing services); `ratePct` replaces the
 * general rate (Connecticut taxes business-use software at 1%); `from`
 * delays a rule until it takes effect (California, Jan 1 2027). States that
 * tax these items only locally (AK, CO, IL) or only for consumers (IA, MD)
 * are left out because Vendibook members buy them for business use.
 */
export const DIGITAL_TAX_RULES: Record<string, { share?: number; ratePct?: number; from?: string }> = {
  AZ: {}, CT: { ratePct: 1 }, DC: {}, HI: {}, KY: {}, LA: {}, MA: {}, MS: {},
  NM: {}, NY: {}, OH: {}, PA: {}, RI: {}, SC: {}, SD: {}, TN: {},
  TX: { share: 0.8 }, UT: {}, VT: {}, WA: {}, WV: {},
  CA: { from: "2027-01-01" },
};

const US_STATE_CODES = new Set(Object.keys(STATE_SALES_TAX_RATES));

export function normalizeUsState(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (US_STATE_CODES.has(code)) return code;
  // Accept full state names for the common cases.
  const names: Record<string, string> = {
    ALABAMA: "AL", ALASKA: "AK", ARIZONA: "AZ", ARKANSAS: "AR", CALIFORNIA: "CA",
    COLORADO: "CO", CONNECTICUT: "CT", DELAWARE: "DE", FLORIDA: "FL", GEORGIA: "GA",
    HAWAII: "HI", IDAHO: "ID", ILLINOIS: "IL", INDIANA: "IN", IOWA: "IA", KANSAS: "KS",
    KENTUCKY: "KY", LOUISIANA: "LA", MAINE: "ME", MARYLAND: "MD", MASSACHUSETTS: "MA",
    MICHIGAN: "MI", MINNESOTA: "MN", MISSISSIPPI: "MS", MISSOURI: "MO", MONTANA: "MT",
    NEBRASKA: "NE", NEVADA: "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ",
    "NEW MEXICO": "NM", "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND",
    OHIO: "OH", OKLAHOMA: "OK", OREGON: "OR", PENNSYLVANIA: "PA", "RHODE ISLAND": "RI",
    "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD", TENNESSEE: "TN", TEXAS: "TX",
    UTAH: "UT", VERMONT: "VT", VIRGINIA: "VA", WASHINGTON: "WA", "WEST VIRGINIA": "WV",
    WISCONSIN: "WI", WYOMING: "WY", "DISTRICT OF COLUMBIA": "DC",
  };
  return names[code] ?? null;
}

/**
 * Best-effort extraction of a US state / ZIP from a free-text address like
 * "123 Main St, Mesa, AZ 85201". Used when a buyer types a delivery address
 * instead of picking a structured one.
 */
export function parseStateZipFromAddress(address: string | null | undefined): {
  state: string | null;
  zip: string | null;
} {
  if (!address) return { state: null, zip: null };
  const zipMatch = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  const stateMatch = address.match(/\b([A-Za-z]{2})\b(?=\s*,?\s*\d{5}|\s*$)/)
    ?? address.match(/,\s*([A-Za-z]{2})\b/);
  const state = normalizeUsState(stateMatch?.[1] ?? null);
  return { state, zip: zipMatch?.[1] ?? null };
}

function buildLabel(state: string | null, source: TaxSource): string {
  if (source === "no_destination") return "Tax (calculated at payment)";
  if (source === "no_tax_state") return `Sales tax (${state} — none)`;
  if (source === "not_taxable") return `Sales tax (${state} — not taxed)`;
  if (source === "exempt") return `Tax exempt${state ? ` (${state})` : ""}`;
  return `Estimated tax${state ? ` (${state})` : ""}`;
}

/** Applicable rate and taxable share for a kind in a state (0 = not taxed). */
export function taxRateFor(state: string, kind: TaxKind = "sale", today = new Date()): { ratePct: number; share: number } {
  const general = STATE_SALES_TAX_RATES[state] ?? 0;
  if (kind !== "digital") return { ratePct: general, share: 1 };
  const rule = DIGITAL_TAX_RULES[state];
  if (!rule || (rule.from && today.toISOString().slice(0, 10) < rule.from)) return { ratePct: 0, share: 1 };
  return { ratePct: rule.ratePct ?? general, share: rule.share ?? 1 };
}

/**
 * Quotes the estimated sales tax for a taxable amount heading to a US
 * destination. Never throws — checkout stays available regardless of
 * destination data quality. Pass `exemption` when the buyer holds an active
 * certificate for the destination state.
 */
export async function quoteSalesTax(opts: {
  amountCents: number;
  destination: TaxDestination;
  kind?: TaxKind;
  exemption?: { id: string; state: string } | null;
  today?: Date;
}): Promise<TaxQuote> {
  const taxableAmountCents = Math.max(0, Math.round(opts.amountCents));
  const state = normalizeUsState(opts.destination.state);
  const result = (source: TaxSource, ratePct = 0, taxCents = 0, exemptionId: string | null = null): TaxQuote => ({
    taxCents, ratePct, state, source, taxableAmountCents, label: buildLabel(state, source),
    ...(exemptionId ? { exemptionId } : {}),
  });

  if (!state) return result("no_destination");
  if ((STATE_SALES_TAX_RATES[state] ?? 0) <= 0) return result("no_tax_state");
  const { ratePct, share } = taxRateFor(state, opts.kind ?? "sale", opts.today);
  if (ratePct <= 0) return result("not_taxable");
  if (opts.exemption && normalizeUsState(opts.exemption.state) === state) {
    return result("exempt", 0, 0, opts.exemption.id);
  }
  const effective = Math.round(ratePct * share * 10000) / 10000;
  return result("state_table", effective, Math.round(taxableAmountCents * share * (ratePct / 100)));
}
