/**
 * Sales-tax engine for Vendibook PayPal checkouts.
 *
 * Model: marketplace facilitator. Vendibook COLLECTS estimated sales tax from
 * the buyer on top of the merchandise/rental/service amount and REMITS it
 * itself. Tax is therefore never part of the seller/host payout and never
 * part of the commission base — it rides on top of gross and is booked to a
 * `tax_collected` ledger entry at capture time.
 *
 * Rate source, in priority order:
 *   1. TaxJar SmartCalcs (`POST /v2/taxes`) when TAXJAR_API_KEY is configured
 *      — address-level accuracy.
 *   2. Built-in state-level average combined rate table — always available so
 *      checkout never breaks if the API key is missing or TaxJar is down.
 *
 * Every result is labeled with its `source` so receipts and admin tooling can
 * tell an exact TaxJar quote from a state-table estimate.
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
  /** Effective combined rate used, e.g. 8.4 for 8.4%. */
  ratePct: number;
  /** Normalized 2-letter state the quote is based on, if known. */
  state: string | null;
  source: TaxSource;
  taxableAmountCents: number;
  /** Short human label for breakdown lines, e.g. "Estimated tax (AZ)". */
  label: string;
}

/**
 * Average combined (state + local) sales-tax rate by state, in percent.
 * Approximate published 2025–2026 averages; used only when TaxJar is not
 * configured or unreachable. States with no general sales tax are 0.
 */
export const STATE_COMBINED_TAX_RATES: Record<string, number> = {
  AL: 9.29, AK: 0, AZ: 8.4, AR: 9.43, CA: 8.85, CO: 7.81, CT: 6.35, DE: 0,
  DC: 6.0, FL: 7.0, GA: 7.4, HI: 4.5, ID: 6.03, IL: 8.86, IN: 7.0, IA: 6.94,
  KS: 8.67, KY: 6.0, LA: 9.56, ME: 5.5, MD: 6.0, MA: 6.25, MI: 6.0, MN: 7.52,
  MS: 7.06, MO: 8.41, MT: 0, NE: 7.0, NV: 8.24, NH: 0, NJ: 6.6, NM: 7.72,
  NY: 8.53, NC: 7.0, ND: 7.04, OH: 7.27, OK: 9.0, OR: 0, PA: 6.34, RI: 7.0,
  SC: 7.5, SD: 6.11, TN: 9.61, TX: 8.2, UT: 7.25, VT: 6.36, VA: 5.77,
  WA: 9.47, WV: 6.57, WI: 5.7, WY: 5.44,
};

/** Vendibook HQ — the "from" address for TaxJar rate lookups. */
const ORIGIN = { state: "AZ", zip: "85001", city: "Phoenix", country: "US" } as const;

const US_STATE_CODES = new Set(Object.keys(STATE_COMBINED_TAX_RATES));

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

/** TaxJar SmartCalcs rate lookup. Throws on any failure — caller falls back. */
async function quoteViaTaxJar(
  amountCents: number,
  destination: Required<Pick<TaxDestination, "state">> & TaxDestination,
): Promise<{ taxCents: number; ratePct: number }> {
  const apiKey = Deno.env.get("TAXJAR_API_KEY");
  if (!apiKey) throw new Error("taxjar_not_configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    const res = await fetch("https://api.taxjar.com/v2/taxes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from_country: ORIGIN.country,
        from_state: ORIGIN.state,
        from_zip: ORIGIN.zip,
        from_city: ORIGIN.city,
        to_country: "US",
        to_state: destination.state,
        ...(destination.zip ? { to_zip: destination.zip } : {}),
        ...(destination.city ? { to_city: destination.city } : {}),
        amount: amountCents / 100,
        shipping: 0,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`taxjar_http_${res.status}`);
    const json = await res.json();
    const toCollect = Number(json?.tax?.amount_to_collect ?? NaN);
    const rate = Number(json?.tax?.rate ?? NaN);
    if (!Number.isFinite(toCollect) || toCollect < 0) throw new Error("taxjar_bad_response");
    return {
      taxCents: Math.round(toCollect * 100),
      ratePct: Number.isFinite(rate) ? Math.round(rate * 10000) / 100 : 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Quotes the estimated sales tax for a taxable amount heading to a US
 * destination. Never throws — any provider failure degrades to the built-in
 * state table so checkout stays available.
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

  const zip = opts.destination.zip?.trim() || null;

  if (Deno.env.get("TAXJAR_API_KEY")) {
    try {
      const exact = await quoteViaTaxJar(taxableAmountCents, {
        state,
        zip,
        city: opts.destination.city ?? null,
      });
      return {
        taxCents: exact.taxCents,
        ratePct: exact.ratePct,
        state,
        source: "taxjar",
        taxableAmountCents,
        label: buildLabel(state, "taxjar"),
      };
    } catch (err) {
      console.warn(
        `[TAX] TaxJar lookup failed, using state table fallback: ${(err as Error).message}`,
      );
    }
  }

  const ratePct = STATE_COMBINED_TAX_RATES[state] ?? 0;
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
