import type { CategoryIndexConfig } from '@/pages/CategoryIndex';

const truckFaqs = [
  {
    q: 'How do I find food trucks for sale on Vendibook?',
    a: 'Browse listings on this page or use the advanced search to filter by city, price, and equipment. Every listing has full photos, specs, and the seller is verified.',
  },
  {
    q: 'Can I rent a food truck before buying one?',
    a: 'Yes. Many operators rent a truck first to validate their concept before committing to a purchase. Vendibook supports daily, weekly, and monthly rentals.',
  },
  {
    q: 'What should I check before buying a used food truck?',
    a: 'Inspect the generator, refrigeration, propane lines, and kitchen equipment. Ask for service records and confirm the truck meets your local health department code.',
  },
  {
    q: 'Can I list my food truck on Vendibook?',
    a: 'Yes — listing is free. Add photos, price, and availability and start receiving inquiries within minutes.',
  },
  {
    q: 'Are food trailers cheaper than food trucks?',
    a: 'Generally yes. Food trailers cost less to buy and insure than self-propelled trucks, though you need a tow vehicle and a parking arrangement.',
  },
];

const trailerFaqs = [
  {
    q: 'What size food trailer should I get?',
    a: 'Most operators start with a 14–20 ft trailer for a focused menu, and step up to 24–32 ft for full kitchens or multi-station concepts.',
  },
  {
    q: 'Do I need a special license to tow a food trailer?',
    a: 'In most states a standard driver license covers trailers under 10,000 lbs GVWR. Heavier or commercial use may require additional endorsements — check your state DMV.',
  },
  {
    q: 'Can I rent a food trailer for a single weekend event?',
    a: 'Yes. Many Vendibook hosts offer 1–3 day rentals for festivals, weddings, and pop-ups, with optional delivery.',
  },
  {
    q: 'How much does a food trailer cost?',
    a: 'Used trailers start around $10,000. Fully built-out new trailers run $30,000–$80,000+ depending on size and equipment.',
  },
];

const kitchenFaqs = [
  {
    q: 'What is a shared kitchen?',
    a: 'A licensed commercial kitchen rented by multiple food businesses by the hour, day, or month. Ideal for caterers, delivery-only brands, packaged food producers, and food trucks needing commissary space.',
  },
  {
    q: 'Do I need a shared kitchen to run a food truck?',
    a: 'Most cities require food trucks to use a commissary kitchen for prep, water fill, and waste disposal. Vendibook helps you find compliant kitchens nearby.',
  },
  {
    q: 'How much does shared kitchen rental cost?',
    a: 'Hourly rates run $15–$45/hour in most US markets. Monthly memberships range from $300 to $2,500 depending on hours and storage included.',
  },
  {
    q: 'Can I store equipment and ingredients at a shared kitchen?',
    a: 'Most shared kitchens offer dry, refrigerated, and frozen storage as add-ons. Confirm storage availability and pricing with the host before booking.',
  },
];

