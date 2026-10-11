/**
 * Sales-tax engine for Vendibook PayPal checkouts.
 *
 * Model: marketplace facilitator. Vendibook COLLECTS estimated sales tax from
 * the buyer on top of the merchandise/rental/service amount and REMITS it
 * itself. Tax is therefore never part of the seller/host payout and never
 * part of the commission base — it rides on top of gross and is booked to a
 * `tax_collected` ledger entry at capture time.
 *
 * Rate source: the built-in STATE SALES TAX table below (each state's
 * published statewide base sales-tax rate). No external tax API is called —
 * the quote is always available and checkout never depends on a third-party
 * service. Rates are the statewide base rate; local county/city add-ons are
 * not included (we do not have address-level jurisdiction data).
 *
 * Every result is labeled with its `source` so receipts and admin tooling can
 * tell how the quote was produced. Historical receipts may carry
 * `source: "taxjar"` from the retired TaxJar integration; that value is kept
 * in the type union for backward compatibility only and is never produced.
 */

export type TaxKind = "sale" | "rental" | "service" | "product";

export interface TaxDestination {
  state?: string | null;
  zip?: string | null;
  city?: string | null;
}

export type TaxSource = "taxjar" | "state_table" | "no_tax_state" | "no_destination";

export interface TaxQuote {
  taxCents: number;
  /** Effective rate used, e.g. 5.6 for 5.6%. */
  ratePct: number;
  /** Normalized 2-letter state the quote is based on, if known. */
  state: string | null;
  source: TaxSource;
  taxableAmountCents: number;
  /** Short human label for breakdown lines, e.g. "Estimated tax (AZ)". */
  label: string;
}

/**
 * Statewide base sales-tax rate by state, in percent (published rates).
 * States with no general sales tax are 0. Local add-ons are not included.
 */
export const STATE_SALES_TAX_RATES: Record<string, number> = {
  AL: 4.0, AK: 0, AZ: 5.6, AR: 6.5, CA: 7.25, CO: 2.9, CT: 6.35, DE: 0,
  DC: 6.0, FL: 6.0, GA: 4.0, HI: 4.5, ID: 6.0, IL: 6.25, IN: 7.0, IA: 6.0,
  KS: 6.5, KY: 6.0, LA: 4.45, ME: 5.5, MD: 6.0, MA: 6.25, MI: 6.0, MN: 6.875,
  MS: 7.0, MO: 4.225, MT: 0, NE: 5.5, NV: 6.85, NH: 0, NJ: 6.625, NM: 5.125,
  NY: 4.0, NC: 4.75, ND: 5.0, OH: 5.75, OK: 4.5, OR: 0, PA: 6.0, RI: 7.0,
  SC: 6.0, SD: 4.2, TN: 7.0, TX: 6.25, UT: 6.1, VT: 6.0, VA: 5.3,
  WA: 6.5, WV: 6.0, WI: 5.0, WY: 4.0,
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
  return `Estimated tax${state ? ` (${state})` : ""}`;
}

/**
 * Quotes the estimated sales tax for a taxable amount heading to a US
 * destination, using the built-in state sales-tax table. Never throws —
 * checkout stays available regardless of destination data quality.
 */
export async function quoteSalesTax(opts: {
  amountCents: number;
  destination: TaxDestination;
  kind?: TaxKind;
}): Promise<TaxQuote> {
  const taxableAmountCents = Math.max(0, Math.round(opts.amountCents));
  const state = normalizeUsState(opts.destination.state);

  if (!state) {
    return {
      taxCents: 0,
      ratePct: 0,
      state: null,
      source: "no_destination",
      taxableAmountCents,
      label: buildLabel(null, "no_destination"),
    };
  }

  const ratePct = STATE_SALES_TAX_RATES[state] ?? 0;
  if (ratePct <= 0) {
    return {
      taxCents: 0,
      ratePct: 0,
      state,
      source: "no_tax_state",
      taxableAmountCents,
      label: buildLabel(state, "no_tax_state"),
    };
  }
  return {
    taxCents: Math.round(taxableAmountCents * (ratePct / 100)),
    ratePct,
    state,
    source: "state_table",
    taxableAmountCents,
    label: buildLabel(state, "state_table"),
  };
}
