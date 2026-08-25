import { supabase } from '@/integrations/supabase/client';

/**
 * Vendibook Food Truck Prices — marketplace data layer.
 *
 * IMPORTANT: prices here are ASKING (advertised listing) prices from live
 * published Vendibook listings, not completed transaction prices. All UI
 * copy must say "listing price" / "asking price", never "sale price".
 */

// Sanity bounds — listings outside this range are treated as placeholder
// or data-entry errors (e.g. $1 placeholders, monthly payments entered as
// totals) and excluded from analysis. High-end legitimate equipment under
// $500k is always kept.
export const PRICE_MIN_USD = 5_000;
export const PRICE_MAX_USD = 500_000;

// Never publish a granular statistic from a tiny sample.
export const MIN_SAMPLE = 5;

export const PRICE_BANDS = [
  { label: 'Under $20,000', min: 0, max: 19_999 },
  { label: '$20,000–$39,999', min: 20_000, max: 39_999 },
  { label: '$40,000–$59,999', min: 40_000, max: 59_999 },
  { label: '$60,000–$79,999', min: 60_000, max: 79_999 },
  { label: '$80,000+', min: 80_000, max: Infinity },
] as const;

export interface PricingRow {
  id: string;
  title: string;
  category: 'food_truck' | 'food_trailer';
  price_sale: number;
  state: string | null;
  subcategory: string | null;
  condition: string | null;
  published_at: string | null;
  cover_image_url: string | null;
}

export interface GroupStats {
  n: number;
  median: number;
  mean: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  /** false when n < MIN_SAMPLE — UI must show "not enough data" instead */
  sufficient: boolean;
}

export interface StateStats extends GroupStats {
  state: string;
  stateName: string;
  /** marketplace page for this state, when one exists */
  href: string | null;
}

export interface MarketStats {
  fetchedAt: Date;
  totalListings: number;
  statesRepresented: number;
  earliestPublished: string | null;
  latestPublished: string | null;
  overall: GroupStats;
  trucks: GroupStats;
  trailers: GroupStats;
  truckCount: number;
  trailerCount: number;
  /** condition groups — frequently insufficient; gate before display */
  newUnits: GroupStats;
  usedUnits: GroupStats;
  states: StateStats[];
  bands: { label: string; count: number; pct: number }[];
  coffee: GroupStats;
  iceCream: GroupStats;
  inventory: PricingRow[];
}

export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

/** States with a dedicated Phase-3 marketplace page to link into. */
const STATE_PAGE_SLUGS: Record<string, string> = {
  TX: 'texas', AZ: 'arizona', GA: 'georgia', FL: 'florida', MI: 'michigan', OH: 'ohio',
};

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function groupStats(prices: number[]): GroupStats {
  if (prices.length === 0) {
    return { n: 0, median: 0, mean: 0, p25: 0, p75: 0, min: 0, max: 0, sufficient: false };
  }
  const sorted = [...prices].sort((a, b) => a - b);
  return {
    n: prices.length,
    median: median(sorted),
    mean: Math.round(sorted.reduce((s, v) => s + v, 0) / prices.length),
    p25: Math.round(percentile(sorted, 0.25)),
    p75: Math.round(percentile(sorted, 0.75)),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    sufficient: prices.length >= MIN_SAMPLE,
  };
}

/**
 * Fetch and clean qualifying marketplace records.
 * Qualifying = published, active for-sale food trucks/trailers with a
 * plausible asking price; demo listings and price outliers excluded.
 */
export async function fetchPricingRows(): Promise<PricingRow[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, category, price_sale, state, subcategory, condition, published_at, cover_image_url')
    .eq('status', 'published')
    .eq('mode', 'sale')
    .in('category', ['food_truck', 'food_trailer'])
    .is('deleted_at', null)
    .eq('moderation_status', 'clear')
    .not('price_sale', 'is', null)
    .not('title', 'ilike', 'demo%')
    .order('published_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as PricingRow[]).filter(
    (r) =>
      typeof r.price_sale === 'number' &&
      r.price_sale >= PRICE_MIN_USD &&
      r.price_sale <= PRICE_MAX_USD,
  );
}

export function computeMarketStats(rows: PricingRow[]): MarketStats {
  const prices = rows.map((r) => r.price_sale);
  const truckRows = rows.filter((r) => r.category === 'food_truck');
  const trailerRows = rows.filter((r) => r.category === 'food_trailer');

  const byState = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.state) continue;
    const list = byState.get(r.state) ?? [];
    list.push(r.price_sale);
    byState.set(r.state, list);
  }
  const states: StateStats[] = [...byState.entries()]
    .map(([state, list]) => ({
      ...groupStats(list),
      state,
      stateName: STATE_NAMES[state] ?? state,
      href: STATE_PAGE_SLUGS[state]
        ? `/food-trucks-for-sale/${STATE_PAGE_SLUGS[state]}`
        : null,
    }))
    .sort((a, b) => b.n - a.n);

  const bands = PRICE_BANDS.map((b) => {
    const count = prices.filter((p) => p >= b.min && p <= b.max).length;
    return {
      label: b.label,
      count,
      pct: prices.length ? Math.round((count / prices.length) * 100) : 0,
    };
  });

  const publishedDates = rows
    .map((r) => r.published_at)
    .filter((d): d is string => Boolean(d))
    .sort();

  return {
    fetchedAt: new Date(),
    totalListings: rows.length,
    statesRepresented: byState.size,
    earliestPublished: publishedDates[0] ?? null,
    latestPublished: publishedDates[publishedDates.length - 1] ?? null,
    overall: groupStats(prices),
    trucks: groupStats(truckRows.map((r) => r.price_sale)),
    trailers: groupStats(trailerRows.map((r) => r.price_sale)),
    truckCount: truckRows.length,
    trailerCount: trailerRows.length,
    newUnits: groupStats(
      rows.filter((r) => r.condition === 'new').map((r) => r.price_sale),
    ),
    usedUnits: groupStats(
      rows
        .filter((r) => r.condition === 'like_new' || r.condition === 'good' || r.condition === 'fair')
        .map((r) => r.price_sale),
    ),
    states,
    bands,
    coffee: groupStats(
      rows.filter((r) => r.subcategory === 'coffee_beverage').map((r) => r.price_sale),
    ),
    iceCream: groupStats(
      rows.filter((r) => r.subcategory === 'ice_cream_dessert').map((r) => r.price_sale),
    ),
    inventory: rows.filter((r) => r.cover_image_url).slice(0, 6),
  };
}

export function formatUsd(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function formatUsdCompact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return '$' + (Number.isInteger(k) ? k : k.toFixed(1)) + 'k';
  }
  return formatUsd(n);
}

/** Snapshot label, e.g. "August 2026" — recomputed from live listings on every view. */
export function snapshotLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