export const CATEGORY_INDEX_CONFIGS: CategoryIndexConfig[] = [
  // FOOD TRUCKS
  {
    path: '/food-trucks',
    category: 'food_truck',
    mode: 'any',
    h1: 'Food Trucks for Sale & Rent',
    title: 'Food Trucks for Sale & Rent | Vendibook',
    description:
      'Browse food trucks for sale and rent on Vendibook. Compare prices, photos, locations, and mobile food business assets from verified marketplace listings.',
    intro:
      'Browse food trucks available for rent or sale through Vendibook. Compare listings by location, price, photos, and business use case, whether you are launching a new food business, expanding operations, or selling an existing truck.',
    faqs: truckFaqs,
    related: [
      { href: '/food-trucks-for-sale', label: 'Food trucks for sale' },
      { href: '/food-trucks-for-rent', label: 'Food trucks for rent' },
      { href: '/food-trailers', label: 'Food trailers' },
      { href: '/shared-kitchens', label: 'Shared kitchens' },
      { href: '/sell-my-food-truck', label: 'Sell my food truck' },
      { href: '/tools/startup-guide', label: 'Food truck startup guide' },
    ],
  },
  {
    path: '/food-trucks-for-sale',
    category: 'food_truck',
    mode: 'sale',
    h1: 'Food Trucks for Sale',
    title: 'Food Trucks for Sale | Used & New | Vendibook',
    description:
      'Browse food trucks for sale on Vendibook. Verified sellers, full photos, specs, and pricing on used and new mobile kitchens across the US.',
    intro:
      'Find food trucks for sale from verified sellers across the country. Every listing includes detailed photos, equipment specs, mileage, and asking price so you can compare and buy with confidence.',
    faqs: truckFaqs,
    related: [
      { href: '/food-trucks', label: 'All food trucks' },
      { href: '/food-trucks-for-rent', label: 'Rent before you buy' },
      { href: '/food-trailers-for-sale', label: 'Food trailers for sale' },
      { href: '/sell-my-food-truck', label: 'Sell my food truck' },
      { href: '/tools/food-truck-startup-costs-2026', label: '2026 startup costs' },
    ],
  },
  {
    path: '/food-trucks-for-rent',
    category: 'food_truck',
    mode: 'rent',
    h1: 'Food Trucks for Rent',
    title: 'Food Trucks for Rent — Daily, Weekly, Monthly | Vendibook',
    description:
      'Rent a food truck by the day, week, or month. Instant booking, verified hosts, transparent pricing — start serving in days, not months.',
    intro:
      'Rent fully-equipped food trucks for events, catering, or testing a new concept. Filter by location, dates, and equipment, then book instantly with verified hosts.',
    faqs: truckFaqs,
    related: [
      { href: '/food-trucks', label: 'All food trucks' },
      { href: '/food-trucks-for-sale', label: 'Food trucks for sale' },
      { href: '/food-trailers-for-rent', label: 'Food trailers for rent' },
      { href: '/shared-kitchens-for-rent', label: 'Shared kitchens for rent' },
      { href: '/tools/startup-guide', label: 'Food truck startup guide' },
    ],
  },
  // FOOD TRAILERS
  {
    path: '/food-trailers',
    category: 'food_trailer',
    mode: 'any',
    h1: 'Food Trailers for Sale & Rent',
    title: 'Food Trailers for Sale & Rent | Vendibook',
    description:
      'Browse food trailers for sale and rent on Vendibook. Concession trailers, BBQ trailers, and full mobile kitchens from verified sellers and hosts.',
    intro:
      'Compare food trailers available for sale or rent across the US. Lower startup costs than food trucks, easier permitting, and ideal for festivals, breweries, and weekend pop-ups.',
    faqs: trailerFaqs,
    related: [
      { href: '/food-trailers-for-sale', label: 'Food trailers for sale' },
      { href: '/food-trailers-for-rent', label: 'Food trailers for rent' },
      { href: '/food-trucks', label: 'Food trucks' },
      { href: '/shared-kitchens', label: 'Shared kitchens' },
      { href: '/tools/startup-guide', label: 'Food truck startup guide' },
    ],
  },
  {
    path: '/food-trailers-for-sale',
    category: 'food_trailer',
    mode: 'sale',
    h1: 'Food Trailers for Sale',
    title: 'Food Trailers for Sale | Concession & Mobile Kitchen | Vendibook',
    description:
      'Used and new food trailers for sale on Vendibook. Browse concession trailers, BBQ trailers, and turnkey mobile kitchens with photos, specs, and pricing.',
    intro:
      'Find food trailers for sale from verified owners. Compare concession trailers, BBQ pits, and full mobile kitchens with full photos, equipment lists, and asking prices.',
    faqs: trailerFaqs,
    related: [
      { href: '/food-trailers', label: 'All food trailers' },
      { href: '/food-trailers-for-rent', label: 'Rent before you buy' },
      { href: '/food-trucks-for-sale', label: 'Food trucks for sale' },
      { href: '/sell-my-food-truck', label: 'Sell my trailer or truck' },
    ],
  },
  {
    path: '/food-trailers-for-rent',
    category: 'food_trailer',
    mode: 'rent',
    h1: 'Food Trailers for Rent',
    title: 'Food Trailers for Rent — Events, Festivals, Pop-Ups | Vendibook',
    description:
      'Rent a food trailer for events, festivals, or short-term operations. Daily, weekly, and monthly rentals with optional delivery from verified hosts.',
    intro:
      'Rent a food trailer for your next event, pop-up, or seasonal operation. Verified hosts, transparent pricing, optional delivery, and instant booking.',
    faqs: trailerFaqs,
    related: [
      { href: '/food-trailers', label: 'All food trailers' },
      { href: '/food-trailers-for-sale', label: 'Food trailers for sale' },
      { href: '/food-trucks-for-rent', label: 'Food trucks for rent' },
      { href: '/shared-kitchens-for-rent', label: 'Shared kitchens for rent' },
    ],
  },
  // SHARED / GHOST KITCHENS
  {
    path: '/shared-kitchens',
    category: 'ghost_kitchen',
    mode: 'any',
    h1: 'Shared Commercial Kitchens',
    title: 'Shared Commercial Kitchens for Rent | Vendibook',
    description:
      'Find shared commercial kitchens, commissaries, and ghost kitchens for rent on Vendibook. Hourly, daily, and monthly rentals with verified hosts.',
    intro:
      'Browse shared commercial kitchens, ghost kitchens, and commissaries for rent across the US. Ideal for caterers, food trucks needing commissary space, delivery-only brands, and packaged food producers.',
    faqs: kitchenFaqs,
    related: [
      { href: '/shared-kitchens-for-rent', label: 'Shared kitchens for rent' },
      { href: '/ghost-kitchens', label: 'Ghost kitchens' },
      { href: '/food-trucks', label: 'Food trucks' },
      { href: '/food-trailers', label: 'Food trailers' },
      { href: '/rent-my-commercial-kitchen', label: 'Rent out my kitchen' },
      { href: '/tools/permitpath', label: 'Permits & licensing' },
    ],
  },
  {
    path: '/shared-kitchens-for-rent',
    category: 'ghost_kitchen',
    mode: 'rent',
    h1: 'Shared Commercial Kitchens for Rent',
    title: 'Shared Kitchens for Rent — Hourly, Daily, Monthly | Vendibook',
    description:
      'Rent a shared commercial kitchen by the hour, day, or month. Verified commissaries and ghost kitchens with storage, equipment, and licensing in place.',
    intro:
      'Rent a fully-licensed commercial kitchen near you. Filter by hours, equipment, and storage options. Perfect for caterers, food truck commissary needs, and delivery-only brands.',
    faqs: kitchenFaqs,
    related: [
      { href: '/shared-kitchens', label: 'All shared kitchens' },
      { href: '/ghost-kitchens', label: 'Ghost kitchens' },
      { href: '/food-trucks-for-rent', label: 'Food trucks for rent' },
      { href: '/tools/permitpath', label: 'Permits & licensing' },
      { href: '/tools/startup-guide', label: 'Startup guide' },
    ],
  },
  {
    path: '/ghost-kitchens',
    category: 'ghost_kitchen',
    mode: 'any',
    h1: 'Ghost Kitchens for Rent',
    title: 'Ghost Kitchens for Rent | Delivery-Only Kitchen Space | Vendibook',
    description:
      'Find ghost kitchens for rent on Vendibook. Delivery-only commercial kitchen space for cloud restaurant brands, virtual concepts, and catering operations.',
    intro:
      'Launch a delivery-only brand from a ghost kitchen. Browse licensed kitchen space optimized for third-party delivery and pickup, with flexible terms and verified hosts.',
    faqs: kitchenFaqs,
    related: [
      { href: '/shared-kitchens', label: 'All shared kitchens' },
      { href: '/shared-kitchens-for-rent', label: 'Shared kitchens for rent' },
      { href: '/food-trucks', label: 'Food trucks' },
      { href: '/rent-my-commercial-kitchen', label: 'Rent out my kitchen' },
    ],
  },
];
