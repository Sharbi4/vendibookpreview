/**
 * PricePilot market comparables — deterministic selection, ranking and evidence stats.
 *
 * EVIDENCE RULE: Facebook Marketplace "Sold · $X" means a listing was marked sold at a
 * displayed marketplace price. It is NOT a verified final transaction / closing price.
 * `previous_displayed_price` is a prior asking price and is NEVER a closing price.
 *
 * Pure module (no Deno/browser APIs) so it can be unit tested directly.
 */

export interface ComparableRow {
  id?: string;
  source?: string | null;
  source_title?: string | null;
  observed_status?: string | null;
  asset_category?: string | null;
  valuation_mode?: string | null;
  city?: string | null;
  state?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  length_ft?: number | null;
  displayed_price?: number | null;
  previous_displayed_price?: number | null;
  verified_transaction_price?: number | null;
  transaction_price_verified?: boolean | null;
  extraction_confidence?: number | null;
  evidence_confidence?: number | null;
  usable_for_valuation?: boolean | null;
  quality_flags?: unknown;
  normalized_features?: Record<string, unknown> | null;
}

export interface CompSubject {
  mode: 'sale' | 'rental';
  category: string | null;
  city: string | null;
  state: string | null;
  year: number | null;
  lengthFt: number | null;
}

export interface SafeComparable {
  title: string;
  category: string | null;
  city: string | null;
  state: string | null;
  year: number | null;
  lengthFt: number | null;
  displayedPrice: number | null;
  observedStatus: string;
  sourceLabel: string;
  transactionPriceVerified: boolean;
  evidenceNote: string;
}

export interface MarketEvidence {
  observationsAnalyzed: number;
  closeMatches: number;
  geographicScope: string;
  medianDisplayedPrice: number | null;
  rangeLow: number | null;
  rangeHigh: number | null;
  comparables: SafeComparable[];
}

const STATES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};
const ABBRS = new Set(Object.values(STATES));

