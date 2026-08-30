/**
 * Canonical keyword → listing category mapping.
 *
 * Single source of truth shared by the `search-listings` edge function and the
 * parity tests/audit script. Keeping the aliases here (rather than inline in
 * the edge function) is what makes "does every published listing show up under
 * its category?" testable in CI.
 *
 * Rule: when a query resolves to a category, the caller MUST apply the category
 * filter and MUST NOT additionally apply a loose title/description ILIKE — that
 * combination is what silently narrowed "food truck" down to a single listing.
 */

export type CanonicalCategory =
  | 'food_truck'
  | 'food_trailer'
  | 'ghost_kitchen'
  | 'vendor_space'
  | 'vendor_lot';

/** Ordered most-specific → least-specific; first match wins. */
export const CATEGORY_ALIASES: Array<[string, CanonicalCategory]> = [
  ['food truck', 'food_truck'],
  ['foodtruck', 'food_truck'],
  ['mobile kitchen', 'food_truck'],
  ['catering truck', 'food_truck'],
  ['taco truck', 'food_truck'],
  ['coffee truck', 'food_truck'],
  ['food trailer', 'food_trailer'],
  ['foodtrailer', 'food_trailer'],
  ['concession trailer', 'food_trailer'],
  ['concession', 'food_trailer'],
  ['ghost kitchen', 'ghost_kitchen'],
  ['commercial kitchen', 'ghost_kitchen'],
  ['shared kitchen', 'ghost_kitchen'],
  ['commissary kitchen', 'ghost_kitchen'],
  ['commissary', 'ghost_kitchen'],
  ['kitchen rental', 'ghost_kitchen'],
  ['prep kitchen', 'ghost_kitchen'],
  ['kitchen', 'ghost_kitchen'],
  ['kitchens', 'ghost_kitchen'],
  ['vendor space', 'vendor_space'],
  ['vendor spaces', 'vendor_space'],
  ['vendor lot', 'vendor_lot'],
  ['vending', 'vendor_space'],
  // Bare nouns last so multi-word intent wins first.
  ['truck', 'food_truck'],
  ['trucks', 'food_truck'],
  ['trailer', 'food_trailer'],
  ['trailers', 'food_trailer'],
];

/** Filler words that describe the transaction, not the product. */
const MODE_FILLERS = /\b(for\s+rent|for\s+sale|to\s+rent|to\s+buy|rental|rentals)\b/gi;

export const normalizeQuery = (query: string | undefined | null): string =>
  (query ?? '').replace(MODE_FILLERS, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Matches when the alias appears verbatim, or when every typed token is a
 * prefix of the alias's matching token (min 3 chars, so "f" selects nothing).
 * This is what makes the "food truc" typo resolve to food_truck.
 */
export const matchesAlias = (queryLower: string, alias: string): boolean => {
  if (!queryLower) return false;
  if (queryLower.includes(alias)) return true;
  const aliasTokens = alias.split(' ');
  const queryTokens = queryLower.split(' ').filter(Boolean);
  if (queryTokens.length === 0 || queryTokens.length > aliasTokens.length) return false;
  return queryTokens.every((tok, i) => {
    const target = aliasTokens[i];
    if (!target) return false;
    return tok.length < 3 ? tok === target : target.startsWith(tok);
  });
};

/** Returns the canonical category a keyword query expresses, or null. */
export const inferCategoryFromQuery = (query: string | undefined | null): CanonicalCategory | null => {
  const queryLower = normalizeQuery(query);
  if (!queryLower) return null;
  for (const [alias, cat] of CATEGORY_ALIASES) {
    if (matchesAlias(queryLower, alias)) return cat;
  }
  return null;
};

/**
 * Expands a canonical category into the set of stored category values to
 * search. Vendor Spaces has a legacy `vendor_lot` twin — same shopper concept.
 */
export const expandCategory = (category: string): string[] =>
  category === 'vendor_space' || category === 'vendor_lot'
    ? ['vendor_space', 'vendor_lot']
    : [category];
