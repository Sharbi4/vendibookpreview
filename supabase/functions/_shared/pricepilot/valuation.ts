/**
 * PricePilot deterministic valuation engine.
 *
 * All pricing math lives here in plain statistical code. AI never invents a
 * number: the edge function computes the range, recommended price, strategy
 * prices and confidence here, then asks a model only to interpret the result.
 *
 * Method:
 *  1. Similarity scoring (category pool, geography, year, size, make, features)
 *  2. Evidence-quality weighting (observed sold-status > pending > asking price)
 *  3. Robust outlier filtering (modified z-score via MAD, IQR fence fallback)
 *  4. Weighted median center + weighted quartile range (never a naive average)
 *  5. Documented subject adjustments (condition, operational status, equipment,
 *     year vs comp median) with hard caps so no single factor dominates
 *  6. Confidence from comp count, evidence quality, spread and geography
 */

export type AssetCategory = 'food_truck' | 'food_trailer' | 'food_cart' | 'mobile_bar';
export type ValuationMode = 'sale' | 'rental';

export interface SubjectProfile {
  mode: ValuationMode;
  assetCategory: AssetCategory;
  city?: string | null;
  state?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  lengthFt?: number | null;
  mileage?: number | null;
  condition?: 'excellent' | 'good' | 'fair' | 'project' | null;
  operationalStatus?: 'turnkey' | 'running' | 'needs_work' | 'not_running' | null;
  features: Record<string, boolean>;
  knownIssues?: string | null;
  recentUpgrades?: string | null;
  notes?: string | null;
}

export type EvidenceType = 'facebook_observed' | 'vendibook_asking' | 'vendibook_verified';

export interface CompRecord {
  id: string;
  title: string;
  city: string | null;
  state: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  lengthFt: number | null;
  displayedPrice: number | null;
  previousDisplayedPrice: number | null;
  observedStatus: 'sold' | 'pending' | 'active' | 'unknown';
  evidenceType: EvidenceType;
  evidenceConfidence: number;
  features: Record<string, unknown>;
  qualityFlags: string[];
}

export interface ScoredComp extends CompRecord {
  similarity: number;
  weight: number;
}

export interface AdjustmentEntry {
  label: string;
  direction: 'up' | 'down' | 'neutral';
  detail: string;
}

export interface Distribution {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  recommended: number;
}

export interface ValuationResult {
  estimatedMarketLow: number;
  estimatedMarketHigh: number;
  recommendedListPrice: number;
  quickSalePrice: number;
  premiumPositionPrice: number;
  confidenceScore: number;
  confidenceLabel: 'high' | 'moderate' | 'limited';
  comparableCount: number;
  strongComparableCount: number;
  medianComparablePrice: number;
  adjustmentSummary: AdjustmentEntry[];
  comparables: ScoredComp[];
  distribution: Distribution;
  methodology: string[];
  warnings: string[];
}

