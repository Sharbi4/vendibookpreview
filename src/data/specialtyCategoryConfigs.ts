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
    ...siblingLinks('coffee'),
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
    ...siblingLinks('ice_cream'),
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

// ---------------------------------------------------------------------------
// Phase 6: pizza, BBQ, snow cone/shaved ice, beverage & mobile bar, mobile
// kitchen. Content is written per category — equipment guidance reflects what
// each build actually contains, and inventory claims stay honest.
// ---------------------------------------------------------------------------

const pizza: CategoryIndexConfig = {
  path: SPECIALTY_DEFS.pizza.hubPath,
  category: 'food_truck',
  categories: ['food_truck', 'food_trailer'],
  mode: 'sale',
  specialty: 'pizza',
  breadcrumbParent: { name: 'Food Trucks for Sale', href: '/food-trucks-for-sale' },
  searchHrefOverride: `/search?q=${encodeURIComponent(SPECIALTY_DEFS.pizza.searchQuery)}`,
  ogImage:
    'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/listing-images/f6fb5b0a-6f90-44cb-97f3-addda2c2b10a/db4c8d64-a1ec-4db4-9715-4ca6ae8fd3b7/1786668909921-r3xdro.jpg',
  h1: 'Pizza Trucks & Pizza Trailers for Sale',
  title: 'Pizza Trucks & Pizza Trailers for Sale | Vendibook',
  description:
    'Browse pizza trucks and pizza trailers for sale on Vendibook. Compare mobile pizza kitchens, equipment, prices, locations, owner-listed units, and available financing.',
  intro:
    'Shop owner-listed pizza trucks and pizza trailers for sale across the US — from wood-fired oven trailers to full mobile pizza kitchens. Every listing includes real photos, the equipment the seller has included, and a transparent asking price, with direct messaging to the owner so you can verify the oven, utilities, and condition before you travel.',
  clarification:
    'These are equipment and business-asset sales: you buy the truck or trailer and operate your own pizza business. Looking to hire pizza catering for an event instead? Message any owner through their listing to ask about services.',
  sections: [
    {
      heading: 'Pizza truck vs. pizza trailer',
      paragraphs: [
        'A pizza truck is a self-contained vehicle — drive to the brewery, the office park, or the event without a tow vehicle, with the engine and chassis part of the asset you\'re buying. A pizza trailer tows behind a vehicle you already own, which usually means more kitchen space per dollar, a lower upfront price, and the option to leave the unit parked at a semi-permanent spot while your tow vehicle stays free.',
        'Oven weight and heat matter more in this category than most: a heavy deck or wood-fired oven affects axle load, ventilation, and layout in both formats. Compare the listings above against how you actually plan to trade — daily routes favor trucks, fixed spots and event circuits often favor trailers.',
      ],
    },
    {
      heading: 'What to look for in a pizza truck or trailer',
      paragraphs: [
        'The oven is the business. Confirm the oven type (wood-fired, deck, conveyor, or gas), its heat output and recovery time, and whether ventilation and fire suppression match the installation — hood systems and suppression are commonly required for high-heat cooking, and requirements vary by jurisdiction. Then check refrigeration for dough and toppings, prep table space, sink configuration, and the water system.',
        'Utilities make or break a pizza build: verify the electrical service or generator capacity against the oven ignition, refrigeration, and lighting load, and the propane setup where gas cooking is installed. Finally inspect the vehicle or trailer itself — axles, tires, brakes, and bodywork — and message the owner through the listing for maintenance history, oven age, and extra photos.',
      ],
      links: [
        { href: '/tools/startup-guide', label: 'Food business startup guide' },
        { href: '/tools/permitpath', label: 'Permit & licensing checklist' },
      ],
    },
    {
      heading: 'Financing a pizza truck or trailer',
      paragraphs: [
        'Pizza trucks and trailers are business assets, and many buyers spread the cost with equipment financing. Vendibook\'s financing page connects qualified buyers with financing options — applications, approval, rates, and terms are handled by the financing provider, not by Vendibook.',
      ],
      links: [{ href: '/financing', label: 'Explore financing options' }],
    },
  ],
  faqs: [
    {
      q: 'Where can I buy a pizza trailer?',
      a: 'Right here — Vendibook is a marketplace for owner-listed pizza trailers and pizza trucks for sale nationwide. Each listing includes photos, equipment details, price, and location, and you can message the seller directly.',
    },
    {
      q: 'Can I finance a pizza food truck?',
      a: 'Often, yes — pizza trucks and trailers are typically eligible for equipment financing as business assets. Qualified buyers can explore options through Vendibook\'s financing page; approval, rates, and terms are set by the financing provider.',
    },
    {
      q: 'What equipment should I look for in a pizza trailer?',
      a: 'Start with the oven: type (wood-fired, deck, conveyor, gas), capacity, and condition, plus matching ventilation and fire suppression. Then refrigeration, prep tables, sinks, water tanks, electrical or generator capacity, propane, serving windows, and the trailer\'s axles, tires, and body. Listings on this page show what each seller includes.',
    },
    {
      q: 'What is the difference between wood-fired, deck, and conveyor pizza ovens?',
      a: 'Wood-fired ovens cook fast at very high heat and are a marketing draw, but need skill and ventilation. Deck ovens are consistent and compact. Conveyor ovens prioritize volume and consistency with less training. Sellers list which oven their unit carries — message the owner for model, age, and service history.',
    },
    {
      q: 'Is a pizza truck or pizza trailer better for a startup?',
      a: 'Trucks offer self-contained daily mobility; trailers usually cost less upfront, offer more kitchen space per dollar, and suit fixed spots and event circuits. Compare both in the listings above against how you plan to trade.',
    },
    {
      q: 'Can I sell my pizza trailer on Vendibook?',
      a: 'Yes — listing is free. Add photos, oven and equipment details, and your asking price, and buyers searching specifically for pizza setups can find and message you directly.',
    },
  ],
  related: [
    { href: '/food-trucks-for-sale', label: 'All food trucks for sale' },
    { href: '/food-trailers-for-sale', label: 'All food trailers for sale' },
    ...siblingLinks('pizza'),
    { href: `/search?q=${encodeURIComponent('pizza')}&category=food_trailer&mode=rent`, label: 'Pizza trailers for rent' },
    { href: '/financing', label: 'Equipment financing' },
    { href: '/sell-my-food-truck', label: 'Sell my food truck or trailer' },
  ],
  sellerCta: {
    heading: 'Selling a pizza truck or trailer?',
    body: 'List your mobile pizza equipment free on Vendibook — oven details, photos, and your asking price in front of buyers searching specifically for pizza businesses like yours.',
    ctaLabel: 'List My Truck or Trailer',
    ctaHref: '/sell-my-food-truck',
  },
};

