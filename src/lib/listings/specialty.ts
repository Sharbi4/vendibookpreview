// Specialty marketplace categories (Phase 4 SEO): coffee and ice cream.
// Matching prefers the structured `subcategory` column and falls back to
// tight title/description keyword patterns so listings created before the
// subcategory existed still surface. Patterns are intentionally narrow —
// a generic mention of "coffee" in a description must not pull unrelated
// listings into the collection.

export type SpecialtyKey = 'coffee' | 'ice_cream';

export interface SpecialtyDef {
  /** Display: 'Coffee Trucks & Coffee Trailers' */
  pluralTitle: string;
  /** Lowercase display: 'coffee trucks & coffee trailers' */
  pluralLower: string;
  /** Hub route, e.g. /coffee-trucks-trailers-for-sale */
  hubPath: string;
  /** Query used for the search CTA, e.g. /search?q=coffee */
  searchQuery: string;
  subcategories: string[];
  /** ILIKE patterns (without % wildcards) matched against title. */
  titlePatterns: string[];
  /** Tight ILIKE patterns matched against description. */
  descriptionPatterns: string[];
}

export const SPECIALTY_DEFS: Record<SpecialtyKey, SpecialtyDef> = {
  coffee: {
    pluralTitle: 'Coffee Trucks & Coffee Trailers',
    pluralLower: 'coffee trucks & coffee trailers',
    hubPath: '/coffee-trucks-trailers-for-sale',
    searchQuery: 'coffee',
    subcategories: ['coffee_beverage'],
    titlePatterns: ['coffee', 'espresso', 'cold brew', 'cold-brew'],
    descriptionPatterns: [
      'espresso machine',
      'coffee trailer',
      'coffee truck',
      'coffee cart',
      'mobile coffee',
    ],
  },
  ice_cream: {
    pluralTitle: 'Ice Cream Trucks & Ice Cream Trailers',
    pluralLower: 'ice cream trucks & ice cream trailers',
    hubPath: '/ice-cream-trucks-trailers-for-sale',
    searchQuery: 'ice cream',
    subcategories: ['ice_cream_dessert'],
    titlePatterns: [
      'ice cream',
      'ice-cream',
      'icecream',
      'soft serve',
      'soft-serve',
      'gelato',
      'frozen yogurt',
      'froyo',
    ],
    descriptionPatterns: [
      'ice cream machine',
      'soft serve machine',
      'soft-serve machine',
      'frozen yogurt',
      'gelato',
    ],
  },
};

const ilike = (col: string, pattern: string) => `${col}.ilike.*${pattern}*`;

/**
 * PostgREST `or()` filter string for a specialty. Structured subcategory
 * first, then title patterns, then tight description patterns.
 */
export const specialtyOrFilter = (key: SpecialtyKey): string => {
  const def = SPECIALTY_DEFS[key];
  const parts = def.subcategories.map((s) => `subcategory.eq.${s}`);
  def.titlePatterns.forEach((p) => parts.push(ilike('title', p)));
  def.descriptionPatterns.forEach((p) => parts.push(ilike('description', p)));
  return parts.join(',');
};

/**
 * Map a structured subcategory value to its specialty, if any.
 */
export const specialtyForSubcategory = (subcategory: string): SpecialtyKey | undefined =>
  (Object.keys(SPECIALTY_DEFS) as SpecialtyKey[]).find((key) =>
    SPECIALTY_DEFS[key].subcategories.includes(subcategory),
  );

/**
 * Client-side detection for a single listing row.
 */
export const detectSpecialty = (row: {
  title?: string | null;
  subcategory?: string | null;
  description?: string | null;
}): SpecialtyKey | null => {
  const title = (row.title ?? '').toLowerCase();
  const desc = (row.description ?? '').toLowerCase();
  for (const key of Object.keys(SPECIALTY_DEFS) as SpecialtyKey[]) {
    const def = SPECIALTY_DEFS[key];
    if (row.subcategory && def.subcategories.includes(row.subcategory)) return key;
    if (def.titlePatterns.some((p) => title.includes(p))) return key;
    if (def.descriptionPatterns.some((p) => desc.includes(p))) return key;
  }
  return null;
};
