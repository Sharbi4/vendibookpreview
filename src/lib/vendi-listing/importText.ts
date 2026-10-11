/**
 * "List with Vendi" — existing-listing import.
 *
 * The seller pastes the text of a listing they already published somewhere else
 * (Facebook Marketplace, Craigslist, a dealer site, …). We parse ONLY explicitly
 * stated facts out of that text.
 *
 * Hard rules:
 *  - Nothing is scraped. We never fetch, crawl, or bypass another platform.
 *    The seller pastes their own text; that is the only input.
 *  - Nothing is inferred. Specs that are not literally written are not captured.
 *  - Anything ambiguous is staged as a confirmation the seller must approve
 *    before it is saved.
 */

import { cleanText, parseDimensions, parseList, parseLocation, parseMoney } from './extract';

export interface PendingConfirm {
  /** Stable id, e.g. `confirm:price_sale`. */
  id: string;
  /** What Vendi asks the seller. */
  question: string;
  /** Human-readable value shown back to the seller. */
  display: string;
  /** Applied only when the seller says yes. */
  patch: Record<string, unknown>;
  /** Interview questions considered answered once confirmed. */
  answers: string[];
}

export interface ImportResult {
  /** Confidently extracted, explicit values. */
  patch: Record<string, unknown>;
  /** Interview questions already answered by the paste. */
  answered: string[];
  /** Ambiguous values that need an explicit yes before saving. */
  confirms: PendingConfirm[];
  /** Field labels Vendi extracted, for the recap message. */
  found: string[];
}

const CATEGORY_PATTERNS: Array<{ re: RegExp; value: string; label: string }> = [
  { re: /\bfood\s*truck\b|\bmobile\s*kitchen\s*truck\b/i, value: 'food_truck', label: 'Food Truck' },
  { re: /\b(food|concession|coffee|kitchen)\s*trailer\b/i, value: 'food_trailer', label: 'Food Trailer' },
  { re: /\b(commercial|ghost|commissary)\s*kitchen\b/i, value: 'ghost_kitchen', label: 'Commercial Kitchen' },
  { re: /\bvendor\s*lot\b/i, value: 'vendor_lot', label: 'Vendor Lot' },
  { re: /\bvendor\s*(space|stall|spot)\b/i, value: 'vendor_space', label: 'Vendor Space' },
];

const PERIOD_PATTERNS: Array<{ re: RegExp; period: string; field: string; label: string }> = [
  { re: /(per\s*month|\/\s*mo\b|\/\s*month|monthly|a\s*month)/i, period: 'monthly', field: 'price_monthly', label: 'per month' },
  { re: /(per\s*week|\/\s*wk\b|\/\s*week|weekly|a\s*week)/i, period: 'weekly', field: 'price_weekly', label: 'per week' },
  { re: /(per\s*day|\/\s*day|daily|a\s*day)/i, period: 'daily', field: 'price_daily', label: 'per day' },
  { re: /(per\s*hour|\/\s*hr\b|\/\s*hour|hourly|an\s*hour)/i, period: 'hourly', field: 'price_hourly', label: 'per hour' },
];

const labelledLine = (text: string, labels: string[]): string | null => {
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z /]+)\s*[:\-–]\s*(.+)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    if (labels.some((l) => key === l || key.startsWith(l))) {
      const value = cleanText(match[2]);
      if (value) return value;
    }
  }
  return null;
};

const money = (value: number) => `$${value.toLocaleString('en-US')}`;

