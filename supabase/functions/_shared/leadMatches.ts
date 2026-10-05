// Picks live listings that fit a concierge (Tell Vendibook) request so the
// confirmation email can show real options right away instead of only
// "we'll follow up". Pure logic: the caller queries listings and passes rows.
import { parseLocationInput } from './locationSearch.ts';

export interface LeadMatchRequest {
  intent?: string | null;      // 'rent' | 'buy' | 'list' | 'sell'
  category?: string | null;    // TellVendibook category value
  city?: string | null;        // free text, e.g. "Atlanta, GA" or "Atlanta ga"
  budget?: string | null;      // TellVendibook budget code, e.g. 'lt_25k'
}

export interface MatchableListing {
  id: string;
  title: string | null;
  mode: string;
  category: string;
  city: string | null;
  state: string | null;
  price_sale: number | string | null;
  price_daily: number | string | null;
  price_weekly: number | string | null;
  price_monthly: number | string | null;
  vendibook_freight_enabled: boolean | null;
}

// Same buckets as TellVendibookModal's budgetToRange (rent budgets are per day).
const BUDGET_MAX: Record<string, number | null> = {
  lt_500: 500,
  '500_1500': 1500,
  '1500_5k': 5000,
  gt_5k: null,
  lt_25k: 25000,
  '25k_60k': 60000,
  '60k_120k': 120000,
  gt_120k: null,
};

// TellVendibook categories → listing_category values.
const CATEGORY_MAP: Record<string, string[]> = {
  food_truck: ['food_truck'],
  food_trailer: ['food_trailer'],
  commercial_kitchen: ['ghost_kitchen'],
  vendor_space: ['vendor_space', 'vendor_lot'],
};

export interface LeadListingFilter {
  mode: 'rent' | 'sale';
  categories: string[] | null;
}

/** Listing query filter for a request, or null when it isn't a buyer/renter request. */
export function leadListingFilter(req: LeadMatchRequest): LeadListingFilter | null {
  const mode = req.intent === 'rent' ? 'rent' : req.intent === 'buy' ? 'sale' : null;
  if (!mode) return null;
  const categories = req.category ? CATEGORY_MAP[req.category] ?? null : null;
  return { mode, categories };
}

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/**
 * Ranks listings for a request. A listing qualifies when it's in the same
 * city or state, or (for purchases) ships via Vendibook Freight. Sale
 * listings far over budget are dropped; rent budgets only affect ranking
 * because people often mean weekly or monthly.
 */
export function rankLeadMatches(
  req: LeadMatchRequest,
  rows: MatchableListing[],
  limit = 3,
): MatchableListing[] {
  const filter = leadListingFilter(req);
  if (!filter) return [];
  const loc = parseLocationInput(req.city);
  const wantCity = norm(loc.city);
  const wantState = loc.state;
  if (!wantCity && !wantState) return [];
  const budgetMax = req.budget ? BUDGET_MAX[req.budget] ?? null : null;

  const scored: Array<{ row: MatchableListing; score: number }> = [];
  for (const row of rows) {
    if (row.mode !== filter.mode) continue;
    if (filter.categories && !filter.categories.includes(row.category)) continue;

    const sameCity = !!wantCity && norm(row.city) === wantCity;
    const sameState = !!wantState && (row.state ?? '').toUpperCase() === wantState;
    const ships = filter.mode === 'sale' && !!row.vendibook_freight_enabled;
    if (!sameCity && !sameState && !ships) continue;

    let score = (sameCity ? 3 : 0) + (sameState ? 2 : 0) + (ships && !sameState ? 0.5 : 0);

    if (filter.mode === 'sale') {
      const price = num(row.price_sale);
      if (budgetMax && price) {
        if (price > budgetMax * 1.25) continue;
        score += price <= budgetMax ? 1 : 0;
      }
    } else {
      const daily = num(row.price_daily);
      if (budgetMax && daily) score += daily <= budgetMax ? 1 : -0.5;
    }
    scored.push({ row, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.row);
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** Short price label, e.g. "$18,000" or "$300/day · $5,000/month". */
export function leadMatchPrice(row: MatchableListing): string {
  if (row.mode === 'sale') {
    const p = num(row.price_sale);
    return p ? usd(p) : 'Make an offer';
  }
  const parts = [
    num(row.price_daily) && `${usd(num(row.price_daily)!)}/day`,
    num(row.price_weekly) && `${usd(num(row.price_weekly)!)}/week`,
    num(row.price_monthly) && `${usd(num(row.price_monthly)!)}/month`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Ask for rates';
}

/** One plain-text line for an email: "• Title — City, ST — $price: url". */
export function leadMatchLine(row: MatchableListing, siteUrl: string, utm: string): string {
  const title = (row.title ?? '').trim().replace(/\s+/g, ' ').slice(0, 80) || 'Listing';
  const where = [row.city, row.state].filter(Boolean).join(', ');
  return `• ${title}${where ? ` (${where})` : ''}, ${leadMatchPrice(row)}: ${siteUrl}/listing/${row.id}?${utm}`;
}
