// Specialty marketplace categories (Phase 4 + Phase 6 SEO). Matching prefers
// the structured `subcategory` column and falls back to tight
// title/description keyword patterns so listings created before the
// subcategory existed still surface. Patterns are intentionally narrow —
// a generic mention of "coffee" in a description must not pull unrelated
// listings into the collection.
//
// Phase 6 additions: pizza, bbq, snow_cone, beverage, mobile_kitchen.
// Iteration order matters for detectSpecialty: coffee/ice_cream stay first,
// mobile_kitchen (broadest) stays last.

export type SpecialtyKey =
  | 'coffee'
  | 'ice_cream'
  | 'pizza'
  | 'bbq'
  | 'snow_cone'
  | 'beverage'
  | 'mobile_kitchen';

export interface SpecialtyDef {
  /** Display: 'Coffee Trucks & Coffee Trailers' */
  pluralTitle: string;
  /** Lowercase display: 'coffee trucks & coffee trailers' */
  pluralLower: string;
  /** Hub route, e.g. /coffee-trucks-trailers-for-sale */
  hubPath: string;
  /** Dedicated truck landing page, e.g. /coffee-trucks-for-sale */
  truckPath?: string;
  /** Dedicated trailer landing page, e.g. /coffee-trailers-for-sale */
  trailerPath?: string;
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
    truckPath: '/coffee-trucks-for-sale',
    trailerPath: '/coffee-trailers-for-sale',
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
    truckPath: '/ice-cream-trucks-for-sale',
    trailerPath: '/ice-cream-trailers-for-sale',
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
  pizza: {
    pluralTitle: 'Pizza Trucks & Pizza Trailers',
    pluralLower: 'pizza trucks & pizza trailers',
    hubPath: '/pizza-trucks-trailers-for-sale',
    searchQuery: 'pizza',
    subcategories: ['pizza_truck', 'pizza_trailer'],
    titlePatterns: ['pizza'],
    descriptionPatterns: [
      'pizza oven',
      'pizza trailer',
      'pizza truck',
      'wood-fired pizza',
      'wood fired pizza',
      'wood/gas pizza',
      'pizza kitchen',
      'deck oven',
      'conveyor oven',
    ],
  },
  bbq: {
    pluralTitle: 'BBQ Trucks & BBQ Trailers',
    pluralLower: 'bbq trucks & bbq trailers',
    hubPath: '/bbq-trucks-trailers-for-sale',
    searchQuery: 'bbq',
    subcategories: ['bbq_smoker', 'bbq_pit_trailer'],
    titlePatterns: ['bbq', 'barbecue', 'bar-b-que', 'barbeque', 'smoker'],
    descriptionPatterns: [
      'smoker',
      'bbq trailer',
      'bbq concession',
      'barbecue trailer',
      'barbecue truck',
      'offset smoker',
      'pellet smoker',
    ],
  },
  snow_cone: {
    pluralTitle: 'Snow Cone & Shaved Ice Trucks & Trailers',
    pluralLower: 'snow cone & shaved ice trucks & trailers',
    hubPath: '/snow-cone-shaved-ice-trailers-for-sale',
    searchQuery: 'shaved ice',
    subcategories: ['snowcone_shaved_ice'],
    titlePatterns: [
      'snow cone',
      'snowcone',
      'snow-cone',
      'sno cone',
      'sno-cone',
      'snocone',
      'shaved ice',
      'shave ice',
      'snowball',
    ],
    descriptionPatterns: [
      'shaved ice',
      'shave ice',
      'snow cone',
      'snowcone',
      'sno cone',
      'ice shaver',
      'snowball',
    ],
  },
  beverage: {
    pluralTitle: 'Beverage & Mobile Bar Trucks & Trailers',
    pluralLower: 'beverage & mobile bar trucks & trailers',
    hubPath: '/beverage-bar-trailers-for-sale',
    searchQuery: 'beverage',
    subcategories: ['mobile_bar', 'beverage_trailer'],
    titlePatterns: [
      'beverage',
      'mobile bar',
      'bar trailer',
      'tap trailer',
      'tap truck',
      'lemonade',
      'smoothie',
      'juice truck',
      'juice trailer',
      'boba',
      'bubble tea',
      'cocktail trailer',
      'drink trailer',
    ],
    descriptionPatterns: [
      'beverage trailer',
      'mobile bar',
      'tap system',
      'kegerator',
      'drink trailer',
      'lemonade',
      'smoothie trailer',
      'juice bar',
    ],
  },
  mobile_kitchen: {
    pluralTitle: 'Mobile Kitchen & Kitchen Trailers',
    pluralLower: 'mobile kitchen & kitchen trailers',
    hubPath: '/mobile-kitchen-trailers-for-sale',
    searchQuery: 'kitchen trailer',
    subcategories: [],
    titlePatterns: [
      'kitchen trailer',
      'mobile kitchen',
      'commercial kitchen',
      'kitchen on wheels',
    ],
    descriptionPatterns: [
      'commercial kitchen on wheels',
      'mobile kitchen trailer',
      'kitchen trailer for sale',
      'mobile kitchen for sale',
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

// ---------------------------------------------------------------------------
// Specialty browse deep links — one canonical search URL per specialty +
// vehicle split. Used by hub headers, the search filter strip, and listing
// cards so every entry point lands on the same filtered /search state.
// ---------------------------------------------------------------------------

export type SpecialtyVehicle = 'truck' | 'trailer';

export const SPECIALTY_VEHICLE_LABELS: Record<SpecialtyKey, Record<SpecialtyVehicle, string>> = {
  coffee: { truck: 'Browse coffee trucks', trailer: 'Browse coffee trailers' },
  ice_cream: { truck: 'Browse ice cream trucks', trailer: 'Browse ice cream trailers' },
  pizza: { truck: 'Browse pizza trucks', trailer: 'Browse pizza trailers' },
  bbq: { truck: 'Browse BBQ trucks', trailer: 'Browse BBQ trailers' },
  snow_cone: { truck: 'Browse snow cone trucks', trailer: 'Browse snow cone & shaved ice trailers' },
  beverage: { truck: 'Browse beverage & bar trucks', trailer: 'Browse beverage & bar trailers' },
  mobile_kitchen: { truck: 'Browse mobile kitchen trucks', trailer: 'Browse kitchen trailers' },
};

/** Compact labels for filter pills / card chips. */
export const SPECIALTY_VEHICLE_SHORT_LABELS: Record<SpecialtyKey, Record<SpecialtyVehicle, string>> = {
  coffee: { truck: 'Coffee trucks', trailer: 'Coffee trailers' },
  ice_cream: { truck: 'Ice cream trucks', trailer: 'Ice cream trailers' },
  pizza: { truck: 'Pizza trucks', trailer: 'Pizza trailers' },
  bbq: { truck: 'BBQ trucks', trailer: 'BBQ trailers' },
  snow_cone: { truck: 'Snow cone trucks', trailer: 'Snow cone trailers' },
  beverage: { truck: 'Beverage & bar trucks', trailer: 'Beverage & bar trailers' },
  mobile_kitchen: { truck: 'Mobile kitchen trucks', trailer: 'Kitchen trailers' },
};

/** Specialty search queries must never be treated as place names. */
export const SPECIALTY_SEARCH_QUERIES = new Set(
  (Object.keys(SPECIALTY_DEFS) as SpecialtyKey[]).map((k) => SPECIALTY_DEFS[k].searchQuery),
);

export const specialtyBrowseHref = (key: SpecialtyKey, vehicle: SpecialtyVehicle): string => {
  const def = SPECIALTY_DEFS[key];
  const category = vehicle === 'truck' ? 'food_truck' : 'food_trailer';
  return `/search?q=${encodeURIComponent(def.searchQuery)}&category=${category}&mode=sale`;
};

export const specialtyBrowseLinks = (key: SpecialtyKey): { label: string; href: string }[] => [
  { label: SPECIALTY_VEHICLE_LABELS[key].truck, href: specialtyBrowseHref(key, 'truck') },
  { label: SPECIALTY_VEHICLE_LABELS[key].trailer, href: specialtyBrowseHref(key, 'trailer') },
];

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