/** Parse pasted listing text into explicit ListingFormData-compatible values. */
export function parseExistingListing(raw: string): ImportResult {
  const text = (raw ?? '').replace(/\r\n/g, '\n').trim();
  const flat = cleanText(text);
  const patch: Record<string, unknown> = {};
  const answered: string[] = [];
  const confirms: PendingConfirm[] = [];
  const found: string[] = [];

  if (!text) return { patch, answered, confirms, found };

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // ── Title ────────────────────────────────────────────────────────────
  const labelledTitle = labelledLine(text, ['title', 'name', 'item']);
  const firstLine = lines[0] && lines[0].length <= 120 && lines.length > 1 ? cleanText(lines[0]) : null;
  const title = labelledTitle ?? firstLine;
  if (title && title.length >= 8 && title.length <= 120) {
    patch.title = title;
    answered.push('title');
    found.push('Title');
  }

  // ── Description ──────────────────────────────────────────────────────
  const labelledDesc = labelledLine(text, ['description', 'details', 'about']);
  const bodyLines = title && !labelledDesc ? lines.slice(lines[0] === title ? 1 : 0) : lines;
  const description = labelledDesc ?? cleanText(bodyLines.join(' '));
  if (description && description.length >= 20) {
    patch.description = description.slice(0, 4000);
    answered.push('description');
    found.push('Description');
  }

  // ── Category ─────────────────────────────────────────────────────────
  const categoryHits = CATEGORY_PATTERNS.filter((c) => c.re.test(flat));
  if (categoryHits.length === 1) {
    patch.category = categoryHits[0].value;
    answered.push('category');
    found.push(`Category (${categoryHits[0].label})`);
  } else if (categoryHits.length > 1) {
    confirms.push({
      id: 'confirm:category',
      question: `Your listing mentions a few types. Is this a ${categoryHits[0].label.toLowerCase()}?`,
      display: categoryHits[0].label,
      patch: { category: categoryHits[0].value },
      answers: ['category'],
    });
  }

  // ── Location ─────────────────────────────────────────────────────────
  const labelledLoc = labelledLine(text, ['location', 'city', 'located']);
  const inlineLoc = flat.match(/\b([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2}),\s*([A-Z]{2})\b(?:\s+(\d{5}))?/);
  const locSource = labelledLoc ?? (inlineLoc ? inlineLoc[0] : null);
  if (locSource) {
    const loc = parseLocation(locSource);
    if (loc.city && loc.state) {
      patch.city = loc.city;
      patch.state = loc.state;
      patch.zip_code = loc.zip_code;
      patch.address = `${loc.city}, ${loc.state}`;
      answered.push('location');
      found.push(`Location (${loc.city}, ${loc.state})`);
    }
  }

  // ── Price ────────────────────────────────────────────────────────────
  const priceLine = labelledLine(text, ['price', 'asking', 'rate', 'rent', 'cost']);
  const priceContext = priceLine ?? (flat.match(/[^.\n]*\$\s?[0-9][^.\n]*/)?.[0] ?? '');
  const amount = priceContext ? parseMoney(priceContext) : null;
  if (amount) {
    const period = PERIOD_PATTERNS.find((p) => p.re.test(priceContext));
    if (period) {
      patch.mode = 'rent';
      patch.rent_period = period.period;
      patch[period.field] = amount;
      answered.push('mode', 'rent_period', 'rent_price');
      found.push(`Rental rate (${money(amount)} ${period.label})`);
    } else {
      confirms.push({
        id: 'confirm:price_sale',
        question: `I found ${money(amount)} in your listing. Is that your asking sale price?`,
        display: `${money(amount)} sale price`,
        patch: { mode: 'sale', price_sale: amount },
        answers: ['mode', 'sale_price'],
      });
    }
  }

  // ── Equipment / amenities (labelled lists only) ──────────────────────
  const equipLine = labelledLine(text, ['equipment', 'features', 'includes', 'included']);
  if (equipLine) {
    const amenities = parseList(equipLine);
    if (amenities.length) {
      patch.amenities = amenities;
      answered.push('amenities');
      found.push('Equipment list');
    }
  }

  // ── Dimensions (only when a unit is explicitly written) ──────────────
  const dimLine = labelledLine(text, ['dimensions', 'size', 'length']) ?? flat;
  if (/\d\s*(?:x|by)\s*\d/i.test(dimLine) && /\b(ft|foot|feet|in|inch|inches|')\b|"/i.test(dimLine)) {
    const dims = parseDimensions(dimLine);
    if (dims.length_inches && dims.width_inches) {
      confirms.push({
        id: 'confirm:dimensions',
        question: `Are the dimensions ${Math.round(dims.length_inches / 12)} x ${Math.round(dims.width_inches / 12)}${
          dims.height_inches ? ` x ${Math.round(dims.height_inches / 12)}` : ''
        } ft?`,
        display: 'Dimensions',
        patch: dims as unknown as Record<string, unknown>,
        answers: ['dimensions'],
      });
    }
  }

  return { patch, answered, confirms, found };
}

/**
 * True when the seller pasted only a link. Vendibook never fetches another
 * marketplace, so we must ask for the text instead of implying we can read it.
 */
export function isUrlOnly(raw: string): boolean {
  const text = cleanText(raw);
  if (!text) return false;
  return /^https?:\/\/\S+$/i.test(text) || /^www\.\S+$/i.test(text);
}

export const URL_ONLY_REPLY =
  'I can’t open links — Vendibook never pulls anything from another marketplace. Copy the words out of that page and paste ' +
  'them here instead, and I’ll pick out everything that’s actually written.';

/**
 * A human-readable recap of a paste: what was captured, what still needs the
 * seller's confirmation, and what is genuinely still missing. Never implies
 * anything was fetched from an external site.
 */
export function importSummary(result: ImportResult): string {
  const lines: string[] = [];
  if (result.found.length) {
    lines.push('Here’s what I pulled out of your text:');
    lines.push(...result.found.map((f) => `• ${f}`));
  }
  if (result.confirms.length) {
    lines.push('');
    lines.push('A couple of things I don’t want to guess at:');
    lines.push(...result.confirms.map((c) => `• ${c.display} — I’ll ask you to confirm`));
  }
  if (!lines.length) return 'I couldn’t find anything definite in that text.';
  lines.push('');
  lines.push('I won’t ask you for any of that again — we’ll only fill in what’s still missing.');
  return lines.join('\n');
}

