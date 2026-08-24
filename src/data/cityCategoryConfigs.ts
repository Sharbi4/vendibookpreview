import type { CategoryIndexConfig, CategoryKey, ModeFilter } from '@/pages/CategoryIndex';

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
  // Houston (food truck capital, all 3 modes)
  { citySlug: 'houston', cityName: 'Houston', stateCode: 'TX', category: 'food_truck', mode: 'any' },
  { citySlug: 'houston', cityName: 'Houston', stateCode: 'TX', category: 'food_truck', mode: 'sale' },
  { citySlug: 'houston', cityName: 'Houston', stateCode: 'TX', category: 'food_truck', mode: 'rent' },

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
        { href: s.category === 'food_trailer' ? '/sell-food-trailer' : '/sell-food-truck', label: `Sell your ${s.category === 'food_trailer' ? 'food trailer' : 'food truck'}` },
        { href: `/${citySaleSlug(s.category === 'food_trailer' ? 'food_truck' : 'food_trailer')}/${s.citySlug}`, label: `${s.category === 'food_trailer' ? 'Food trucks' : 'Food trailers'} for sale in ${s.cityName}` },
      ],
    };
  })
);

// ============================================================================
// /food-trucks-for-sale/<state-name>  state-level SEO pages with state→nationwide fallback
// ============================================================================
type StateSaleSpec = { stateName: string; stateCode: string; category: CategoryKey };

const STATE_SALE_SPECS: StateSaleSpec[] = [
  { stateName: 'Arizona',        stateCode: 'AZ', category: 'food_truck' },
  { stateName: 'Texas',          stateCode: 'TX', category: 'food_truck' },
  { stateName: 'Florida',        stateCode: 'FL', category: 'food_truck' },
  { stateName: 'Georgia',        stateCode: 'GA', category: 'food_truck' },
  { stateName: 'North Carolina', stateCode: 'NC', category: 'food_truck' },
  { stateName: 'Oregon',         stateCode: 'OR', category: 'food_truck' },
  { stateName: 'California',     stateCode: 'CA', category: 'food_truck' },
];

// Per-state content overrides keyed by state slug. Texas gets richer copy:
// Search Console shows high impressions but low CTR for "food truck for sale
// in texas", so the snippet and body name real inventory corridors and the
// 2026 statewide licensing change buyers are researching.
const STATE_CONTENT_OVERRIDES: Record<string, {
  description?: string;
  introExtra?: string;
  extraFaqs?: { q: string; a: string }[];
  extraRelated?: { href: string; label: string }[];
}> = {
  texas: {
    description: 'Find food trucks for sale in Texas on Vendibook — active owner-listed inventory across Houston, Dallas–Fort Worth, Austin, and San Antonio. Compare photos, equipment specs, and transparent asking prices.',
    introExtra: 'Texas is one of the strongest mobile food markets in the country, and buyers here typically shop the Houston, Dallas–Fort Worth, Austin, and San Antonio corridors. It is also getting easier to operate statewide: as of July 1, 2026, Texas mobile food vendors move to a single statewide DSHS license, replacing the patchwork of county-by-county permits — so a truck bought in one metro can trade across the state with far less paperwork.',
    extraFaqs: [
      {
        q: 'What changed for Texas food truck permits in 2026?',
        a: 'Starting July 1, 2026, Texas mobile food vendors operate under a statewide DSHS license instead of separate county permits. That makes buying a truck anywhere in Texas more flexible, since you are no longer tied to one county\'s rules.',
      },
    ],
    extraRelated: [
      { href: '/blog/texas-mobile-food-vendor-law-2026', label: 'Texas 2026 mobile food vendor law explained' },
      { href: '/food-trucks-for-sale/houston-tx', label: 'Food trucks for sale in Houston' },
      { href: '/food-trucks-for-sale/dallas-tx', label: 'Food trucks for sale in Dallas' },
      { href: '/food-trucks-for-sale/austin-tx', label: 'Food trucks for sale in Austin' },
      { href: '/food-trucks-for-sale/san-antonio-tx', label: 'Food trucks for sale in San Antonio' },
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

CITY_CATEGORY_CONFIGS.push(
  ...STATE_SALE_SPECS.map((s): CategoryIndexConfig => {
    const plural = catLabelPlural(s.category);
    const pluralTitle = citySaleLabel(s.category);
    const path = `/${citySaleSlug(s.category)}/${slugify(s.stateName)}`;
    return {
      path,
      category: s.category,
      mode: 'sale',
      state: { name: s.stateName, code: s.stateCode },
      h1: `${pluralTitle} for Sale in ${s.stateName}`,
      title: `${pluralTitle} for Sale in ${s.stateName} | Vendibook`,
      description: `Browse ${plural} for sale across ${s.stateName} on Vendibook. Statewide inventory from owners, with nationwide fallback when local listings are limited.`,
      intro: `Browse ${plural} for sale across ${s.stateName}. Each listing is owner-managed with photos, equipment specs, and direct messaging. When statewide inventory is limited, Vendibook also surfaces nationwide listings so you can compare more options.`,
      faqs: stateSaleFaqs(s.stateName, s.category),
      related: [
        { href: `/${citySaleSlug(s.category)}`, label: `All ${pluralTitle.toLowerCase()} for sale` },
        { href: s.category === 'food_trailer' ? '/sell-food-trailer' : '/sell-food-truck', label: `Sell your ${s.category === 'food_trailer' ? 'food trailer' : 'food truck'}` },
        { href: `/${citySaleSlug(s.category === 'food_trailer' ? 'food_truck' : 'food_trailer')}/${slugify(s.stateName)}`, label: `${s.category === 'food_trailer' ? 'Food trucks' : 'Food trailers'} for sale in ${s.stateName}` },
      ],
    };
  })
);
