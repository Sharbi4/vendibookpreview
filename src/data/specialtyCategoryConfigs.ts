import type { CategoryIndexConfig } from '@/pages/CategoryIndex';
import { SPECIALTY_DEFS, type SpecialtyKey } from '@/lib/listings/specialty';

// ============================================================================
// Phase 4 + Phase 6 SEO: national specialty marketplace hubs.
// One authoritative dual-category page per specialty (trucks + trailers
// together) — singular/plural and used/new variants are targeted naturally by
// the same page instead of separate thin URLs.
// ============================================================================

/** Cross-links to every other specialty hub — builds the
 *  National → Specialty → Listing → Specialty internal-link loop. */
const siblingLinks = (except: SpecialtyKey): { href: string; label: string }[] =>
  (Object.keys(SPECIALTY_DEFS) as SpecialtyKey[])
    .filter((k) => k !== except)
    .map((k) => ({ href: SPECIALTY_DEFS[k].hubPath, label: `${SPECIALTY_DEFS[k].pluralTitle} for sale` }));

const coffee: CategoryIndexConfig = {
  path: SPECIALTY_DEFS.coffee.hubPath,
  category: 'food_truck',
  categories: ['food_truck', 'food_trailer'],
  mode: 'sale',
  specialty: 'coffee',
  breadcrumbParent: { name: 'Food Trucks for Sale', href: '/food-trucks-for-sale' },
  searchHrefOverride: `/search?q=${encodeURIComponent(SPECIALTY_DEFS.coffee.searchQuery)}`,
  h1: 'Coffee Trucks & Coffee Trailers for Sale',
  title: 'Coffee Trucks & Coffee Trailers for Sale | Vendibook',
  description:
    'Browse coffee trucks and coffee trailers for sale on Vendibook. Compare owner-listed mobile coffee businesses, equipment, prices, locations, and financing options nationwide.',
  intro:
    'Shop owner-listed coffee trucks, coffee trailers, and mobile coffee carts for sale across the US. Every listing includes real photos, equipment details, and transparent asking prices, with direct messaging to the seller — so you can compare mobile coffee businesses side by side and buy with confidence.',
  clarification:
    'These are equipment and business-asset sales: you buy the truck, trailer, or cart and operate your own coffee business. Looking to hire coffee catering for an event instead? Message any owner through their listing to ask about services.',
  sections: [
    {
      heading: 'Coffee truck vs. coffee trailer',
      paragraphs: [
        'A coffee truck is a self-contained vehicle — drive it to the morning commute rush, a farmers market, or an office park without a tow vehicle, and treat the engine and chassis as part of the asset you\'re buying. A coffee trailer tows behind a vehicle you already own, which separates the business unit from the vehicle, usually frees up more interior workspace per dollar, and lets you park the trailer on-site while your tow vehicle stays free. Carts and compact trailers suit low-overhead startups; full trucks suit operators who want point-to-point mobility every day.',
        'Neither is universally better — compare the listings above against how you actually plan to trade: daily routes favor trucks, semi-permanent spots and event circuits often favor trailers.',
      ],
    },
    {
      heading: 'What to look for when buying a coffee truck or trailer',
      paragraphs: [
        'Coffee builds live and die by utilities. Check the electrical service and whether it can carry an espresso machine, grinder, and refrigeration at once; confirm the water system (fresh and grey tank capacity, pump, and water heater); and count the sinks — many health departments expect dedicated hand-wash and ware-washing setups. Review the espresso machine\'s power requirements against the generator or shore-power setup included in the sale.',
        'Beyond utilities, look at the service window layout and workflow (can one person serve during a rush?), refrigeration capacity for milk and syrups, dry storage, and the condition of the vehicle or trailer itself — tires, axles, brakes, and bodywork. Every Vendibook listing shows the equipment the seller has included; message the owner through the listing for maintenance history or extra photos before you travel.',
      ],
      links: [
        { href: '/tools/startup-guide', label: 'Coffee business startup guide' },
        { href: '/tools/permitpath', label: 'Permit & licensing checklist' },
      ],
    },
    {
      heading: 'Financing a coffee truck or trailer',
      paragraphs: [
        'Coffee trucks and trailers are business assets, and many buyers spread the cost with equipment financing. Vendibook\'s financing page connects you with financing options for qualified buyers — applications, approval, rates, and terms are handled by the financing provider, not by Vendibook.',
      ],
      links: [{ href: '/financing', label: 'Explore financing options' }],
    },
  ],
  faqs: [
    {
      q: 'Where can I buy a coffee trailer?',
      a: 'Right here — Vendibook is a marketplace for owner-listed coffee trailers, coffee trucks, and mobile coffee carts for sale nationwide. Each listing includes photos, equipment details, price, and location, and you can message the seller directly.',
    },
    {
      q: 'Can I buy a used coffee truck?',
      a: 'Yes. Most coffee trucks and trailers on Vendibook are used, owner-listed units — sellers describe the condition, included equipment, and history on each listing, and you can request maintenance records or additional photos through direct messaging.',
    },
    {
      q: 'Can coffee trailers be financed?',
      a: 'Often, yes — coffee trailers and trucks are typically eligible for equipment financing as business assets. Qualified buyers can explore options through Vendibook\'s financing page; approval, rates, and terms are set by the financing provider.',
    },
    {
      q: 'What equipment should I look for in a coffee trailer?',
      a: 'Focus on the espresso machine and its power requirements, electrical capacity, water tanks and pump, sink configuration, refrigeration, generator or shore-power setup, service windows, and storage. Listings on this page show the equipment each seller includes.',
    },
    {
      q: 'Is a coffee truck or coffee trailer better for a startup?',
      a: 'It depends on how you plan to trade. Trucks offer self-contained daily mobility; trailers usually cost less upfront, tow behind a vehicle you already own, and suit semi-permanent spots and event circuits. Compare both in the listings above.',
    },
    {
      q: 'Can I sell my coffee trailer on Vendibook?',
      a: 'Yes — listing is free. Add photos, equipment, and your asking price, and buyers looking specifically for coffee businesses can find and message you directly.',
    },
  ],
  related: [
    { href: '/food-trucks-for-sale', label: 'All food trucks for sale' },
    { href: '/food-trailers-for-sale', label: 'All food trailers for sale' },
    { href: SPECIALTY_DEFS.ice_cream.hubPath, label: 'Ice cream trucks & trailers for sale' },
    { href: '/financing', label: 'Equipment financing' },
    { href: '/sell-my-food-truck', label: 'Sell my food truck or trailer' },
  ],
  sellerCta: {
    heading: 'Selling a coffee truck or trailer?',
    body: 'Coffee-business owners and builders list their equipment free on Vendibook — photos, specs, and your asking price in front of buyers searching specifically for coffee setups.',
    ctaLabel: 'List My Coffee Truck or Trailer',
    ctaHref: '/sell-my-food-truck',
  },
};

