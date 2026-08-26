import type { CategoryIndexConfig, CategoryIndexSection, CategoryKey, ModeFilter } from '@/pages/CategoryIndex';

// City/category landing pages — only created where Vendibook has active inventory
// or a meaningful market focus. Thin pages with no inventory will auto-noindex
// via CategoryIndex's empty-state logic.

type CityCatSpec = {
  citySlug: string;
  cityName: string;
  stateCode: string;
  category: CategoryKey;
  mode: ModeFilter;
};

const SPECS: CityCatSpec[] = [
  // Houston (food truck capital). NOTE: the rental city page lives at
  // /rent/food-trucks/houston-tx (CategoryCityPage, proven GSC traction) —
  // /houston/food-trucks-for-rent 301s there to avoid duplicate rent intent.
  { citySlug: 'houston', cityName: 'Houston', stateCode: 'TX', category: 'food_truck', mode: 'any' },
  { citySlug: 'houston', cityName: 'Houston', stateCode: 'TX', category: 'food_truck', mode: 'sale' },

  // Phoenix
  { citySlug: 'phoenix', cityName: 'Phoenix', stateCode: 'AZ', category: 'food_truck', mode: 'any' },

  // Tucson
  { citySlug: 'tucson', cityName: 'Tucson', stateCode: 'AZ', category: 'food_truck', mode: 'any' },

  // Portland (shared kitchens)
  { citySlug: 'portland', cityName: 'Portland', stateCode: 'OR', category: 'ghost_kitchen', mode: 'any' },

  // Atlanta
  { citySlug: 'atlanta', cityName: 'Atlanta', stateCode: 'GA', category: 'food_truck', mode: 'any' },

  // Tampa
  { citySlug: 'tampa', cityName: 'Tampa', stateCode: 'FL', category: 'food_truck', mode: 'any' },

  // Miami
  { citySlug: 'miami', cityName: 'Miami', stateCode: 'FL', category: 'food_truck', mode: 'any' },
];

const catLabelPlural = (c: CategoryKey): string =>
  c === 'food_truck' ? 'food trucks'
    : c === 'food_trailer' ? 'food trailers'
    : c === 'ghost_kitchen' ? 'shared commercial kitchens'
    : 'vendor spaces';

const catLabelTitle = (c: CategoryKey): string =>
  c === 'food_truck' ? 'Food Trucks'
    : c === 'food_trailer' ? 'Food Trailers'
    : c === 'ghost_kitchen' ? 'Shared Commercial Kitchens'
    : 'Vendor Spaces';

const catSlug = (c: CategoryKey): string =>
  c === 'food_truck' ? 'food-trucks'
    : c === 'food_trailer' ? 'food-trailers'
    : c === 'ghost_kitchen' ? 'shared-kitchens'
    : 'vendor-spaces';

const modeSuffix = (m: ModeFilter): string =>
  m === 'sale' ? '-for-sale' : m === 'rent' ? '-for-rent' : '';

const modeLabel = (m: ModeFilter): string =>
  m === 'sale' ? 'for Sale' : m === 'rent' ? 'for Rent' : 'for Sale & Rent';

const cityFaqs = (cityName: string, cat: CategoryKey) => {
  const plural = catLabelPlural(cat);
  return [
    {
      q: `How do I find ${plural} in ${cityName}?`,
      a: `Browse Vendibook listings filtered to ${cityName} on this page. Each listing shows photos, pricing, location, and contact details from a verified owner.`,
    },
    {
      q: `Can I rent ${plural} short-term in ${cityName}?`,
      a: `Yes. Many ${cityName} hosts offer daily, weekly, and monthly rentals through Vendibook. Filter by dates to confirm availability.`,
    },
    {
      q: `How much do ${plural} cost in ${cityName}?`,
      a: `Pricing varies by size, equipment, and condition. Use Vendibook's listings to compare current ${cityName} prices side by side. Use our pricing calculator and startup-costs tool for budget planning.`,
    },
    {
      q: `Do I need permits to operate in ${cityName}?`,
      a: `Yes — most cities require a mobile food vendor permit, health-department certification, and a commissary agreement. Vendibook's PermitPath tool walks through the steps for your city.`,
    },
    {
      q: `Can I list my ${cat === 'ghost_kitchen' ? 'commercial kitchen' : cat.replace('_', ' ')} on Vendibook?`,
      a: `Yes — listing is free. Add photos, price, and availability, and start receiving inquiries from ${cityName} operators within minutes.`,
    },
  ];
};

export const CITY_CATEGORY_CONFIGS: CategoryIndexConfig[] = SPECS.map((s) => {
  const plural = catLabelPlural(s.category);
  const pluralTitle = catLabelTitle(s.category);
  const path = `/${s.citySlug}/${catSlug(s.category)}${modeSuffix(s.mode)}`;
  const intentLabel = modeLabel(s.mode);

  // Related: other modes for same category, other city, related categories
  const otherModes = (['rent', 'sale'] as ModeFilter[])
    .filter((m) => m !== s.mode)
    .map((m) => ({
      href: `/${s.citySlug}/${catSlug(s.category)}${modeSuffix(m)}`,
      label: `${pluralTitle} ${modeLabel(m)} in ${s.cityName}`,
    }));

  const otherCategories: { href: string; label: string }[] = (
    ['food_truck', 'food_trailer', 'ghost_kitchen'] as CategoryKey[]
  )
    .filter((c) => c !== s.category)
    .map((c) => ({
      href: `/${s.citySlug}/${catSlug(c)}`,
      label: `${catLabelTitle(c)} in ${s.cityName}`,
    }));

  return {
    path,
    category: s.category,
    mode: s.mode,
    city: { name: s.cityName, stateCode: s.stateCode },
    h1: `${pluralTitle} ${intentLabel} in ${s.cityName}, ${s.stateCode}`,
    title: `${pluralTitle} ${intentLabel} in ${s.cityName}, ${s.stateCode} | Vendibook`,
    description: `Browse ${plural} ${intentLabel.toLowerCase()} in ${s.cityName}, ${s.stateCode} on Vendibook. Verified local listings with photos, pricing, and direct contact with owners.`,
    intro: `Find ${plural} ${intentLabel.toLowerCase()} across ${s.cityName} and the surrounding metro. Each Vendibook listing includes full photos, transparent pricing, location details, and direct messaging with the owner — so you can compare options and move quickly.`,
    faqs: cityFaqs(s.cityName, s.category),
    related: [
      ...otherModes,
      ...otherCategories,
      { href: `/${catSlug(s.category)}${modeSuffix(s.mode)}`, label: `All ${pluralTitle.toLowerCase()} ${intentLabel.toLowerCase()}` },
      { href: `/${s.citySlug}`, label: `${s.cityName} marketplace overview` },
    ],
  };
});