const bbq: CategoryIndexConfig = {
  path: SPECIALTY_DEFS.bbq.hubPath,
  category: 'food_trailer',
  categories: ['food_truck', 'food_trailer'],
  mode: 'sale',
  specialty: 'bbq',
  breadcrumbParent: { name: 'Food Trailers for Sale', href: '/food-trailers-for-sale' },
  searchHrefOverride: `/search?q=${encodeURIComponent(SPECIALTY_DEFS.bbq.searchQuery)}`,
  ogImage:
    'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/listing-images/ce5ab03f-9d2e-4052-b7c3-1a1347ad5b5d/5894832e-034c-48ba-8315-1321e9b32080/1784989676916-sqm31s.jpeg',
  h1: 'BBQ Trucks & BBQ Trailers for Sale',
  title: 'BBQ Trucks & BBQ Trailers for Sale | Vendibook',
  description:
    'Find BBQ trucks and BBQ trailers for sale on Vendibook. Browse mobile barbecue kitchens, smokers, cooking equipment, prices, locations, and financing options.',
  intro:
    'Browse owner-listed BBQ trailers and BBQ trucks for sale across the US — from dedicated smoker trailers to full mobile barbecue kitchens. Listings include real photos, the cooking equipment each seller has included, transparent asking prices, and direct messaging with the owner.',
  clarification:
    'These are equipment and business-asset sales: you buy the truck or trailer and operate your own barbecue business. Looking to hire BBQ catering for an event? Message any owner through their listing to ask about services.',
  sections: [
    {
      heading: 'BBQ trailer vs. BBQ truck',
      paragraphs: [
        'BBQ inventory skews toward trailers for a reason: smokers are heavy, and a trailer lets the pit ride on its own axles while your tow vehicle handles transport. A BBQ trailer usually offers more pit and prep space per dollar and can be left on-site at a venue or regular spot. A BBQ truck keeps everything self-contained — drive in, cook, serve, drive out — with vehicle maintenance as part of ownership.',
        'Both formats appear on this page; compare them against how you plan to trade — event circuits and semi-permanent spots often favor trailers, daily routes favor trucks.',
      ],
    },
    {
      heading: 'What to look for in a BBQ trailer or truck',
      paragraphs: [
        'Start with the smoker: type (offset, pellet, vertical, or rotisserie), capacity, condition of the firebox and grates, and how it\'s mounted. Then the supporting line — grills, hot holding, refrigeration for meat storage, prep space, and sinks — plus the hood and fire-suppression system, which are commonly required for solid-fuel and high-heat cooking. Requirements vary by jurisdiction, so verify what your local authority expects before you buy.',
        'Check the propane and electrical setup against the equipment load, count serving windows, and inspect the trailer itself: smoker trailers carry serious weight, so axles, tires, brakes, and frame condition matter. Every listing shows the equipment the seller has included — message the owner for smoker model, age, and maintenance history.',
      ],
      links: [
        { href: '/tools/startup-guide', label: 'Food business startup guide' },
        { href: '/tools/permitpath', label: 'Permit & licensing checklist' },
      ],
    },
    {
      heading: 'Financing a BBQ trailer or truck',
      paragraphs: [
        'BBQ trailers and trucks are business assets, and many buyers spread the cost with equipment financing. Vendibook\'s financing page connects qualified buyers with financing options — applications, approval, rates, and terms are handled by the financing provider, not by Vendibook.',
      ],
      links: [{ href: '/financing', label: 'Explore financing options' }],
    },
  ],
  faqs: [
    {
      q: 'Where can I buy a BBQ trailer?',
      a: 'Right here — Vendibook lists owner-listed BBQ trailers and BBQ trucks for sale nationwide, including smoker-equipped concession trailers. Each listing shows photos, equipment, price, and location, with direct seller messaging.',
    },
    {
      q: 'Can I buy a used BBQ food truck?',
      a: 'Yes. Most BBQ inventory on Vendibook is used and owner-listed — sellers describe condition, included smokers and cooking equipment, and history on each listing, and you can request maintenance records through direct messaging.',
    },
    {
      q: 'What should I check before buying a BBQ concession trailer?',
      a: 'The smoker first: type, capacity, firebox condition, and mounting. Then hood and fire suppression, hot holding, refrigeration, sinks, propane and electrical capacity, serving windows, and the axles, tires, and frame — smoker trailers are heavy. Listings on this page show what each seller includes.',
    },
    {
      q: 'Do BBQ trailers on Vendibook include a smoker?',
      a: 'Many do — sellers list the equipment included in the sale on each listing, and smoker details are usually described or visible in photos. Confirm the smoker model, age, and condition by messaging the owner directly.',
    },
    {
      q: 'Can I finance a BBQ trailer?',
      a: 'Often, yes — BBQ trailers and trucks are typically eligible for equipment financing as business assets. Qualified buyers can explore options through Vendibook\'s financing page; approval, rates, and terms are set by the financing provider.',
    },
    {
      q: 'Can I sell my BBQ trailer on Vendibook?',
      a: 'Yes — listing is free. Add photos, smoker and equipment details, and your asking price, and buyers searching specifically for BBQ setups can find and message you directly.',
    },
  ],
  related: [
    { href: '/food-trailers-for-sale', label: 'All food trailers for sale' },
    { href: '/food-trucks-for-sale', label: 'All food trucks for sale' },
    ...siblingLinks('bbq'),
    { href: '/financing', label: 'Equipment financing' },
    { href: '/sell-my-food-truck', label: 'Sell my food truck or trailer' },
  ],
  sellerCta: {
    heading: 'Selling a BBQ trailer or truck?',
    body: 'List your smoker trailer or BBQ truck free on Vendibook — photos, pit and equipment details, and your asking price in front of buyers searching specifically for barbecue setups.',
    ctaLabel: 'List My Truck or Trailer',
    ctaHref: '/sell-my-food-truck',
  },
};

