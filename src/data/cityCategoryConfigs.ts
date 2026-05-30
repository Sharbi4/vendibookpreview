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