// Flat-URL variants for high-intent commercial keywords surfaced in Search Console
// (e.g. "food trucks for sale houston"). Pattern: /food-trucks-for-sale-{city}.
// These render the same CategoryIndex grid as /{city}/food-trucks-for-sale but
// publish their own canonical so Google can match the exact-match query.
type FlatSpec = CityCatSpec & { path: string };

const FLAT_SPECS: FlatSpec[] = [
  { path: '/food-trucks-for-sale-houston',   citySlug: 'houston',  cityName: 'Houston',  stateCode: 'TX', category: 'food_truck',   mode: 'sale' },
  { path: '/food-trucks-for-sale-phoenix',   citySlug: 'phoenix',  cityName: 'Phoenix',  stateCode: 'AZ', category: 'food_truck',   mode: 'sale' },
  { path: '/food-trucks-for-sale-tucson',    citySlug: 'tucson',   cityName: 'Tucson',   stateCode: 'AZ', category: 'food_truck',   mode: 'sale' },
  { path: '/food-trucks-for-sale-atlanta',   citySlug: 'atlanta',  cityName: 'Atlanta',  stateCode: 'GA', category: 'food_truck',   mode: 'sale' },
  { path: '/food-trucks-for-sale-portland',  citySlug: 'portland', cityName: 'Portland', stateCode: 'OR', category: 'food_truck',   mode: 'sale' },
  { path: '/food-trailers-for-sale-houston', citySlug: 'houston',  cityName: 'Houston',  stateCode: 'TX', category: 'food_trailer', mode: 'sale' },
];

CITY_CATEGORY_CONFIGS.push(
  ...FLAT_SPECS.map((s): CategoryIndexConfig => {
    const plural = catLabelPlural(s.category);
    const pluralTitle = catLabelTitle(s.category);
    const intentLabel = modeLabel(s.mode);
    return {
      path: s.path,
      category: s.category,
      mode: s.mode,
      city: { name: s.cityName, stateCode: s.stateCode },
      h1: `${pluralTitle} ${intentLabel} in ${s.cityName}, ${s.stateCode}`,
      title: `${pluralTitle} ${intentLabel} in ${s.cityName}, ${s.stateCode} | Vendibook`,
      description: `Browse verified ${plural} ${intentLabel.toLowerCase()} in ${s.cityName}, ${s.stateCode}. Direct contact with owners, transparent pricing, and a secure checkout — without the spam of Facebook Marketplace.`,
      intro: `Looking for ${plural} ${intentLabel.toLowerCase()} in ${s.cityName}? Vendibook is the dedicated marketplace for mobile food assets — every listing is owner-managed, with full specs, photos, and a clean inquiry flow. No tire-kickers, no scams, no losing your listing in a Marketplace feed.`,
      faqs: cityFaqs(s.cityName, s.category),
      related: [
        { href: `/${s.citySlug}/${catSlug(s.category)}${modeSuffix(s.mode)}`, label: `${pluralTitle} ${intentLabel} in ${s.cityName} (alt URL)` },
        { href: `/${s.citySlug}/${catSlug(s.category)}${modeSuffix('rent')}`, label: `${pluralTitle} for Rent in ${s.cityName}` },
        { href: `/${catSlug(s.category)}${modeSuffix(s.mode)}`, label: `All ${pluralTitle.toLowerCase()} ${intentLabel.toLowerCase()}` },
        { href: '/sell-my-food-truck', label: `Sell your ${s.category === 'food_trailer' ? 'food trailer' : 'food truck'}` },
        { href: `/${s.citySlug}`, label: `${s.cityName} marketplace overview` },
      ],
    };
  })
);

// ============================================================================
// /food-trucks-for-sale/<city-state> and /food-trailers-for-sale/<city-state>
// City SEO pages with smart fallback (city → state → nationwide) handled by
// CategoryIndex. These URLs target the exact-match query patterns surfaced in
// Search Console (e.g. "food trucks for sale tucson az").
// ============================================================================
type CitySaleSpec = {
  citySlug: string;
  cityName: string;
  stateCode: string;
  stateName: string;
  category: CategoryKey;
};