const snowCone: CategoryIndexConfig = {
  path: SPECIALTY_DEFS.snow_cone.hubPath,
  category: 'food_trailer',
  categories: ['food_truck', 'food_trailer'],
  mode: 'sale',
  specialty: 'snow_cone',
  breadcrumbParent: { name: 'Food Trailers for Sale', href: '/food-trailers-for-sale' },
  searchHrefOverride: `/search?q=${encodeURIComponent(SPECIALTY_DEFS.snow_cone.searchQuery)}`,
  ogImage:
    'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/listing-images/e887b32d-e6ab-4ed9-bf07-a245b157f79d/7639ec91-baf6-4ca7-95ea-4f489fd173d2/1786671354573-cia44.jpeg',
  h1: 'Snow Cone & Shaved Ice Trailers for Sale',
  title: 'Snow Cone & Shaved Ice Trailers for Sale | Vendibook',
  description:
    'Browse snow cone and shaved ice trailers for sale on Vendibook. Compare owner-listed units, ice shavers and equipment, prices, locations, and financing options.',
  intro:
    'Shop owner-listed snow cone and shaved ice trailers for sale across the US — one of the lowest-overhead ways into the mobile food business. Listings include real photos, the equipment each seller has included, transparent asking prices, and direct messaging with the owner.',
  clarification:
    'These are equipment and business-asset sales: you buy the trailer or truck and operate your own snow cone or shaved ice business. Looking to hire a shaved ice vendor for an event? Message any owner through their listing to ask about services.',
  sections: [
    {
      heading: 'What to look for in a snow cone or shaved ice trailer',
      paragraphs: [
        'The ice shaver is the heart of the build — confirm the machine type, capacity, and condition, and whether it runs on the trailer\'s electrical system or needs a generator. Then check freezers and refrigeration for ice storage, syrup storage and dispensing, sinks and the water system, serving windows, and counter space for rush service.',
        'Snow cone and shaved ice units are often simpler builds than hot-food trailers, which makes condition and utilities the main diligence items: electrical capacity, water tanks and pump, and the trailer\'s axles, tires, and body. Each listing shows the equipment the seller has included — message the owner for machine model and service history.',
      ],
      links: [
        { href: '/tools/startup-guide', label: 'Food business startup guide' },
        { href: '/tools/permitpath', label: 'Permit & licensing checklist' },
      ],
    },
    {
      heading: 'Snow cones, shaved ice, and seasonality',
      paragraphs: [
        'Snow cone and shaved ice businesses are typically seasonal in most of the US — demand peaks in warm months and at outdoor events, and many operators run event circuits, fairs, and semi-permanent summer spots. Because the equipment footprint is small, these trailers often have lower upfront and operating costs than full kitchen builds, which is why they\'re a common first mobile-food business. Plan your buying decision around your local season and event calendar.',
      ],
    },
    {
      heading: 'Financing a snow cone or shaved ice trailer',
      paragraphs: [
        'Snow cone and shaved ice trailers are business assets, and many buyers spread the cost with equipment financing. Vendibook\'s financing page connects qualified buyers with financing options — applications, approval, rates, and terms are handled by the financing provider, not by Vendibook.',
      ],
      links: [{ href: '/financing', label: 'Explore financing options' }],
    },
  ],
  faqs: [
    {
      q: 'Where can I find a shaved ice trailer for sale?',
      a: 'Right here — Vendibook lists owner-listed snow cone and shaved ice trailers for sale nationwide. Each listing shows photos, equipment, price, and location, and you can message the seller directly.',
    },
    {
      q: 'What equipment is normally included in a snow cone trailer?',
      a: 'Typically an ice shaver machine, ice storage or freezer capacity, syrup storage and dispensing, sinks and a water system, serving windows, and counter space — but inclusions vary by seller. Each listing on this page shows the equipment that seller has included; message the owner to confirm details.',
    },
    {
      q: 'What is the difference between snow cone and shaved ice setups?',
      a: 'Snow cones use coarser crushed ice; shaved ice (including Hawaiian shave ice and New Orleans-style snowballs) is shaved fine and absorbs syrup differently. The machines differ, so check which type of shaver a listing includes before you buy.',
    },
    {
      q: 'Can I finance a snow cone trailer?',
      a: 'Often, yes — snow cone and shaved ice trailers are typically eligible for equipment financing as business assets. Qualified buyers can explore options through Vendibook\'s financing page; approval, rates, and terms are set by the financing provider.',
    },
    {
      q: 'Can I sell my shaved ice trailer on Vendibook?',
      a: 'Yes — listing is free. Add photos, equipment details, and your asking price, and buyers searching specifically for snow cone and shaved ice setups can find and message you directly.',
    },
  ],
  related: [
    { href: '/food-trailers-for-sale', label: 'All food trailers for sale' },
    { href: '/food-trucks-for-sale', label: 'All food trucks for sale' },
    ...siblingLinks('snow_cone'),
    { href: '/financing', label: 'Equipment financing' },
    { href: '/sell-my-food-truck', label: 'Sell my food truck or trailer' },
  ],
  sellerCta: {
    heading: 'Selling a snow cone or shaved ice trailer?',
    body: 'List your trailer free on Vendibook — photos, shaver and equipment details, and your asking price in front of buyers searching specifically for snow cone and shaved ice setups.',
    ctaLabel: 'List My Truck or Trailer',
    ctaHref: '/sell-my-food-truck',
  },
};

