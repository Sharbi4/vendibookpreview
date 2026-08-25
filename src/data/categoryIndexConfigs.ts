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
    sections: [
      {
        heading: 'Browse food trucks for sale by state',
        paragraphs: [
          'Shopping locally? Browse food trucks for sale in the states where Vendibook has active inventory and dedicated marketplace pages.',
        ],
        links: [
          { href: '/food-trucks-for-sale/texas', label: 'Texas' },
          { href: '/food-trucks-for-sale/arizona', label: 'Arizona' },
          { href: '/food-trucks-for-sale/georgia', label: 'Georgia' },
          { href: '/food-trucks-for-sale/florida', label: 'Florida' },
          { href: '/food-trucks-for-sale/michigan', label: 'Michigan' },
          { href: '/food-trucks-for-sale/ohio', label: 'Ohio' },
          { href: '/food-trucks-for-sale/california', label: 'California' },
          { href: '/food-trucks-for-sale/north-carolina', label: 'North Carolina' },
          { href: '/food-trucks-for-sale/oregon', label: 'Oregon' },
        ],
      },
    ],
    faqs: truckFaqs,
    related: [
      { href: '/food-trucks', label: 'All food trucks' },
      { href: '/food-trucks-for-rent', label: 'Rent before you buy' },
      { href: '/food-trailers-for-sale', label: 'Food trailers for sale' },
      { href: '/coffee-trucks-trailers-for-sale', label: 'Coffee trucks & trailers for sale' },
      { href: '/ice-cream-trucks-trailers-for-sale', label: 'Ice cream trucks & trailers for sale' },
      { href: '/sell-my-food-truck', label: 'Sell my food truck' },
      { href: '/tools/food-truck-startup-costs-2026', label: '2026 startup costs' },
    ],
  },
  {
    path: '/food-trucks-for-rent',
    category: 'food_truck',
    categories: ['food_truck', 'food_trailer'],
    mode: 'rent',
    h1: 'Food Trucks & Food Trailers for Rent',
    title: 'Food Trucks for Rent | Food Trailers for Rent | Vendibook',
    description:
      'Rent a food truck or food trailer for your business. Browse short-term, monthly, and long-term equipment rentals listed by owners nationwide on Vendibook.',
    intro:
      'Find food trucks and food trailers available to rent for business use, including short-term, monthly, and long-term rental opportunities. Every listing is owner-managed with photos, equipment details, transparent rates, and direct messaging — so you can compare options and book with confidence.',
    clarification:
      'This is equipment rental: you rent the truck or trailer and operate it yourself for your own food business. Looking to hire a truck to cater an event instead? Contact the owner through any listing to ask about staffed services.',
    sections: [
      {
        heading: 'Food trucks for rent',
        paragraphs: [
          'Renting a complete food truck is the fastest way to get a mobile kitchen on the road. Operators use rental trucks to test a concept, cover a seasonal rush, or keep revenue flowing while a permanent build is completed. Each listing shows the kitchen equipment, power and water setup, and the owner\'s rates before you ever send a message.',
        ],
        links: [
          { href: '/search?category=food_truck&mode=rent', label: 'Search food trucks for rent' },
          { href: '/rent/food-trucks/houston-tx', label: 'Food trucks for rent in Houston' },
          { href: '/rent/food-trucks/los-angeles-ca', label: 'Food trucks for rent in Los Angeles' },
          { href: '/rent/food-trucks/miami-fl', label: 'Food trucks for rent in Miami' },
        ],
      },
      {
        heading: 'Food trailers for rent',
        paragraphs: [
          'Food trailers and concession trailers are a lower-cost way to launch or expand. They tow behind a standard vehicle, fit festivals, breweries, and commissary-based operations, and often rent for less than a self-propelled truck. Browse trailer listings for towing requirements, equipment, and delivery options.',
        ],
        links: [
          { href: '/food-trailers-for-rent', label: 'Browse food trailers for rent' },
          { href: '/rent/food-trailers/miami-fl', label: 'Food trailers for rent in Miami' },
          { href: '/rent/food-trailers/houston-tx', label: 'Food trailers for rent in Houston' },
        ],
      },
      {
        heading: 'Monthly food truck rentals',
        paragraphs: [
          'Many owners on Vendibook offer monthly food truck rental terms alongside daily and weekly rates. Rental periods are set by each owner, so review the terms on the individual listing or message the host to structure a monthly arrangement that fits your operating schedule.',
        ],
      },
      {
        heading: 'Long-term rentals & leasing',
        paragraphs: [
          'Need equipment for a full season or longer? Long-term food truck rental and lease-style arrangements are available on select listings. Terms, mileage expectations, and maintenance responsibilities are agreed between you and the owner, and are documented in the booking before payment. A marketplace rental is not a financing lease — if ownership is the goal, compare purchase and financing options below.',
        ],
      },
      {
        heading: 'Food truck rentals for businesses',
        paragraphs: [
          'Entrepreneurs and operators rent commercial food trucks and trailers on Vendibook for practical reasons: testing a food truck concept before buying, expanding an existing food business into new events, covering temporary replacement equipment, running seasonal operations, trying a market before committing, or operating while a permanent build is completed. Filter by location and message owners directly about your use case.',
        ],
        links: [
          { href: '/tools/startup-guide', label: 'Food truck startup guide' },
          { href: '/tools/permitpath', label: 'Permit & licensing checklist' },
        ],
      },
      {
        heading: 'Should you rent or buy a food truck?',
        paragraphs: [
          'Renting may make sense when you are testing a concept, need equipment temporarily, want to reduce upfront investment, or operate seasonally. Buying may make sense when you operate long term, want to customize the equipment, prefer building equity in the asset, or need consistent permanent availability. Many Vendibook operators rent first and buy once the concept is proven.',
        ],
        links: [
          { href: '/food-trucks-for-sale', label: 'Food trucks for sale' },
          { href: '/food-trailers-for-sale', label: 'Food trailers for sale' },
        ],
      },
      {
        heading: 'Thinking about buying instead?',
        paragraphs: [
          'Explore food trucks and trailers for sale and view available financing options for qualifying purchases. Financing is provided by third-party lending partners, is subject to approval, and is not available on every listing.',
        ],
        links: [
          { href: '/financing', label: 'Explore financing options' },
          { href: '/tools/pricepilot', label: 'Check equipment value with PricePilot' },
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I rent a food truck for my business?',
        a: 'Yes. Vendibook is a marketplace where owners list food trucks and food trailers for rent. You browse available equipment, compare rates and terms, and book directly with the owner for your own business use.',
      },
      {
        q: 'Can I rent a food trailer instead of a truck?',
        a: 'Yes. Food trailers and concession trailers are listed alongside trucks. Trailers typically cost less and tow behind a standard vehicle — check each listing for towing requirements and delivery options.',
      },
      {
        q: 'Can I rent a food truck monthly?',
        a: 'Often, yes. Rental terms are set by each owner, and many offer weekly and monthly arrangements alongside daily rates. Review the terms on the individual listing or message the owner to discuss a monthly rental.',
      },
      {
        q: 'How much does it cost to rent a food truck?',
        a: 'Cost depends on the vehicle or trailer type, location, rental term, equipment, condition, and included amenities. Each listing shows the owner\'s current rates, so you can compare real options side by side rather than relying on generic averages.',
      },
      {
        q: 'Can I rent a food truck for a startup business?',
        a: 'Yes — renting is a common way to launch. Availability and owner requirements vary by listing; some owners ask for proof of permits or insurance before handing over the keys. Message the owner through the listing to confirm their requirements.',
      },
      {
        q: 'Are these catering food trucks?',
        a: 'The listings on this page are equipment rentals for business use — you rent the truck or trailer and operate it yourself. If you want a staffed truck to cater an event, message an owner through their listing to ask whether they offer staffed services.',
      },
      {
        q: 'Can I buy a truck instead of renting?',
        a: 'Yes. Vendibook lists food trucks and food trailers for sale nationwide, and financing options are available for qualifying purchases through third-party lending partners, subject to approval.',
      },
    ],
    related: [
      { href: '/food-trucks-for-rent/texas', label: 'Food trucks for rent in Texas' },
      { href: '/food-trucks-for-rent/florida', label: 'Food trucks for rent in Florida' },
      { href: '/food-trucks-for-rent/california', label: 'Food trucks for rent in California' },
      { href: '/food-trailers-for-rent', label: 'Food trailers for rent' },
      { href: '/food-trucks-for-sale', label: 'Food trucks for sale' },
      { href: '/shared-kitchens-for-rent', label: 'Shared kitchens for rent' },
      { href: '/rent-out-my-food-truck', label: 'Rent out your food truck' },
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
    sections: [
      {
        heading: 'Browse food trailers for sale by state',
        paragraphs: [
          'Shopping locally? Browse food trailers for sale in the states where Vendibook has active inventory and dedicated marketplace pages.',
        ],
        links: [
          { href: '/food-trailers-for-sale/texas', label: 'Texas' },
          { href: '/food-trailers-for-sale/georgia', label: 'Georgia' },
          { href: '/food-trailers-for-sale/florida', label: 'Florida' },
          { href: '/food-trailers-for-sale/michigan', label: 'Michigan' },
          { href: '/food-trailers-for-sale/ohio', label: 'Ohio' },
          { href: '/food-trailers-for-sale/arizona', label: 'Arizona' },
        ],
      },
    ],
    faqs: trailerFaqs,
    related: [
      { href: '/food-trailers', label: 'All food trailers' },
      { href: '/food-trailers-for-rent', label: 'Rent before you buy' },
      { href: '/food-trucks-for-sale', label: 'Food trucks for sale' },
      { href: '/coffee-trucks-trailers-for-sale', label: 'Coffee trucks & trailers for sale' },
      { href: '/ice-cream-trucks-trailers-for-sale', label: 'Ice cream trucks & trailers for sale' },
      { href: '/sell-my-food-truck', label: 'Sell my trailer or truck' },
    ],
  },
  {
    path: '/food-trailers-for-rent',
    category: 'food_trailer',
    mode: 'rent',
    h1: 'Food Trailers for Rent',
    title: 'Food Trailers for Rent | Concession Trailer Rentals | Vendibook',
    description:
      'Rent a food trailer or concession trailer for your business. Daily, weekly, and monthly terms from owners nationwide, with photos, equipment details, and delivery options.',
    intro:
      'Rent a food trailer for your next season, market, pop-up, or full-time operation. Concession trailers tow behind a standard vehicle and typically rent for less than a self-propelled truck. Every listing is owner-managed with photos, equipment lists, transparent rates, and direct messaging.',
    clarification:
      'This is equipment rental: you rent the trailer and operate it yourself. Rental terms — daily, weekly, or monthly — are set by each owner and shown on the listing.',
    faqs: [
      ...trailerFaqs,
      {
        q: 'Can I rent a food trailer monthly?',
        a: 'Often, yes. Many owners offer monthly food trailer rental terms alongside daily and weekly rates. Terms are set per listing — review the listing or message the owner to structure a longer arrangement.',
      },
      {
        q: 'How much does it cost to rent a food trailer?',
        a: 'Cost depends on trailer size, location, rental term, equipment, and condition. Each Vendibook listing shows the owner\'s current rates so you can compare real options.',
      },
    ],
    related: [
      { href: '/food-trailers', label: 'All food trailers' },
      { href: '/food-trucks-for-rent', label: 'Food trucks for rent' },
      { href: '/food-trailers-for-sale', label: 'Food trailers for sale' },
      { href: '/rent/food-trailers/miami-fl', label: 'Food trailers for rent in Miami' },
      { href: '/rent/food-trailers/houston-tx', label: 'Food trailers for rent in Houston' },
      { href: '/rent-out-my-food-truck', label: 'Rent out your trailer' },
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
  // VENDOR SPACES
  {
    path: '/vendor-spaces',
    category: 'vendor_space',
    mode: 'any',
    h1: 'Vendor Spaces for Rent',
    title: 'Vendor Spaces for Rent | Prime Vending Locations | Vendibook',
    description:
      'Find vendor spaces and vending locations for rent on Vendibook. Brewery patios, food parks, event venues, and high-traffic lots from verified property owners.',
    intro:
      'Browse vendor spaces and prime vending locations available for food trucks, trailers, and mobile vendors. Filter by city, availability, and lot features — book directly with verified property owners.',
    faqs: [
      {
        q: 'What is a vendor space on Vendibook?',
        a: 'A vendor space is a pre-approved location where mobile food vendors can park and operate — such as brewery patios, office park lots, food truck parks, and event venues. Hosts list available spots with pricing, hours, and amenities.',
      },
      {
        q: 'How much does a vendor space cost?',
        a: 'Vendor space pricing varies by location and market. Expect $50–$200/day for single-day spots, or $500–$2,000/month for recurring weekly slots in high-traffic areas.',
      },
      {
        q: 'Do I need a permit to use a vendor space?',
        a: 'Most vendor spaces are on private property with pre-approved vending rights, but you still need your city mobile food vendor permit and health certifications. The host can advise on local requirements.',
      },
      {
        q: 'Can I book a vendor space for a single day?',
        a: 'Yes — many Vendibook vendor spaces support daily booking for events, pop-ups, or one-off vending. Look for listings with daily pricing and instant booking.',
      },
    ],
    related: [
      { href: '/food-trucks', label: 'Food trucks' },
      { href: '/food-trailers', label: 'Food trailers' },
      { href: '/shared-kitchens', label: 'Shared kitchens' },
      { href: '/sell-my-food-truck', label: 'Sell my food truck' },
    ],
  },
];