const iceCream: CategoryIndexConfig = {
  path: SPECIALTY_DEFS.ice_cream.hubPath,
  category: 'food_truck',
  categories: ['food_truck', 'food_trailer'],
  mode: 'sale',
  specialty: 'ice_cream',
  breadcrumbParent: { name: 'Food Trucks for Sale', href: '/food-trucks-for-sale' },
  searchHrefOverride: `/search?q=${encodeURIComponent(SPECIALTY_DEFS.ice_cream.searchQuery)}`,
  h1: 'Ice Cream Trucks & Ice Cream Trailers for Sale',
  title: 'Ice Cream Trucks & Ice Cream Trailers for Sale | Vendibook',
  description:
    'Browse ice cream trucks and ice cream trailers for sale nationwide. Compare used owner-listed units, equipment, prices, and locations, with financing options available on Vendibook.',
  intro:
    'Find used ice cream trucks and ice cream trailers for sale from owners across the US — from soft serve trucks to freezer-equipped concession trailers. Every listing includes real photos, equipment details, and transparent asking prices, with direct messaging to the seller so you can verify condition before you buy.',
  clarification:
    'These are equipment and business-asset sales: you buy the truck or trailer and operate your own ice cream business. This page is not for finding an ice cream truck to visit your event or neighborhood — message any owner through their listing to ask about services instead.',
  sections: [
    {
      heading: 'Ice cream truck vs. ice cream trailer',
      paragraphs: [
        'An ice cream truck is a self-contained vehicle: drive the route, park the event, and the business moves under its own power — with vehicle maintenance as part of ownership. An ice cream trailer tows behind a vehicle you already own, which separates the vehicle from the business unit, often allows more flexible interior layouts, and can be left on-site at a venue or seasonal spot. Trucks suit daily neighborhood routes and event circuits; trailers suit fixed or semi-permanent locations and lower upfront cost.',
      ],
    },
    {
      heading: 'Soft serve ice cream trucks',
      paragraphs: [
        'Soft serve setups are a distinct configuration worth checking before you buy: the machines need significant electrical capacity, a reliable generator or shore-power connection, and regular maintenance, and they typically pair with freezers for mix storage. Listings that include soft serve machines note the equipment in their description — message the owner through the listing for machine model, age, and service history.',
      ],
      links: [{ href: `/search?q=${encodeURIComponent('soft serve')}`, label: 'Search soft serve setups' }],
    },
    {
      heading: 'What to look for when buying an ice cream truck',
      paragraphs: [
        'Refrigeration is the whole business: inspect the freezers and cold-plate or compressor systems, confirm holding temperatures, and ask how the units are powered on the move versus overnight. Check the electrical system and generator capacity against the freezer load, the water and sink setup, serving window condition, and interior layout — scoop setups, soft serve machines, and novelty freezers all demand different workflows.',
        'Then evaluate the vehicle or trailer itself: engine and mileage on trucks, axles, tires, and brakes on trailers, plus body condition. Each Vendibook listing shows the equipment the seller has included; request maintenance records and additional photos through direct messaging before you travel.',
      ],
      links: [
        { href: '/tools/startup-guide', label: 'Ice cream business startup guide' },
        { href: '/tools/permitpath', label: 'Permit & licensing checklist' },
      ],
    },
    {
      heading: 'Financing an ice cream truck or trailer',
      paragraphs: [
        'Ice cream trucks and trailers are business assets, and many buyers spread the cost with equipment financing. Vendibook\'s financing page connects qualified buyers with financing options — applications, approval, rates, and terms are handled by the financing provider, not by Vendibook.',
      ],
      links: [{ href: '/financing', label: 'Explore financing options' }],
    },
  ],
  faqs: [
    {
      q: 'Where can I buy a used ice cream truck?',
      a: 'Right here — Vendibook lists owner-listed used ice cream trucks and trailers for sale nationwide. Each listing shows photos, equipment, price, and location, and you can message the seller directly to verify condition and history.',
    },
    {
      q: 'How much does an ice cream truck cost?',
      a: 'It varies widely by vehicle condition, refrigeration equipment, and what\'s included in the sale. The listings on this page show each seller\'s current asking price so you can compare real units side by side.',
    },
    {
      q: 'Can I finance an ice cream truck?',
      a: 'Often, yes — ice cream trucks and trailers are typically eligible for equipment financing as business assets. Qualified buyers can explore options through Vendibook\'s financing page; approval, rates, and terms are set by the financing provider.',
    },
    {
      q: 'What is the difference between soft serve and scoop ice cream setups?',
      a: 'Soft serve trucks carry machines that freeze and dispense mix on demand — higher electrical and maintenance demands, but fast service. Scoop and novelty setups rely on freezers holding pre-made product — simpler utilities, more storage-dependent. Many sellers list which configuration their unit has.',
    },
    {
      q: 'Is an ice cream truck or trailer better for a startup?',
      a: 'Trucks offer self-contained mobility for daily routes and events; trailers usually cost less upfront, tow behind a vehicle you own, and suit fixed or seasonal spots. Compare both in the listings above.',
    },
    {
      q: 'Can I sell my ice cream truck on Vendibook?',
      a: 'Yes — listing is free. Add photos, freezer and equipment details, and your asking price, and buyers searching specifically for ice cream setups can find and message you directly.',
    },
  ],
  related: [
    { href: '/food-trucks-for-sale', label: 'All food trucks for sale' },
    { href: '/food-trailers-for-sale', label: 'All food trailers for sale' },
    { href: SPECIALTY_DEFS.coffee.hubPath, label: 'Coffee trucks & trailers for sale' },
    { href: '/financing', label: 'Equipment financing' },
    { href: '/sell-my-food-truck', label: 'Sell my food truck or trailer' },
  ],
  sellerCta: {
    heading: 'Selling an ice cream truck or trailer?',
    body: 'List your ice cream truck or trailer free on Vendibook — photos, freezer and equipment details, and your asking price in front of buyers searching specifically for ice cream setups.',
    ctaLabel: 'List My Ice Cream Truck or Trailer',
    ctaHref: '/sell-my-food-truck',
  },
};

export const SPECIALTY_CATEGORY_CONFIGS: CategoryIndexConfig[] = [coffee, iceCream];