const beverage: CategoryIndexConfig = {
  path: SPECIALTY_DEFS.beverage.hubPath,
  category: 'food_trailer',
  categories: ['food_truck', 'food_trailer'],
  mode: 'sale',
  specialty: 'beverage',
  breadcrumbParent: { name: 'Food Trailers for Sale', href: '/food-trailers-for-sale' },
  searchHrefOverride: `/search?q=${encodeURIComponent(SPECIALTY_DEFS.beverage.searchQuery)}`,
  ogImage:
    'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/listing-images/0512c2fe-7f8c-4e29-b7b2-5e48e16e1b11/29db594a-1746-4d42-954a-16673d9ff875/1769467123029-llx81q.jpeg',
  h1: 'Beverage & Mobile Bar Trailers for Sale',
  title: 'Beverage & Mobile Bar Trailers for Sale | Vendibook',
  description:
    'Browse beverage trailers and mobile bar trailers for sale on Vendibook. Compare owner-listed tap trailers, lemonade and smoothie units, equipment, prices, locations, and financing.',
  intro:
    'Shop owner-listed beverage trailers and mobile bar trailers for sale across the US — tap trailers, lemonade and smoothie units, juice trucks, and mobile bar builds. Every listing includes real photos, the equipment each seller has included, transparent asking prices, and direct messaging with the owner.',
  clarification:
    'These are equipment and business-asset sales: you buy the physical trailer or truck — no liquor license, permit, alcohol inventory, or authority to serve alcohol is included with any listing. Licensing for alcohol service is the buyer\'s own responsibility and varies by jurisdiction.',
  sections: [
    {
      heading: 'What to look for in a beverage or mobile bar trailer',
      paragraphs: [
        'Beverage builds live and die by cold storage and service speed. Check refrigeration and ice storage capacity, keg storage and tap systems where installed, sink configuration and the water system, counter space and serving windows, and the electrical service or generator capacity against the refrigeration load.',
        'Then inspect the unit itself: axles, tires, brakes, and body condition on trailers; engine and mileage on trucks. Every Vendibook listing shows the equipment the seller has included — message the owner for equipment models, age, and service history before you travel.',
      ],
      links: [
        { href: '/tools/startup-guide', label: 'Food business startup guide' },
        { href: '/tools/permitpath', label: 'Permit & licensing checklist' },
      ],
    },
    {
      heading: 'Equipment only: licensing is on the buyer',
      paragraphs: [
        'A mobile bar trailer is equipment — buying one does not come with a liquor license, permits, or any legal authority to serve alcohol, and those are never part of a Vendibook listing. Alcohol licensing is issued by state and local authorities to qualified operators, and rules differ widely by jurisdiction. Many buyers operate these units for non-alcoholic service (coffee, lemonade, mocktails, juice) or pursue their own licensing — verify what your plans require before you buy.',
      ],
      links: [{ href: '/tools/permitpath', label: 'Permit & licensing checklist' }],
    },
    {
      heading: 'Financing a beverage or bar trailer',
      paragraphs: [
        'Beverage and mobile bar trailers are business assets, and many buyers spread the cost with equipment financing. Vendibook\'s financing page connects qualified buyers with financing options — applications, approval, rates, and terms are handled by the financing provider, not by Vendibook.',
      ],
      links: [{ href: '/financing', label: 'Explore financing options' }],
    },
  ],
  faqs: [
    {
      q: 'Where can I buy a mobile bar trailer?',
      a: 'Right here — Vendibook lists owner-listed mobile bar trailers, tap trailers, and beverage units for sale nationwide. Each listing shows photos, equipment, price, and location, with direct seller messaging.',
    },
    {
      q: 'Does a mobile bar trailer come with a liquor license?',
      a: 'No. Vendibook listings are equipment sales only — no listing includes a liquor license, permits, alcohol inventory, or authority to serve alcohol. Licensing is the buyer\'s responsibility and is issued by state and local authorities; rules vary by jurisdiction.',
    },
    {
      q: 'What equipment should I look for in a beverage trailer?',
      a: 'Refrigeration and ice storage, keg storage and taps where installed, sinks and water system, counters and serving windows, and electrical or generator capacity. Listings on this page show what each seller includes — message the owner for models and service history.',
    },
    {
      q: 'Can I finance a beverage trailer?',
      a: 'Often, yes — beverage and mobile bar trailers are typically eligible for equipment financing as business assets. Qualified buyers can explore options through Vendibook\'s financing page; approval, rates, and terms are set by the financing provider.',
    },
    {
      q: 'Can I sell my mobile bar or beverage trailer on Vendibook?',
      a: 'Yes — listing is free. Add photos, equipment details, and your asking price, and buyers searching specifically for beverage and bar setups can find and message you directly.',
    },
  ],
  related: [
    { href: '/food-trailers-for-sale', label: 'All food trailers for sale' },
    { href: '/food-trucks-for-sale', label: 'All food trucks for sale' },
    ...siblingLinks('beverage'),
    { href: '/financing', label: 'Equipment financing' },
    { href: '/sell-my-food-truck', label: 'Sell my food truck or trailer' },
  ],
  sellerCta: {
    heading: 'Selling a beverage or mobile bar trailer?',
    body: 'List your tap trailer, lemonade trailer, or mobile bar free on Vendibook — photos, equipment details, and your asking price in front of buyers searching specifically for beverage setups.',
    ctaLabel: 'List My Truck or Trailer',
    ctaHref: '/sell-my-food-truck',
  },
};