const CITY_SALE_SPECS: CitySaleSpec[] = [
  { citySlug: 'tucson-az',       cityName: 'Tucson',       stateCode: 'AZ', stateName: 'Arizona',       category: 'food_truck' },
  { citySlug: 'phoenix-az',      cityName: 'Phoenix',      stateCode: 'AZ', stateName: 'Arizona',       category: 'food_truck' },
  { citySlug: 'houston-tx',      cityName: 'Houston',      stateCode: 'TX', stateName: 'Texas',         category: 'food_truck' },
  { citySlug: 'austin-tx',       cityName: 'Austin',       stateCode: 'TX', stateName: 'Texas',         category: 'food_truck' },
  { citySlug: 'dallas-tx',       cityName: 'Dallas',       stateCode: 'TX', stateName: 'Texas',         category: 'food_truck' },
  { citySlug: 'san-antonio-tx',  cityName: 'San Antonio',  stateCode: 'TX', stateName: 'Texas',         category: 'food_truck' },
  { citySlug: 'atlanta-ga',      cityName: 'Atlanta',      stateCode: 'GA', stateName: 'Georgia',       category: 'food_truck' },
  { citySlug: 'miami-fl',        cityName: 'Miami',        stateCode: 'FL', stateName: 'Florida',       category: 'food_truck' },
  { citySlug: 'tampa-fl',        cityName: 'Tampa',        stateCode: 'FL', stateName: 'Florida',       category: 'food_truck' },
  { citySlug: 'charlotte-nc',    cityName: 'Charlotte',    stateCode: 'NC', stateName: 'North Carolina',category: 'food_truck' },
  { citySlug: 'portland-or',     cityName: 'Portland',     stateCode: 'OR', stateName: 'Oregon',        category: 'food_truck' },
  { citySlug: 'los-angeles-ca',  cityName: 'Los Angeles',  stateCode: 'CA', stateName: 'California',    category: 'food_truck' },
  // Trailer-specific city pages
  { citySlug: 'tucson-az',       cityName: 'Tucson',       stateCode: 'AZ', stateName: 'Arizona',       category: 'food_trailer' },
  { citySlug: 'phoenix-az',      cityName: 'Phoenix',      stateCode: 'AZ', stateName: 'Arizona',       category: 'food_trailer' },
  { citySlug: 'houston-tx',      cityName: 'Houston',      stateCode: 'TX', stateName: 'Texas',         category: 'food_trailer' },
  { citySlug: 'mesa-az',         cityName: 'Mesa',         stateCode: 'AZ', stateName: 'Arizona',       category: 'food_trailer' },
];

const citySaleSlug = (c: CategoryKey): string =>
  c === 'food_trailer' ? 'food-trailers-for-sale' : 'food-trucks-for-sale';

const citySaleLabel = (c: CategoryKey): string =>
  c === 'food_trailer' ? 'Food Trailers' : 'Food Trucks';

const citySaleFaqs = (cityName: string, stateName: string, cat: CategoryKey) => {
  const plural = catLabelPlural(cat);
  return [
    {
      q: `Where can I find ${plural} for sale in ${cityName}?`,
      a: `Vendibook lists ${plural} for sale across ${cityName} and surrounding ${stateName}. When local inventory is limited, the page also surfaces nearby ${stateName} listings and nationwide options so you can compare.`,
    },
    {
      q: `How much do ${plural} cost in ${cityName}?`,
      a: `Pricing varies based on size, equipment, age, and condition. Use Vendibook's listings to compare current asking prices in ${cityName} and across ${stateName}.`,
    },
    {
      q: `Can I make an offer on a ${cat === 'food_trailer' ? 'food trailer' : 'food truck'} in ${cityName}?`,
      a: `Yes. Most sellers accept offers through Vendibook — you can negotiate directly with the owner inside the platform.`,
    },
    {
      q: `Do I need permits to operate in ${cityName}?`,
      a: `Yes. Most cities require a mobile food vendor permit, health-department certification, and a commissary agreement. Vendibook's PermitPath tool can help you find the rules for your city.`,
    },
    {
      q: `Can I list my ${cat === 'food_trailer' ? 'food trailer' : 'food truck'} for sale in ${cityName}?`,
      a: `Yes — listing on Vendibook is free. Add photos, price, equipment, and availability, then receive offers and messages from buyers in ${cityName} and beyond.`,
    },
  ];
};

CITY_CATEGORY_CONFIGS.push(
  ...CITY_SALE_SPECS.map((s): CategoryIndexConfig => {
    const plural = catLabelPlural(s.category);
    const pluralTitle = citySaleLabel(s.category);
    const path = `/${citySaleSlug(s.category)}/${s.citySlug}`;
    return {
      path,
      category: s.category,
      mode: 'sale',
      city: { name: s.cityName, stateCode: s.stateCode },
      h1: `${pluralTitle} for Sale in ${s.cityName}, ${s.stateCode}`,
      title: `${pluralTitle} for Sale in ${s.cityName}, ${s.stateCode} | Vendibook`,
      description: `Browse ${plural} for sale in ${s.cityName}, ${s.stateCode}. Compare local listings with photos, equipment specs, and pricing. Vendibook also surfaces nearby ${s.stateName} options when local inventory is limited.`,
      intro: `Browse ${plural} for sale in ${s.cityName}, ${s.stateName}. If local inventory is limited, Vendibook also shows relevant ${pluralTitle.toLowerCase()} across ${s.stateName} and nationwide so buyers can compare more options. Each listing is owner-managed with photos, equipment specs, and direct messaging.`,
      faqs: citySaleFaqs(s.cityName, s.stateName, s.category),
      related: [
        { href: `/${citySaleSlug(s.category)}`, label: `All ${pluralTitle.toLowerCase()} for sale` },
        { href: `/${citySaleSlug(s.category)}/${slugify(s.stateName)}`, label: `${pluralTitle} for sale in ${s.stateName}` },
        { href: s.category === 'food_trailer' ? '/sell-food-trailer' : '/sell-my-food-truck', label: `Sell your ${s.category === 'food_trailer' ? 'food trailer' : 'food truck'}` },
        { href: `/${citySaleSlug(s.category === 'food_trailer' ? 'food_truck' : 'food_trailer')}/${s.citySlug}`, label: `${s.category === 'food_trailer' ? 'Food trucks' : 'Food trailers'} for sale in ${s.cityName}` },
      ],
    };
  })
);

// ============================================================================
// /food-trucks-for-sale/<state-name> and /food-trailers-for-sale/<state-name>
// State-level SEO pages with state→nationwide fallback. Trucks and trailers are
// separate pages because Semrush shows materially different demand/difficulty
// by asset type (e.g. "food trailers for sale in Texas" KD 1 vs trucks KD 12).
// Tier 1 (TX, AZ, GA, MI, OH, FL): existing GSC visibility + low KD + demand.
// ============================================================================
type StateSaleSpec = {
  stateName: string;
  stateCode: string;
  category: CategoryKey;
  /** Existing city pages this state should prominently link to. */
  metros?: { slug: string; name: string }[];
};