/** Parse "Austin, TX" / "austin texas" style free text into city + state. */
export function parseLocation(input?: string | null): { city: string | null; state: string | null } {
  if (!input) return { city: null, state: null };
  const raw = input.trim();
  if (!raw) return { city: null, state: null };

  let state: string | null = null;
  const lower = raw.toLowerCase();
  for (const [name, abbr] of Object.entries(STATES)) {
    if (new RegExp(`(^|[,\\s])${name}([,\\s]|$)`).test(lower)) { state = abbr; break; }
  }
  if (!state) {
    const m = raw.match(/(?:^|[,\s])([A-Za-z]{2})(?:[,\s]|$)/g);
    if (m) {
      for (let i = m.length - 1; i >= 0; i--) {
        const c = m[i].replace(/[^A-Za-z]/g, '').toUpperCase();
        if (ABBRS.has(c)) { state = c; break; }
      }
    }
  }
  const cityPart = raw.split(',')[0]?.trim() ?? '';
  const city = cityPart && !ABBRS.has(cityPart.toUpperCase()) && !STATES[cityPart.toLowerCase()]
    ? cityPart
    : null;
  return { city, state };
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

/** Price we are allowed to use as evidence. Never `previous_displayed_price`. */
export function evidencePrice(row: ComparableRow): number | null {
  if (row.transaction_price_verified === true) {
    const v = num(row.verified_transaction_price);
    if (v && v > 0) return v;
  }
  const d = num(row.displayed_price);
  return d && d > 0 ? d : null;
}

function categoryMatch(rowCat: string | null | undefined, subjectCat: string | null): number {
  if (!subjectCat || !rowCat) return 0;
  if (rowCat === subjectCat) return 25;
  const towable = new Set(['food_trailer', 'food_cart']);
  const motorized = new Set(['food_truck', 'mobile_kitchen']);
  if ((towable.has(rowCat) && towable.has(subjectCat)) || (motorized.has(rowCat) && motorized.has(subjectCat))) return 10;
  return -20;
}

export interface ScoredComp { row: ComparableRow; score: number; price: number; sameState: boolean; close: boolean }

/** Rows that can never be used for a sale valuation. */
export function isUsableSaleComp(row: ComparableRow): boolean {
  if (row.usable_for_valuation === false) return false;
  if ((row.valuation_mode ?? 'sale') !== 'sale') return false;
  const status = (row.observed_status ?? '').toLowerCase();
  if (status === 'ambiguous' || status === 'unknown') return false;
  const ev = num(row.evidence_confidence);
  const ex = num(row.extraction_confidence);
  if (ev !== null && ev < 0.3) return false;
  if (ex !== null && ex < 0.3) return false;
  return evidencePrice(row) !== null;
}

export function scoreComp(row: ComparableRow, subject: CompSubject): ScoredComp | null {
  if (!isUsableSaleComp(row)) return null;
  const price = evidencePrice(row)!;
  const status = (row.observed_status ?? '').toLowerCase();

  let score = 0;
  if (row.transaction_price_verified === true) score += 120;
  else if (status === 'sold') score += 60;
  else if (status === 'pending') score += 30;
  else score += 18;

  const catScore = categoryMatch(row.asset_category ?? null, subject.category);
  score += catScore;

  const sameState = !!subject.state && (row.state ?? '').toUpperCase() === subject.state.toUpperCase();
  if (sameState) score += 40;
  const sameCity = sameState && !!subject.city && (row.city ?? '').toLowerCase() === subject.city.toLowerCase();
  if (sameCity) score += 15;

  let close = sameState;
  if (subject.year && row.year) {
    const d = Math.abs(subject.year - row.year);
    if (d <= 3) score += 15; else if (d <= 6) score += 6; else { score -= 5; close = false; }
  }
  if (subject.lengthFt && row.length_ft) {
    const d = Math.abs(subject.lengthFt - Number(row.length_ft));
    if (d <= 3) score += 12; else if (d <= 6) score += 5; else { score -= 5; close = false; }
  }
  if (catScore < 0) close = false;

  const ev = num(row.evidence_confidence) ?? 0.6;
  const ex = num(row.extraction_confidence) ?? 0.6;
  score *= (ev + ex) / 2;

  return { row, score, price, sameState, close: close && catScore > 0 };
}

export function selectComparables(
  rows: ComparableRow[],
  subject: CompSubject,
  limit = 6,
): { scored: ScoredComp[]; selected: ScoredComp[]; geographicScope: string } {
  if (subject.mode !== 'sale') {
    return { scored: [], selected: [], geographicScope: 'not applicable' };
  }
  const scored = rows
    .map((r) => scoreComp(r, subject))
    .filter((s): s is ScoredComp => s !== null)
    .sort((a, b) => b.score - a.score);

  const sameState = scored.filter((s) => s.sameState);
  const useStateOnly = sameState.length >= 3;
  const pool = useStateOnly ? sameState : scored;
  const selected = pool.slice(0, limit);

  let geographicScope = 'national';
  if (useStateOnly && subject.state) geographicScope = `${subject.state} statewide`;
  else if (sameState.length > 0 && subject.state) geographicScope = `${subject.state} plus national`;

  return { scored, selected, geographicScope };
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function sourceLabel(row: ComparableRow): string {
  const src = (row.source ?? '').toLowerCase();
  if (src.includes('facebook')) return 'Facebook Marketplace';
  if (src.includes('vendibook')) return 'Vendibook';
  return row.source || 'Marketplace';
}

export function toSafeComparable(row: ComparableRow): SafeComparable {
  const verified = row.transaction_price_verified === true && !!num(row.verified_transaction_price);
  const status = (row.observed_status ?? 'listed').toLowerCase();
  const evidenceNote = verified
    ? 'Verified internal transaction price.'
    : status === 'sold'
      ? 'Observed sold-status listing. Displayed marketplace price, not a confirmed final transaction price.'
      : status === 'pending'
        ? 'Observed pending listing. Displayed marketplace price only.'
        : 'Observed marketplace listing. Displayed price only.';
  return {
    title: row.source_title || 'Marketplace observation',
    category: row.asset_category ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    year: row.year ?? null,
    lengthFt: row.length_ft === null || row.length_ft === undefined ? null : Number(row.length_ft),
    displayedPrice: evidencePrice(row),
    observedStatus: status,
    sourceLabel: sourceLabel(row),
    transactionPriceVerified: verified,
    evidenceNote,
  };
}

export function buildMarketEvidence(
  rows: ComparableRow[],
  subject: CompSubject,
  limit = 6,
): MarketEvidence | null {
  const { scored, selected, geographicScope } = selectComparables(rows, subject, limit);
  if (!selected.length) return null;
  const prices = selected.map((s) => s.price);
  return {
    observationsAnalyzed: scored.length,
    closeMatches: scored.filter((s) => s.close).length,
    geographicScope,
    medianDisplayedPrice: median(prices),
    rangeLow: Math.min(...prices),
    rangeHigh: Math.max(...prices),
    comparables: selected.map((s) => toSafeComparable(s.row)),
  };
}

/** Prompt block describing internal comps for the pricing model. */
export function formatMarketEvidenceContext(evidence: MarketEvidence): string {
  const lines = evidence.comparables.map((c, i) => {
    const bits = [
      c.year ? String(c.year) : null,
      c.lengthFt ? `${c.lengthFt} ft` : null,
      c.category,
      [c.city, c.state].filter(Boolean).join(', ') || null,
      c.displayedPrice !== null ? `$${c.displayedPrice.toLocaleString('en-US')}` : null,
      `status: ${c.observedStatus}`,
      `source: ${c.sourceLabel}`,
      c.transactionPriceVerified ? 'VERIFIED transaction price' : 'displayed price only (NOT a verified closing price)',
    ].filter(Boolean);
    return `[C${i + 1}] ${c.title} — ${bits.join(' · ')}`;
  });
  return `INTERNAL MARKET EVIDENCE (Vendibook comparable observations)
Observations analyzed: ${evidence.observationsAnalyzed}
Close matches: ${evidence.closeMatches}
Geographic scope: ${evidence.geographicScope}
Median displayed price: ${evidence.medianDisplayedPrice !== null ? `$${evidence.medianDisplayedPrice.toLocaleString('en-US')}` : 'n/a'}
Observed displayed-price range: ${evidence.rangeLow !== null ? `$${evidence.rangeLow.toLocaleString('en-US')}` : 'n/a'} – ${evidence.rangeHigh !== null ? `$${evidence.rangeHigh.toLocaleString('en-US')}` : 'n/a'}
${lines.join('\n')}`;
}