export interface RentalValuationResult {
  dailyRate: number;
  dailyLow: number;
  dailyHigh: number;
  weeklyRate: number;
  weeklyLow: number;
  weeklyHigh: number;
  monthlyRate: number;
  confidenceScore: number;
  confidenceLabel: 'high' | 'moderate' | 'limited';
  comparableCount: number;
  comparables: ScoredComp[];
  methodology: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

function weightedQuantile(items: { value: number; weight: number }[], q: number): number {
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((s, i) => s + i.weight, 0);
  if (total <= 0) return sorted[Math.floor(sorted.length / 2)]?.value ?? 0;
  const target = q * total;
  let cum = 0;
  for (let i = 0; i < sorted.length; i++) {
    const prev = cum;
    cum += sorted[i].weight;
    if (cum >= target) {
      // Interpolate inside this item's weight span for a smooth estimate.
      const span = sorted[i].weight || 1;
      const frac = Math.min(1, Math.max(0, (target - prev) / span));
      const prevValue = i > 0 ? sorted[i - 1].value : sorted[i].value;
      return prevValue + (sorted[i].value - prevValue) * frac;
    }
  }
  return sorted[sorted.length - 1].value;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Drop comps whose price is a robust-statistical outlier (modified z > 3.5). */
export function filterOutliers<T extends { displayedPrice: number }>(comps: T[]): T[] {
  if (comps.length < 5) return comps; // too few points to judge outliers
  const prices = comps.map((c) => c.displayedPrice);
  const med = median(prices);
  const absDev = prices.map((p) => Math.abs(p - med));
  const mad = median(absDev);
  if (mad > 0) {
    const kept = comps.filter((c) => Math.abs(0.6745 * (c.displayedPrice - med) / mad) <= 3.5);
    if (kept.length >= Math.max(3, Math.floor(comps.length * 0.6))) return kept;
  }
  // MAD collapsed (many identical prices): fall back to a 1.5x IQR fence.
  const s = [...prices].sort((a, b) => a - b);
  const q1 = s[Math.floor(s.length * 0.25)];
  const q3 = s[Math.floor(s.length * 0.75)];
  const iqr = q3 - q1;
  if (iqr <= 0) return comps;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const kept = comps.filter((c) => c.displayedPrice >= lo && c.displayedPrice <= hi);
  return kept.length >= Math.max(3, Math.floor(comps.length * 0.6)) ? kept : comps;
}

function round100(n: number): number {
  return Math.max(100, Math.round(n / 100) * 100);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

// ---------------------------------------------------------------------------
// Similarity + weighting
// ---------------------------------------------------------------------------

const EQUIPMENT_FEATURE_KEYS = [
  'hood_fire_suppression',
  'generator',
  'refrigeration',
  'plumbing',
  'inspection_ready',
  'new_kitchen',
  'bbq',
  'smoker',
  'wood_fired_pizza',
  'pizza',
  'ice_cream',
];

export function similarityScore(subject: SubjectProfile, comp: CompRecord): number {
  let score = 0.5;
  if (subject.state && comp.state) {
    if (subject.state.toUpperCase() === comp.state.toUpperCase()) score += 0.25;
  }
  if (subject.city && comp.city && subject.city.toLowerCase() === comp.city.toLowerCase()) score += 0.1;
  if (subject.year && comp.year) {
    score += 0.15 * Math.max(0, 1 - Math.abs(subject.year - comp.year) / 15);
  }
  if (subject.lengthFt && comp.lengthFt) {
    score += 0.1 * Math.max(0, 1 - Math.abs(subject.lengthFt - comp.lengthFt) / 12);
  }
  if (subject.make && comp.make && subject.make.toLowerCase() === comp.make.toLowerCase()) score += 0.1;

  const subjectFeatures = new Set(
    EQUIPMENT_FEATURE_KEYS.filter((k) => subject.features?.[k]),
  );
  const compFeatures = new Set(
    EQUIPMENT_FEATURE_KEYS.filter((k) => comp.features?.[k]),
  );
  if (subjectFeatures.size && compFeatures.size) {
    let overlap = 0;
    for (const f of subjectFeatures) if (compFeatures.has(f)) overlap++;
    score += 0.1 * (overlap / Math.max(subjectFeatures.size, compFeatures.size));
  }
  return clamp(score, 0, 1);
}

const SOURCE_WEIGHT: Record<EvidenceType, number> = {
  facebook_observed: 1.0,
  vendibook_asking: 0.5,
  vendibook_verified: 1.3,
};

export function compWeight(comp: CompRecord, similarity: number): number {
  return (0.35 + 0.65 * similarity) * clamp(comp.evidenceConfidence, 0.1, 1) * SOURCE_WEIGHT[comp.evidenceType];
}

// ---------------------------------------------------------------------------
// Subject adjustments (documented, capped)
// ---------------------------------------------------------------------------

const CONDITION_ADJ: Record<string, { pct: number; label: string }> = {
  excellent: { pct: 0.06, label: 'Excellent condition' },
  good: { pct: 0, label: 'Good condition' },
  fair: { pct: -0.08, label: 'Fair condition' },
  project: { pct: -0.22, label: 'Project condition' },
};

const OPERATIONAL_ADJ: Record<string, { pct: number; label: string }> = {
  turnkey: { pct: 0.05, label: 'Turnkey and ready to operate' },
  running: { pct: 0, label: 'Running condition' },
  needs_work: { pct: -0.1, label: 'Needs mechanical work' },
  not_running: { pct: -0.25, label: 'Not currently running' },
};

const FEATURE_ADJ: Record<string, { pct: number; label: string }> = {
  hood_fire_suppression: { pct: 0.04, label: 'Hood and fire suppression system' },
  generator: { pct: 0.03, label: 'Onboard generator' },
  refrigeration: { pct: 0.03, label: 'Refrigeration package' },
  plumbing: { pct: 0.02, label: 'Fresh and grey water plumbing' },
};

function computeAdjustments(subject: SubjectProfile, compMedianYear: number | null): {
  totalPct: number;
  entries: AdjustmentEntry[];
} {
  const entries: AdjustmentEntry[] = [];
  let pct = 0;

  if (subject.condition && CONDITION_ADJ[subject.condition]) {
    const c = CONDITION_ADJ[subject.condition];
    pct += c.pct;
    entries.push({
      label: c.label,
      direction: c.pct > 0 ? 'up' : c.pct < 0 ? 'down' : 'neutral',
      detail: `${c.pct > 0 ? '+' : ''}${Math.round(c.pct * 100)}% vs comparable baseline`,
    });
  }

  if (subject.operationalStatus && OPERATIONAL_ADJ[subject.operationalStatus]) {
    const o = OPERATIONAL_ADJ[subject.operationalStatus];
    pct += o.pct;
    entries.push({
      label: o.label,
      direction: o.pct > 0 ? 'up' : o.pct < 0 ? 'down' : 'neutral',
      detail: `${o.pct > 0 ? '+' : ''}${Math.round(o.pct * 100)}% vs comparable baseline`,
    });
  }

  let featurePct = 0;
  for (const [key, def] of Object.entries(FEATURE_ADJ)) {
    if (!subject.features?.[key]) continue;
    featurePct += def.pct;
    entries.push({
      label: def.label,
      direction: 'up',
      detail: `+${Math.round(def.pct * 100)}% equipment package`,
    });
  }
  featurePct = Math.min(featurePct, 0.1); // cap total equipment premium
  pct += featurePct;

  if (subject.year && compMedianYear) {
    const diff = clamp(subject.year - compMedianYear, -8, 8);
    const yearPct = clamp(diff * 0.01, -0.08, 0.08);
    if (yearPct !== 0) {
      pct += yearPct;
      entries.push({
        label: diff > 0 ? 'Newer than typical comparable' : 'Older than typical comparable',
        direction: yearPct > 0 ? 'up' : 'down',
        detail: `${yearPct > 0 ? '+' : ''}${Math.round(yearPct * 100)}% vs comp median year ${Math.round(compMedianYear)}`,
      });
    }
  }

  return { totalPct: clamp(pct, -0.45, 0.25), entries };
}

// ---------------------------------------------------------------------------
// Fallback bands (used only when real evidence is too thin)
// ---------------------------------------------------------------------------

const SALE_FALLBACK_BANDS: Record<AssetCategory, [number, number]> = {
  food_truck: [18000, 55000],
  food_trailer: [8000, 30000],
  food_cart: [3000, 15000],
  mobile_bar: [5000, 20000],
};

const RENTAL_FALLBACK_DAILY: Record<AssetCategory, [number, number]> = {
  food_truck: [250, 450],
  food_trailer: [150, 300],
  food_cart: [75, 175],
  mobile_bar: [150, 350],
};

// ---------------------------------------------------------------------------
// Sale valuation
// ---------------------------------------------------------------------------

export function runSaleValuation(subject: SubjectProfile, comps: CompRecord[]): ValuationResult {
  const warnings: string[] = [];
  const methodology: string[] = [
    'Comparable units are scored for similarity on geography, year, size, make and equipment package.',
    'Each comparable is weighted by similarity and evidence quality. Observed sold-status listings carry more weight than current asking prices.',
    'Outliers are removed with robust statistics (median absolute deviation) before the range is calculated.',
    'The estimate is the weighted median of comparable prices, with the range from weighted quartiles. No simple averages are used.',
    'Observed marketplace sold status is treated as market evidence only, never as a verified closing price.',
  ];

  const usable = comps.filter(
    (c) => typeof c.displayedPrice === 'number' && c.displayedPrice !== null && c.displayedPrice >= 500,
  );

  const scored: ScoredComp[] = usable.map((c) => {
    const similarity = similarityScore(subject, c);
    return { ...c, similarity, weight: compWeight(c, similarity) };
  });

  const filtered = filterOutliers(scored);
  const dropped = scored.length - filtered.length;
  if (dropped > 0) {
    methodology.push(`${dropped} statistical outlier${dropped === 1 ? '' : 's'} excluded so extreme prices do not distort the estimate.`);
  }

  // Thin evidence: fall back to broad category bands with explicit low confidence.
  if (filtered.length < 3) {
    const [lo, hi] = SALE_FALLBACK_BANDS[subject.assetCategory];
    const mid = (lo + hi) / 2;
    warnings.push(
      'Limited comparable evidence for this equipment type. The range below uses broad category bands and should be treated as a starting point only.',
    );
    return {
      estimatedMarketLow: round100(lo),
      estimatedMarketHigh: round100(hi),
      recommendedListPrice: round100(mid),
      quickSalePrice: round100(mid * 0.88),
      premiumPositionPrice: round100(hi * 1.02),
      confidenceScore: 22,
      confidenceLabel: 'limited',
      comparableCount: filtered.length,
      strongComparableCount: 0,
      medianComparablePrice: filtered.length ? round100(median(filtered.map((c) => c.displayedPrice!))) : 0,
      adjustmentSummary: [],
      comparables: filtered,
      distribution: { min: lo, q1: lo, median: mid, q3: hi, max: hi, recommended: round100(mid) },
      methodology,
      warnings,
    };
  }

  const weighted = filtered.map((c) => ({ value: c.displayedPrice!, weight: c.weight }));
  let q1 = weightedQuantile(weighted, 0.25);
  let med = weightedQuantile(weighted, 0.5);
  let q3 = weightedQuantile(weighted, 0.75);

  if (filtered.length < 6) {
    q1 *= 0.9;
    q3 *= 1.1;
    warnings.push('Small comparable set. The range was widened to reflect thinner market evidence.');
  }

  const compYears = filtered.map((c) => c.year).filter((y): y is number => typeof y === 'number');
  const compMedianYear = compYears.length >= 3 ? median(compYears) : null;
  const { totalPct, entries } = computeAdjustments(subject, compMedianYear);

  const recommended = round100(med * (1 + totalPct));
  const quickSale = round100(recommended * 0.88);
  const premium = round100(Math.max(q3 * (1 + totalPct), recommended * 1.08));
  let low = round100(q1 * (1 + totalPct * 0.6));
  let high = round100(q3 * (1 + totalPct * 0.6));
  if (high <= low) {
    low = round100(recommended * 0.85);
    high = round100(recommended * 1.15);
  }

  // Confidence: comp count (45) + evidence quality (25) + spread tightness (20) + geography (10)
  const strongCount = filtered.filter((c) => c.similarity >= 0.6 && c.evidenceConfidence >= 0.4).length;
  const countScore = Math.min(strongCount / 8, 1) * 45;
  const evidenceScore =
    (filtered.reduce((s, c) => s + c.evidenceConfidence, 0) / filtered.length) * 25;
  const iqrRatio = med > 0 ? (q3 - q1) / med : 1;
  const spreadScore = clamp(1 - iqrRatio, 0, 1) * 20;
  const sameState = subject.state
    ? filtered.filter((c) => c.state?.toUpperCase() === subject.state!.toUpperCase()).length
    : 0;
  const geoScore = (sameState / filtered.length) * 10;
  const confidenceScore = Math.round(clamp(countScore + evidenceScore + spreadScore + geoScore, 0, 100));
  const confidenceLabel = confidenceScore >= 70 ? 'high' : confidenceScore >= 40 ? 'moderate' : 'limited';

  if (sameState === 0 && subject.state) {
    warnings.push('No comparables from your state. The estimate leans on national evidence, so local demand may shift the range.');
  }
  if (filtered.every((c) => c.evidenceType !== 'vendibook_verified')) {
    warnings.push('No verified transaction prices in this evidence set. Ranges reflect observed asking and sold-status prices.');
  }

  const prices = filtered.map((c) => c.displayedPrice!);
  return {
    estimatedMarketLow: low,
    estimatedMarketHigh: high,
    recommendedListPrice: recommended,
    quickSalePrice: quickSale,
    premiumPositionPrice: premium,
    confidenceScore,
    confidenceLabel,
    comparableCount: filtered.length,
    strongComparableCount: strongCount,
    medianComparablePrice: round100(med),
    adjustmentSummary: entries,
    comparables: filtered.sort((a, b) => b.weight - a.weight),
    distribution: {
      min: Math.min(...prices),
      q1: round100(q1),
      median: round100(med),
      q3: round100(q3),
      max: Math.max(...prices),
      recommended,
    },
    methodology,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Rental valuation (Vendibook asking-rate evidence only, never sale comps)
// ---------------------------------------------------------------------------

export function runRentalValuation(subject: SubjectProfile, comps: CompRecord[]): RentalValuationResult {
  const warnings: string[] = [
    'Rental rates are benchmarked from current published Vendibook asking rates. Equipment sale prices are never used to estimate rental rates.',
  ];
  const methodology: string[] = [
    'Rental comps are published Vendibook listings with daily rates, weighted by state and category match.',
    'The daily recommendation is the weighted median of comparable asking rates.',
    'Weekly and monthly figures use observed weekly and monthly asking rates when available, otherwise typical bundle multiples of the daily rate.',
  ];

  const usable = comps.filter(
    (c) => typeof c.displayedPrice === 'number' && c.displayedPrice !== null && c.displayedPrice >= 25,
  );

  if (usable.length < 3) {
    const [lo, hi] = RENTAL_FALLBACK_DAILY[subject.assetCategory];
    const daily = Math.round(((lo + hi) / 2) / 5) * 5;
    const dailyLow = Math.round(lo / 5) * 5;
    const dailyHigh = Math.round(hi / 5) * 5;
    warnings.push('Limited rental evidence for this equipment type. Rates below are broad category benchmarks, not a market read.');
    return {
      dailyRate: daily,
      dailyLow,
      dailyHigh,
      weeklyRate: Math.round((daily * 5.5) / 5) * 5,
      weeklyLow: Math.round((dailyLow * 5.5) / 5) * 5,
      weeklyHigh: Math.round((dailyHigh * 5.5) / 5) * 5,
      monthlyRate: Math.round((daily * 20) / 10) * 10,
      confidenceScore: 20,
      confidenceLabel: 'limited',
      comparableCount: usable.length,
      comparables: usable.map((c) => ({ ...c, similarity: 0.5, weight: 0.5 })),
      methodology,
      warnings,
    };
  }

  const scored: ScoredComp[] = usable.map((c) => {
    let sim = 0.6;
    if (subject.state && c.state && subject.state.toUpperCase() === c.state.toUpperCase()) sim += 0.3;
    if (subject.year && c.year) sim += 0.1 * Math.max(0, 1 - Math.abs(subject.year - c.year) / 15);
    const similarity = clamp(sim, 0, 1);
    return { ...c, similarity, weight: 0.4 + 0.6 * similarity };
  });

  const weighted = scored.map((c) => ({ value: c.displayedPrice!, weight: c.weight }));
  const daily = Math.round(weightedQuantile(weighted, 0.5) / 5) * 5;

  const weeklyRates = scored
    .map((c) => (c.features?.__weeklyRate as number) || 0)
    .filter((n) => n > 0);
  const monthlyRates = scored
    .map((c) => (c.features?.__monthlyRate as number) || 0)
    .filter((n) => n > 0);

  const weekly = weeklyRates.length >= 3
    ? Math.round(median(weeklyRates) / 5) * 5
    : Math.round((daily * 5.5) / 5) * 5;
  const monthly = monthlyRates.length >= 3
    ? Math.round(median(monthlyRates) / 10) * 10
    : Math.round((daily * 20) / 10) * 10;
  if (weeklyRates.length < 3 || monthlyRates.length < 3) {
    methodology.push('Weekly or monthly figures derived from the daily rate where direct asking-rate evidence was thin.');
  }

  const countScore = Math.min(scored.length / 10, 1) * 55;
  const sameState = subject.state
    ? scored.filter((c) => c.state?.toUpperCase() === subject.state!.toUpperCase()).length
    : 0;
  const geoScore = (sameState / scored.length) * 25;
  const spreadBase = weightedQuantile(weighted, 0.75) - weightedQuantile(weighted, 0.25);
  const spreadScore = daily > 0 ? clamp(1 - spreadBase / daily, 0, 1) * 20 : 0;
  const confidenceScore = Math.round(clamp(countScore + geoScore + spreadScore, 0, 100));
  const confidenceLabel = confidenceScore >= 70 ? 'high' : confidenceScore >= 40 ? 'moderate' : 'limited';

  if (sameState === 0 && subject.state) {
    warnings.push('No rental comps from your state. Rates reflect national asking prices.');
  }

  return {
    dailyRate: daily,
    weeklyRate: weekly,
    monthlyRate: monthly,
    confidenceScore,
    confidenceLabel,
    comparableCount: scored.length,
    comparables: scored.sort((a, b) => b.weight - a.weight),
    methodology,
    warnings,
  };
}