const mobileKitchen: CategoryIndexConfig = {
  path: SPECIALTY_DEFS.mobile_kitchen.hubPath,
  category: 'food_trailer',
  categories: ['food_truck', 'food_trailer'],
  mode: 'sale',
  specialty: 'mobile_kitchen',
  breadcrumbParent: { name: 'Food Trailers for Sale', href: '/food-trailers-for-sale' },
  searchHrefOverride: `/search?q=${encodeURIComponent(SPECIALTY_DEFS.mobile_kitchen.searchQuery)}`,
  ogImage:
    'https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/listing-images/24050d09-bc26-42d9-91e2-7c445f9203dc/f814bc22-d682-4ddf-818e-049472578f49/1785261976822-ubjk.jpg',
  h1: 'Mobile Kitchen & Kitchen Trailers for Sale',
  title: 'Mobile Kitchen & Kitchen Trailers for Sale | Vendibook',
  description:
    'Browse mobile kitchen and commercial kitchen trailers for sale on Vendibook. Compare owner-listed units, cooking equipment, prices, locations, and financing options.',
  intro:
    'Shop owner-listed mobile kitchen and commercial kitchen trailers for sale across the US — full cooking lines on wheels for catering, events, restaurant expansion, and mobile food businesses. Listings include real photos, the equipment each seller has included, transparent asking prices, and direct messaging with the owner.',
  clarification:
    'These are equipment sales: you buy the trailer or truck itself. Looking to rent shared commercial kitchen space by the hour instead? Browse Vendibook\'s shared kitchen listings — that\'s a different product.',
  sections: [
    {
      heading: 'Common uses for a mobile kitchen trailer',
      paragraphs: [
        'Buyers use kitchen trailers in more ways than launching a food truck business: adding temporary kitchen capacity during a restaurant renovation, expanding a catering operation, supporting event production, institutional and campus food service, and disaster- or recovery-response feeding. Whether a specific unit fits a specific use depends on its equipment, utilities, and your local requirements — verify those before you buy.',
      ],
    },
    {
      heading: 'What to look for in a commercial kitchen trailer',
      paragraphs: [
        'Start with the cooking line: ranges, griddles, fryers, and ovens, plus the hood and fire-suppression system that high-heat equipment commonly requires — rules vary by jurisdiction, so confirm what your local authority expects. Then refrigeration, prep tables, sink configuration (hand-wash and ware-washing are often separate requirements), water tanks and pump, and the electrical service, generator, and propane capacity behind it all.',
        'Layout matters as much as equipment: check that the workflow fits your menu and headcount, count serving windows, and inspect the trailer itself — floor, walls, axles, tires, and brakes. Each listing shows the equipment the seller has included; message the owner for equipment models, age, and maintenance history.',
      ],
      links: [
        { href: '/tools/startup-guide', label: 'Food business startup guide' },
        { href: '/tools/permitpath', label: 'Permit & licensing checklist' },
      ],
    },
    {
      heading: 'Financing a kitchen trailer',
      paragraphs: [
        'Mobile kitchen trailers are business assets, and many buyers spread the cost with equipment financing. Vendibook\'s financing page connects qualified buyers with financing options — applications, approval, rates, and terms are handled by the financing provider, not by Vendibook.',
      ],
      links: [{ href: '/financing', label: 'Explore financing options' }],
    },
  ],
  faqs: [
    {
      q: 'Where can I buy a mobile kitchen trailer?',
      a: 'Right here — Vendibook lists owner-listed mobile kitchen and commercial kitchen trailers for sale nationwide. Each listing shows photos, equipment, price, and location, with direct seller messaging.',
    },
    {
      q: 'What is the difference between a kitchen trailer and a food trailer?',
      a: 'The terms overlap heavily. "Kitchen trailer" usually emphasizes a full commercial cooking line — ranges, fryers, hood, and fire suppression — rather than a build optimized for one menu. The listings on this page show each unit\'s actual equipment so you can compare configurations.',
    },
    {
      q: 'Can a kitchen trailer be used for catering or restaurant expansion?',
      a: 'Yes — buyers commonly use them for catering operations, temporary kitchen capacity, events, and institutional food service. Whether a unit suits a specific use depends on its equipment, utilities, and local requirements, which you should verify before buying.',
    },
    {
      q: 'Can I finance a commercial kitchen trailer?',
      a: 'Often, yes — mobile kitchen trailers are typically eligible for equipment financing as business assets. Qualified buyers can explore options through Vendibook\'s financing page; approval, rates, and terms are set by the financing provider.',
    },
    {
      q: 'Is this page for renting a commissary kitchen?',
      a: 'No — this page is for buying kitchen trailers as equipment. If you want to rent shared commercial kitchen space by the hour, browse Vendibook\'s shared kitchen listings instead.',
    },
    {
      q: 'Can I sell my kitchen trailer on Vendibook?',
      a: 'Yes — listing is free. Add photos, equipment details, and your asking price, and buyers searching specifically for mobile kitchen setups can find and message you directly.',
    },
  ],
  related: [
    { href: '/food-trailers-for-sale', label: 'All food trailers for sale' },
    { href: '/food-trucks-for-sale', label: 'All food trucks for sale' },
    ...siblingLinks('mobile_kitchen'),
    { href: '/search?category=ghost_kitchen&mode=rent', label: 'Shared kitchens for rent' },
    { href: '/financing', label: 'Equipment financing' },
    { href: '/sell-my-food-truck', label: 'Sell my food truck or trailer' },
  ],
  sellerCta: {
    heading: 'Selling a mobile kitchen trailer?',
    body: 'List your commercial kitchen trailer free on Vendibook — photos, equipment details, and your asking price in front of buyers searching specifically for mobile kitchen capacity.',
    ctaLabel: 'List My Truck or Trailer',
    ctaHref: '/sell-my-food-truck',
  },
};

export const SPECIALTY_CATEGORY_CONFIGS: CategoryIndexConfig[] = [
  coffee,
  iceCream,
  pizza,
  bbq,
  snowCone,
  beverage,
  mobileKitchen,
];