const STATE_SALE_SPECS: StateSaleSpec[] = [
  // ---- Tier 1 trucks ----
  {
    stateName: 'Texas', stateCode: 'TX', category: 'food_truck',
    metros: [
      { slug: 'houston-tx', name: 'Houston' },
      { slug: 'dallas-tx', name: 'Dallas' },
      { slug: 'austin-tx', name: 'Austin' },
      { slug: 'san-antonio-tx', name: 'San Antonio' },
    ],
  },
  {
    stateName: 'Arizona', stateCode: 'AZ', category: 'food_truck',
    metros: [
      { slug: 'phoenix-az', name: 'Phoenix' },
      { slug: 'tucson-az', name: 'Tucson' },
    ],
  },
  {
    stateName: 'Georgia', stateCode: 'GA', category: 'food_truck',
    metros: [{ slug: 'atlanta-ga', name: 'Atlanta' }],
  },
  { stateName: 'Michigan', stateCode: 'MI', category: 'food_truck' },
  { stateName: 'Ohio', stateCode: 'OH', category: 'food_truck' },
  {
    stateName: 'Florida', stateCode: 'FL', category: 'food_truck',
    metros: [
      { slug: 'miami-fl', name: 'Miami' },
      { slug: 'tampa-fl', name: 'Tampa' },
    ],
  },
  // ---- Tier 1 trailers (KD 1–5 cluster; real inventory exists in each state) ----
  {
    stateName: 'Texas', stateCode: 'TX', category: 'food_trailer',
    metros: [{ slug: 'houston-tx', name: 'Houston' }],
  },
  { stateName: 'Georgia', stateCode: 'GA', category: 'food_trailer' },
  { stateName: 'Florida', stateCode: 'FL', category: 'food_trailer' },
  { stateName: 'Michigan', stateCode: 'MI', category: 'food_trailer' },
  { stateName: 'Ohio', stateCode: 'OH', category: 'food_trailer' },
  { stateName: 'Arizona', stateCode: 'AZ', category: 'food_trailer' },
  // ---- Tier 2 trucks (already live — keep, no expansion) ----
  { stateName: 'North Carolina', stateCode: 'NC', category: 'food_truck' },
  { stateName: 'Oregon', stateCode: 'OR', category: 'food_truck' },
  { stateName: 'California', stateCode: 'CA', category: 'food_truck' },
];

// Per-state, per-category content overrides keyed by `${stateSlug}:${category}`.
// Texas gets the richest copy: Search Console shows high impressions but low
// CTR for "food truck for sale in texas", so the snippet and body name real
// inventory corridors, owner-listed positioning, and the 2026 statewide
// licensing change buyers are researching.
const STATE_CONTENT_OVERRIDES: Record<string, {
  title?: string;
  description?: string;
  introExtra?: string;
  sections?: CategoryIndexSection[];
  extraFaqs?: { q: string; a: string }[];
  extraRelated?: { href: string; label: string }[];
}> = {
  'texas:food_truck': {
    title: 'Food Trucks for Sale in Texas | Used & Owner-Listed | Vendibook',
    description: 'Used food trucks for sale in Texas — Houston, DFW, Austin & San Antonio. Real photos, equipment specs, and asking prices from owners. Message sellers direct, financing & delivery available.',
    introExtra: 'Texas is one of the strongest mobile food markets in the country, and buyers here typically shop the Houston, Dallas–Fort Worth, Austin, and San Antonio corridors. It is also getting easier to operate statewide: as of July 1, 2026, Texas mobile food vendors move to a single statewide DSHS license, replacing the patchwork of county-by-county permits — so a truck bought in one metro can trade across the state with far less paperwork.',
    sections: [
      {
        heading: 'Buying a food truck in Texas',
        paragraphs: [
          'Most Texas buyers compare asking price against equipment package first — a well-maintained truck with a working generator, refrigeration, and a compliant hood system is worth more than a newer shell that needs a build-out. On Vendibook you can message the seller directly to ask for service records, inspection history, and equipment lists before you drive out to see a truck.',
          'If the right truck is not in your metro, Vendibook surfaces statewide and nationwide options below the local inventory, and freight delivery is available on many purchases.',
        ],
      },
      {
        heading: 'Texas permits, licensing, and local rules',
        paragraphs: [
          'Before you buy, check what your city and county require for commissary agreements, fire suppression inspections, and mobile vending zones — those rules decide whether a specific truck can start earning right away or needs work first. PermitPath builds a checklist for your Texas city, and the Regulations Hub covers the statewide license change and health-department basics.',
        ],
        links: [
          { href: '/tools/permitpath', label: 'Texas permit checklist (PermitPath)' },
          { href: '/tools/regulations-hub', label: 'Mobile food regulations hub' },
          { href: '/blog/texas-mobile-food-vendor-law-2026', label: 'Texas 2026 statewide license explained' },
        ],
      },
      {
        heading: 'Financing a food truck in Texas',
        paragraphs: [
          'Qualified Texas buyers can explore equipment financing on eligible listings instead of paying the full asking price up front. Financing availability, terms, and approval are determined by the financing partner — check any listing for the financing option or start with our financing overview.',
        ],
        links: [
          { href: '/financing', label: 'Explore food truck financing' },
          { href: '/ship-your-food-truck', label: 'Freight delivery for purchases' },
          { href: '/food-truck-prices', label: 'What food trucks actually sell for' },
        ],
      },
    ],
    extraFaqs: [
      {
        q: 'What changed for Texas food truck permits in 2026?',
        a: 'Starting July 1, 2026, Texas mobile food vendors operate under a statewide DSHS license instead of separate county permits. That makes buying a truck anywhere in Texas more flexible, since you are no longer tied to one county\'s rules.',
      },
    ],
    extraRelated: [
      { href: '/blog/texas-mobile-food-vendor-law-2026', label: 'Texas 2026 mobile food vendor law explained' },
      { href: '/financing', label: 'Financing options' },
    ],
  },
  'texas:food_trailer': {
    title: 'Food Trailers for Sale in Texas | Used & Owner-Listed | Vendibook',
    description: 'Food trailers for sale in Texas: owner-listed concession and mobile kitchen trailers in Houston, DFW, Austin & San Antonio. Compare prices, sizes, and specs — financing available.',
    introExtra: 'Texas is one of Vendibook\'s deepest food trailer markets — concession and mobile kitchen trailers list here more often than anywhere else in the country. Buyers typically compare the Houston, Dallas–Fort Worth, Austin, and San Antonio corridors, where everything from compact coffee trailers to full 24-foot kitchens turns over regularly.',
    extraRelated: [
      { href: '/food-trailers-for-sale/houston-tx', label: 'Food trailers for sale in Houston' },
      { href: '/financing', label: 'Financing options' },
    ],
  },
  'arizona:food_truck': {
    title: 'Food Trucks for Sale in Arizona | Used & Owner-Listed | Vendibook',
    description: 'Food trucks for sale in Arizona: owner-listed trucks in Phoenix, Tucson & beyond with real photos, specs, and asking prices. Message sellers directly — financing available.',
    introExtra: 'Arizona\'s year-round operating season — plus a packed calendar of festivals, spring training, and winter-visitor events — makes it one of the few states where a truck can trade twelve months a year. Most inventory concentrates in the Phoenix metro, with Tucson as a strong secondary market.',
    extraRelated: [
      { href: '/financing', label: 'Financing options' },
    ],
  },
  'arizona:food_trailer': {
    title: 'Food Trailers for Sale in Arizona | Used & Owner-Listed | Vendibook',
    description: 'Food trailers for sale in Arizona: owner-listed concession and mobile kitchen trailers in Phoenix, Tucson, and statewide. Compare prices and specs — financing available.',
    introExtra: 'Arizona\'s event circuit — festivals, spring training, and a long winter-visitor season — suits trailer operators who want lower upfront cost than a self-propelled truck. Most Arizona trailer inventory lists out of the Phoenix metro and Tucson.',
    extraRelated: [
      { href: '/financing', label: 'Financing options' },
    ],
  },
  'georgia:food_truck': {
    title: 'Food Trucks for Sale in Georgia | Used & Owner-Listed | Vendibook',
    description: 'Food trucks for sale in Georgia: owner-listed trucks in Atlanta and statewide with real photos, specs, and asking prices. Message sellers directly — financing available.',
    introExtra: 'Georgia\'s mobile food market centers on metro Atlanta — one of the busiest food truck scenes in the Southeast, with year-round festivals, brewery events, and corporate catering demand. Inventory turns over regularly as operators upgrade or exit, which keeps used truck pricing competitive for buyers.',
    extraRelated: [
      { href: '/financing', label: 'Financing options' },
    ],
  },
  'georgia:food_trailer': {
    title: 'Food Trailers for Sale in Georgia | Used & Owner-Listed | Vendibook',
    description: 'Food trailers for sale in Georgia: owner-listed concession and mobile kitchen trailers in Atlanta and statewide. Compare prices, sizes, and specs — financing available.',
    introExtra: 'Georgia is one of Vendibook\'s most active trailer markets — concession trailers list frequently out of the Atlanta metro, where festival, brewery, and catering demand keeps the asset type moving. Trailers are a popular entry point here because they cost less than a self-propelled truck and tow easily between events.',
    extraRelated: [
      { href: '/financing', label: 'Financing options' },
    ],
  },
  'michigan:food_truck': {
    title: 'Food Trucks for Sale in Michigan | Used & Owner-Listed | Vendibook',
    description: 'Food trucks for sale in Michigan: owner-listed trucks in Detroit, Grand Rapids, Ann Arbor & beyond. Compare photos, specs, and prices — message sellers directly.',
    introExtra: 'Michigan\'s season runs roughly May through October, built around festivals, fairs, and lakefront events — which means used trucks often list in late fall and early spring as operators reset for the season. Buyers shopping off-season frequently find better pricing than at the spring peak.',
    extraRelated: [
      { href: '/financing', label: 'Financing options' },
    ],
  },
  'michigan:food_trailer': {
    title: 'Food Trailers for Sale in Michigan | Used & Owner-Listed | Vendibook',
    description: 'Food trailers for sale in Michigan: owner-listed concession and mobile kitchen trailers across Detroit, Grand Rapids, and statewide. Compare prices and specs — financing available.',
    introExtra: 'Trailers are a natural fit for Michigan\'s fair and festival circuit — lower upfront cost than a truck, easy to tow between summer events, and simple to store over the winter off-season. Inventory concentrates around Detroit and Grand Rapids, with statewide and nationwide options shown below when local listings are limited.',
    extraRelated: [
      { href: '/financing', label: 'Financing options' },
    ],
  },
  'ohio:food_truck': {
    title: 'Food Trucks for Sale in Ohio | Used & Owner-Listed | Vendibook',
    description: 'Food trucks for sale in Ohio: owner-listed trucks in Columbus, Cleveland, Cincinnati & beyond. Compare photos, specs, and prices — message sellers directly.',
    introExtra: 'Ohio buyers benefit from three major metros within a few hours of each other — Columbus, Cleveland, and Cincinnati — plus one of the strongest county-fair circuits in the Midwest. That density means more used inventory within driving distance and more events to book once you own the truck.',
    extraRelated: [
      { href: '/financing', label: 'Financing options' },
    ],
  },
  'ohio:food_trailer': {
    title: 'Food Trailers for Sale in Ohio | Used & Owner-Listed | Vendibook',
    description: 'Food trailers for sale in Ohio: owner-listed concession and mobile kitchen trailers in Columbus, Cleveland, Cincinnati, and statewide. Compare prices and specs — financing available.',
    introExtra: 'Ohio\'s county-fair and festival circuit makes concession trailers a workhorse asset — lower cost than a self-propelled truck and easy to move between Columbus, Cleveland, and Cincinnati events. When Ohio inventory is limited, this page also surfaces nationwide trailers so you can compare more options.',
    extraRelated: [
      { href: '/financing', label: 'Financing options' },
    ],
  },
  'florida:food_truck': {
    title: 'Food Trucks for Sale in Florida | Used & Owner-Listed | Vendibook',
    description: 'Food trucks for sale in Florida: owner-listed trucks in Miami, Tampa, Orlando & beyond with real photos, specs, and asking prices. Message sellers directly — financing available.',
    introExtra: 'Florida\'s year-round season and event calendar — beach markets, festivals, and tourism corridors — make it one of the strongest states to operate a food truck. Most Florida inventory on Vendibook lists out of Miami and Tampa, with Orlando and Jacksonville as active secondary markets.',
    extraRelated: [
      { href: '/financing', label: 'Financing options' },
    ],
  },
  'florida:food_trailer': {
    title: 'Food Trailers for Sale in Florida | Used & Owner-Listed | Vendibook',
    description: 'Food trailers for sale in Florida: owner-listed concession and mobile kitchen trailers in Miami, Tampa, Orlando, and statewide. Compare prices and specs — financing available.',
    introExtra: 'Florida\'s year-round event calendar suits trailer operators — concession and mobile kitchen trailers serve beach markets, festivals, and tourism corridors without the upfront cost of a self-propelled truck. Most Florida trailer inventory lists out of Miami and Tampa.',
    extraRelated: [
      { href: '/financing', label: 'Financing options' },
    ],
  },
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const stateSaleFaqs = (stateName: string, cat: CategoryKey) => {
  const plural = catLabelPlural(cat);
  return [
    {
      q: `Where can I find ${plural} for sale in ${stateName}?`,
      a: `Vendibook lists ${plural} for sale across major ${stateName} cities and small towns alike. Use this page to browse statewide inventory, with nationwide fallback when local listings are limited.`,
    },
    {
      q: `How much do ${plural} cost in ${stateName}?`,
      a: `Prices vary widely by size, equipment, age, and condition. Use Vendibook's listings to compare current asking prices across ${stateName}.`,
    },
    {
      q: `Can I sell a ${cat === 'food_trailer' ? 'food trailer' : 'food truck'} in ${stateName} on Vendibook?`,
      a: `Yes — listing on Vendibook is free for ${stateName} owners. Reach buyers actively searching in your city and across the state.`,
    },
    {
      q: `Does Vendibook help match ${stateName} listings with buyers?`,
      a: `Vendibook may help match strong listings with interested buyers through search, social outreach, and direct buyer inquiries. Strong photos, accurate specs, and fair pricing remain the biggest drivers of inquiries.`,
    },
  ];
};

// State slugs that have BOTH a truck and a trailer page (safe cross-links).
const TRAILER_STATE_SLUGS = new Set(['texas', 'georgia', 'florida', 'michigan', 'ohio', 'arizona']);

CITY_CATEGORY_CONFIGS.push(
  ...STATE_SALE_SPECS.map((s): CategoryIndexConfig => {
    const plural = catLabelPlural(s.category);
    const pluralTitle = citySaleLabel(s.category);
    const stateSlug = slugify(s.stateName);
    const path = `/${citySaleSlug(s.category)}/${stateSlug}`;
    const override = STATE_CONTENT_OVERRIDES[`${stateSlug}:${s.category}`];
    const counterpartExists = s.category === 'food_truck'
      ? TRAILER_STATE_SLUGS.has(stateSlug)
      : true; // every trailer state also has a truck page
    const metroSection: CategoryIndexSection[] = s.metros?.length
      ? [{
          heading: `Browse ${plural} for sale across ${s.stateName}`,
          paragraphs: [
            `${s.stateName} inventory on Vendibook is organized by market. Browse the ${s.stateName} metros below for city-level listings, or compare statewide inventory on this page — with nationwide options shown automatically when local supply is limited.`,
          ],
          links: s.metros.map((m) => ({
            href: `/${citySaleSlug(s.category)}/${m.slug}`,
            label: `${pluralTitle} for sale in ${m.name}`,
          })),
        }]
      : [];
    return {
      path,
      category: s.category,
      mode: 'sale',
      state: { name: s.stateName, code: s.stateCode },
      h1: `${pluralTitle} for Sale in ${s.stateName}`,
      title: override?.title ?? `${pluralTitle} for Sale in ${s.stateName} | Vendibook`,
      description: override?.description ?? `Browse ${plural} for sale across ${s.stateName} on Vendibook. Owner-listed inventory with photos and specs, with nationwide options when local listings are limited.`,
      intro: `Browse ${plural} for sale across ${s.stateName}, listed by independent sellers. Each listing includes photos, equipment specs, and direct messaging with the owner. When statewide inventory is limited, Vendibook also surfaces nationwide listings so you can compare more options.${override?.introExtra ? ` ${override.introExtra}` : ''}`,
      sections: [...metroSection, ...(override?.sections ?? [])],
      faqs: [...stateSaleFaqs(s.stateName, s.category), ...(override?.extraFaqs ?? [])],
      related: [
        { href: `/${citySaleSlug(s.category)}`, label: `All ${pluralTitle.toLowerCase()} for sale` },
        { href: s.category === 'food_trailer' ? '/sell-food-trailer' : '/sell-my-food-truck', label: `Sell your ${s.category === 'food_trailer' ? 'food trailer' : 'food truck'} in ${s.stateName}` },
        ...(counterpartExists
          ? [{ href: `/${citySaleSlug(s.category === 'food_trailer' ? 'food_truck' : 'food_trailer')}/${stateSlug}`, label: `${s.category === 'food_trailer' ? 'Food trucks' : 'Food trailers'} for sale in ${s.stateName}` }]
          : []),
        ...(override?.extraRelated ?? []),
      ],
    };
  })
);

// ============================================================================
// /food-trucks-for-rent/<state-name>  state-level RENTAL pages (hub-and-spoke).
// Created only where Search Console shows Google already testing our rental
// pages (TX: Houston pos ~10, FL: Miami pos ~4-9, CA: LA pos ~3-15).
// Dual-category (trucks + trailers) like the national rental hub.
// ============================================================================
type StateRentSpec = {
  stateName: string;
  stateCode: string;
  metros: { slug: string; name: string }[];
  context: string;
};

const STATE_RENT_SPECS: StateRentSpec[] = [
  {
    stateName: 'Texas',
    stateCode: 'TX',
    metros: [
      { slug: 'houston-tx', name: 'Houston' },
      { slug: 'dallas-tx', name: 'Dallas' },
      { slug: 'austin-tx', name: 'Austin' },
      { slug: 'san-antonio-tx', name: 'San Antonio' },
    ],
    context:
      'Texas is one of the strongest mobile food markets in the country, and rental demand concentrates in the Houston, Dallas–Fort Worth, Austin, and San Antonio corridors. As of July 1, 2026, Texas mobile food vendors operate under a single statewide DSHS license instead of county-by-county permits — so equipment rented in one Texas metro can trade across the state with far less paperwork.',
  },
  {
    stateName: 'Florida',
    stateCode: 'FL',
    metros: [
      { slug: 'miami-fl', name: 'Miami' },
      { slug: 'tampa-fl', name: 'Tampa' },
    ],
    context:
      'Florida\'s year-round event and tourism calendar makes it a natural market for renting a food truck or trailer — operators commonly rent equipment for seasonal peaks, festivals, and beach-market pop-ups before committing to a purchase. Miami and Tampa are the state\'s most active rental corridors on Vendibook.',
  },
  {
    stateName: 'California',
    stateCode: 'CA',
    metros: [{ slug: 'los-angeles-ca', name: 'Los Angeles' }],
    context:
      'California is the birthplace of modern food truck culture, and Los Angeles is one of Vendibook\'s most active rental markets. Operators rent trucks and trailers to test concepts, cover events, and run monthly arrangements while permanent builds are completed. California operators should confirm county health permits and commissary agreements before booking.',
  },
];

const stateRentFaqs = (stateName: string) => [
  {
    q: `Can I rent a food truck in ${stateName} for my business?`,
    a: `Yes. Vendibook lists owner-managed food trucks and food trailers for rent across ${stateName}. Browse available equipment on this page, compare rates and terms, and book directly with the owner for your own business use.`,
  },
  {
    q: `Can I rent a food truck monthly in ${stateName}?`,
    a: `Often, yes. Rental terms are set by each owner, and many ${stateName} listings offer weekly and monthly arrangements alongside daily rates. Review the terms on the individual listing or message the owner to discuss a monthly rental.`,
  },
  {
    q: `How much does it cost to rent a food truck in ${stateName}?`,
    a: `Cost depends on the vehicle or trailer type, location within ${stateName}, rental term, equipment, and condition. Each listing shows the owner's current rates so you can compare real options side by side.`,
  },
  {
    q: `Do I need permits to operate a rented food truck in ${stateName}?`,
    a: `Yes — operating permits are tied to you as the operator, not to the equipment. Most ${stateName} operators need a mobile food vendor permit, health-department certification, and a commissary agreement. Vendibook's PermitPath tool walks through the steps for your city.`,
  },
  {
    q: `Can I list my food truck for rent in ${stateName}?`,
    a: `Yes — listing on Vendibook is free. Add photos, your daily/weekly/monthly rates, and availability, and receive booking requests from ${stateName} operators.`,
  },
];

CITY_CATEGORY_CONFIGS.push(
  ...STATE_RENT_SPECS.map((s): CategoryIndexConfig => ({
    path: `/food-trucks-for-rent/${slugify(s.stateName)}`,
    category: 'food_truck',
    categories: ['food_truck', 'food_trailer'],
    mode: 'rent',
    state: { name: s.stateName, code: s.stateCode },
    h1: `Food Trucks & Food Trailers for Rent in ${s.stateName}`,
    title: `Food Trucks & Food Trailers for Rent in ${s.stateName} | Vendibook`,
    description: `Browse food trucks and food trailers for rent in ${s.stateName}. Compare available rental listings, rates, equipment, and monthly terms from owners on Vendibook.`,
    intro: `Find food trucks and food trailers available to rent across ${s.stateName} for business use — short-term, monthly, and long-term rentals listed directly by owners. ${s.context} When statewide inventory is limited, this page also surfaces nationwide rental listings so you can compare more options.`,
    clarification:
      'This is equipment rental: you rent the truck or trailer and operate it yourself for your own food business. Rental terms are set by each owner and shown on the listing.',
    sections: [
      {
        heading: `Rent by metro in ${s.stateName}`,
        paragraphs: [
          `Rental inventory on Vendibook is organized by market. Browse the ${s.stateName} metros below for city-level availability, or search statewide listings on this page.`,
        ],
        links: s.metros.flatMap((m) => [
          { href: `/rent/food-trucks/${m.slug}`, label: `Food trucks for rent in ${m.name}` },
          { href: `/rent/food-trailers/${m.slug}`, label: `Food trailers for rent in ${m.name}` },
        ]),
      },
      {
        heading: 'Should you rent or buy?',
        paragraphs: [
          `Renting fits operators testing a concept, covering a seasonal rush, or reducing upfront investment. Buying fits long-term operators who want to customize equipment and build equity in the asset. Many ${s.stateName} operators rent first and buy once the concept is proven.`,
        ],
        links: [
          { href: `/food-trucks-for-sale/${slugify(s.stateName)}`, label: `Food trucks for sale in ${s.stateName}` },
          { href: '/financing', label: 'Explore financing options' },
        ],
      },
    ],
    faqs: stateRentFaqs(s.stateName),
    related: [
      { href: '/food-trucks-for-rent', label: 'All food trucks for rent' },
      { href: '/food-trailers-for-rent', label: 'Food trailers for rent' },
      ...s.metros.map((m) => ({ href: `/rent/food-trucks/${m.slug}`, label: `Rentals in ${m.name}` })),
      { href: '/rent-out-my-food-truck', label: 'Rent out your food truck' },
    ],
  }))
);

// ============================================================================
// Trailer-specific RENTAL spokes. Created only where real rental inventory
// exists, so the page is never a thin/empty doorway. Tennessee is live because
// Vendibook carries owner-listed monthly trailer rental inventory in the
// Nashville / Spring Hill corridor.
//   /food-trailers-for-rent/tennessee   → state spoke of /food-trailers-for-rent
//   /food-trailers-for-rent/spring-hill-tn → exact-match local page
// ============================================================================
type TrailerRentSpec = {
  stateName: string;
  stateCode: string;
  city?: { name: string; slug: string };
  context: string;
};

const TRAILER_RENT_SPECS: TrailerRentSpec[] = [
  {
    stateName: 'Tennessee',
    stateCode: 'TN',
    context:
      'Tennessee rental demand concentrates in the Nashville metro and the fast-growing Williamson and Maury County corridor south of the city, where operators lease trailers monthly for markets, breweries, and event calendars.',
  },
  {
    stateName: 'Tennessee',
    stateCode: 'TN',
    city: { name: 'Spring Hill', slug: 'spring-hill-tn' },
    context:
      'Spring Hill sits in the Nashville–Columbia corridor, where monthly food trailer leases are a practical way to start operating without buying equipment outright.',
  },
];

const trailerRentFaqs = (place: string) => [
  {
    q: `Can I rent a food trailer in ${place}?`,
    a: `Yes. Vendibook lists owner-managed food trailers for rent in and around ${place}. Compare the listings on this page, review the owner's rates and terms, and book directly through Vendibook.`,
  },
  {
    q: `Can I lease a food trailer monthly in ${place}?`,
    a: `Often, yes. Monthly leases are common for trailers — the term and rate are set by each owner and shown on the listing, so check the individual listing or message the owner.`,
  },
  {
    q: `How much does it cost to rent a food trailer in ${place}?`,
    a: `Cost depends on trailer size, equipment, condition, and rental term. Each Vendibook listing shows the owner's current rate so you can compare real options rather than averages.`,
  },
  {
    q: `Do I need permits to operate a rented food trailer in ${place}?`,
    a: `Yes — permits follow you as the operator, not the equipment. Most operators need a mobile food vendor permit, health-department certification, and a commissary agreement. Vendibook's PermitPath tool walks through the steps for your city.`,
  },
  {
    q: `Can I list my food trailer for rent in ${place}?`,
    a: `Yes — listing on Vendibook is free. Add photos, your rates, and availability, and start receiving booking requests from operators near ${place}.`,
  },
];

CITY_CATEGORY_CONFIGS.push(
  ...TRAILER_RENT_SPECS.map((s): CategoryIndexConfig => {
    const place = s.city ? `${s.city.name}, ${s.stateCode}` : s.stateName;
    const path = s.city
      ? `/food-trailers-for-rent/${s.city.slug}`
      : `/food-trailers-for-rent/${slugify(s.stateName)}`;
    return {
      path,
      category: 'food_trailer',
      mode: 'rent',
      ...(s.city
        ? { city: { name: s.city.name, stateCode: s.stateCode } }
        : { state: { name: s.stateName, code: s.stateCode } }),
      h1: `Food Trailers for Rent in ${place}`,
      title: `Food Trailers for Rent in ${place} | Concession Trailer Rentals | Vendibook`,
      description: `Rent a food trailer in ${place}. Compare owner-listed concession trailers with photos, equipment details, and monthly, weekly, or daily rates on Vendibook.`,
      intro: `Browse food trailers available to rent in ${place}. ${s.context} Every listing is owner-managed with photos, equipment details, and transparent rates, and you message the owner directly before booking.`,
      clarification:
        'This is equipment rental: you rent the trailer and operate it yourself. Terms — daily, weekly, or monthly — are set by each owner and shown on the listing.',
      sections: [
        {
          heading: `Monthly food trailer leases in ${place}`,
          paragraphs: [
            `Monthly leases are the most common arrangement for trailers in ${place}: you take the trailer for a full operating month instead of paying daily event rates. Confirm towing requirements, utility hookups, and commissary arrangements with the owner before you book.`,
          ],
          links: [
            { href: '/tools/permitpath', label: 'Permit & licensing checklist' },
            { href: '/food-trailers-for-rent', label: 'All food trailers for rent' },
          ],
        },
        {
          heading: 'Rent now, buy later',
          paragraphs: [
            'Many operators lease a trailer first and buy once the concept is proven. When you are ready to own, compare trailers for sale and financing options for qualifying purchases.',
          ],
          links: [
            { href: '/food-trailers-for-sale', label: 'Food trailers for sale' },
            { href: '/financing', label: 'Equipment financing options' },
          ],
        },
      ],
      faqs: trailerRentFaqs(place),
      related: [
        { href: '/food-trailers-for-rent', label: 'All food trailers for rent' },
        { href: '/food-trucks-for-rent', label: 'Food trucks for rent' },
        ...(s.city
          ? [{ href: `/food-trailers-for-rent/${slugify(s.stateName)}`, label: `Food trailers for rent in ${s.stateName}` }]
          : [{ href: '/food-trailers-for-rent/spring-hill-tn', label: 'Food trailers for rent in Spring Hill, TN' }]),
        { href: '/food-trailers-for-sale', label: 'Food trailers for sale' },
        { href: '/rent-out-my-food-truck', label: 'Rent out your trailer' },
      ],
    };
  })
);
