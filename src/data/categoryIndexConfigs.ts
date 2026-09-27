import type { CategoryIndexConfig } from '@/pages/CategoryIndex';
import { USED_CONDITION_VALUES } from '@/lib/listings/condition';

const truckFaqs = [
  {
    q: 'How do I find food trucks for sale on Vendibook?',
    a: 'Browse listings on this page or use the advanced search to filter by city, price, and equipment. Each listing shows the photos, specs, and details its seller provided — confirm anything important with the seller before you commit.',
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

const truckSaleFaqs = [
  {
    q: 'Where can I buy a food truck?',
    a: 'You can buy a food truck from an online marketplace, a dealer or custom builder, or directly from an owner. Marketplaces like Vendibook let you compare many trucks from different sellers in one place; dealers and builders offer new or reconditioned units, often with their own warranty terms; direct sellers can be the lowest-cost route but leave more of the checking to you.',
  },
  {
    q: 'Where can I buy a used food truck?',
    a: 'Used food trucks are sold by current owners on marketplaces and classifieds, by some dealers who take trade-ins, and by fleet operators downsizing. On Vendibook you can browse used food trucks for sale — listings where the seller marked the condition as like new, good, fair, or needs work.',
  },
  {
    q: 'What is the best place to buy a food truck?',
    a: 'There is no single best place for everyone. If you want to compare many options quickly, a food-truck-specific marketplace helps. If you want a new build to your spec, a builder fits better. If you already know a local owner, a direct sale can work. Whichever route you choose, inspect the truck, confirm title and records, and use a documented payment method.',
  },
  {
    q: 'How do I find food trucks for sale near me?',
    a: 'Start with the state pages linked on this page or search by city. If local stock is thin, widen your search — many buyers purchase out of state and arrange an in-person inspection plus pickup or freight transport.',
  },
  {
    q: 'How much does it cost to buy a food truck?',
    a: 'Asking prices vary widely with age, mileage, size, and installed equipment. See our food truck prices page for current asking-price data from live Vendibook listings, and budget beyond the price for taxes and registration, inspection, transport, permits, insurance, and any repairs.',
  },
  {
    q: 'Can I rent a food truck before buying one?',
    a: 'Yes. Some operators rent first to test a concept before committing to a purchase. Rental availability and terms are set by each owner.',
  },
  {
    q: 'What should I check before buying a used food truck?',
    a: 'Inspect the engine and drivetrain, generator, refrigeration, propane lines, hood and fire suppression, and kitchen equipment. Ask for service records and confirm with your local health department and fire marshal what the truck needs to pass in your area.',
  },
];

const trailerSaleFaqs = [
  {
    q: 'Where can I buy a food trailer?',
    a: 'Food trailers are sold by builders and trailer dealers (new and custom builds), by current owners on marketplaces and classifieds, and occasionally by event or catering companies selling surplus units. Vendibook lets you compare trailers from different sellers in one place.',
  },
  {
    q: 'Should I buy a new or used food trailer?',
    a: 'A new build lets you choose the layout and equipment, but you pay for it and wait for it. A used trailer can be ready sooner and cost less, but you inherit its layout, equipment age, and any wear — so an inspection matters more.',
  },
  {
    q: 'Is a food trailer or a food truck better for me?',
    a: 'Trailers skip the engine and drivetrain, can be unhitched and left at an event, and often cost less to buy. Trucks are self-contained, faster to set up, and do not need a separate tow vehicle. Your menu, event types, and existing vehicle usually decide it.',
  },
  {
    q: 'What tow vehicle do I need for a food trailer?',
    a: 'Compare the trailer\'s loaded weight (GVWR) and tongue weight against your vehicle\'s rated towing capacity, and confirm the hitch class, coupler size, electrical connector, and brake controller match. Check your state DMV for any license endorsement required at that weight.',
  },
  {
    q: 'How much does a food trailer cost to buy?',
    a: 'Asking prices depend on size, build quality, and equipment. Our food truck prices page shows current asking-price data from live Vendibook listings, including a truck vs. trailer comparison when there is enough data.',
  },
  {
    q: 'Do I need a special license to tow a food trailer?',
    a: 'Requirements depend on your state and the trailer\'s weight. Many lighter trailers can be towed on a standard license, while heavier or commercial use may require an endorsement — check your state DMV before you buy.',
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
    businessTypeNav: true,
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
    businessTypeNav: true,
    h1: 'Food Trucks for Sale',
    title: 'Food Trucks for Sale | Used & New | Vendibook',
    description:
      'Browse food trucks for sale from owners across the US. Compare photos, equipment, asking prices, and locations, plus a guide to where and how to buy a food truck.',
    intro:
      'Compare food trucks for sale from owners across the country. Listings show the photos, equipment, and asking price each seller provides, so you can shortlist trucks, ask questions, and arrange an inspection before you buy.',
    answerBlock: {
      id: 'where-to-buy',
      heading: 'Where to buy a food truck',
      lead: 'Most buyers get a food truck from one of three places: an online marketplace, a dealer or custom builder, or directly from the current owner. Each route trades price, choice, and protection differently — and whichever you choose, inspect the truck and confirm its title and records before you pay.',
      options: [
        {
          name: 'Online marketplaces (like Vendibook)',
          goodFor: 'Comparing many used and new trucks from different sellers and locations in one place, messaging sellers, and making offers.',
          tradeoffs: 'Listings are written by sellers, so details vary. You still need to verify condition, records, and title yourself or with an inspector.',
        },
        {
          name: 'Dealers and custom builders',
          goodFor: 'New builds to your layout, or reconditioned units, often with the builder\'s own warranty or support terms.',
          tradeoffs: 'Usually higher prices and build lead times. Warranty terms differ by builder — read them before you sign.',
        },
        {
          name: 'Direct from an owner',
          goodFor: 'Local deals where you can see the truck in person, talk to the operator, and sometimes buy equipment or a route with it.',
          tradeoffs: 'Least structure: no standard paperwork or payment process, so you carry more of the risk of checking records and handling payment safely.',
        },
      ],
      footnote: 'Used or new? Used trucks can be ready sooner and cost less upfront but carry more unknowns about mileage, equipment age, and wear. New builds cost more and take time, but you choose the layout. Nearby or nationwide? A local truck is easier to inspect in person; buying out of state widens your choice but means planning an inspection, pickup, or freight transport before you commit.',
      links: [
        { href: '/how-to-buy-a-food-truck', label: 'Read the step-by-step buying guide' },
        { href: '/used-food-trucks-for-sale', label: 'Shop used food trucks' },
        { href: '/food-truck-prices', label: 'See current asking prices' },
        { href: '/guides/meetup-inspection', label: 'Inspection checklist' },
        { href: '/vendibook-freight', label: 'Freight & delivery' },
        { href: '/financing', label: 'Financing options' },
      ],
    },
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
      {
        heading: 'Starting a coffee business?',
        paragraphs: [
          'Coffee is one of the lowest-cost mobile food concepts to launch. Espresso-ready trucks need a commercial espresso machine, grinder, water system, refrigeration, and enough power to run them all at once. Compare espresso setups, generator capacity, and asking prices side by side on our dedicated coffee inventory page.',
        ],
        links: [
          { href: '/coffee-trucks-trailers-for-sale', label: 'Shop coffee trucks & trailers for sale' },
          { href: '/financing', label: 'Finance a coffee trailer' },
        ],
      },
      {
        heading: 'Taco trucks for sale',
        paragraphs: [
          'Taco trucks are one of the most popular mobile food concepts in the US. When you shop taco trucks for sale, look for a full-length flat-top griddle, a hood and fire suppression system sized for it, a steam table for proteins, prep refrigeration, and a service window wide enough for fast lines. Mobile taco kitchens with commissary-ready water tanks and current health inspections usually get on the road fastest.',
          'Browse the food trucks listed above and search for "taco" to surface taco truck inventory, or compare pricing across used food trucks before you make an offer.',
        ],
        links: [
          { href: '/search?mode=sale&category=food_truck&q=taco', label: 'Shop taco trucks for sale' },
          { href: '/food-truck-prices', label: 'Compare food truck prices' },
          { href: '/financing', label: 'Finance a taco truck' },
        ],
      },
      {
        heading: 'Buying a food truck: new vs. used',
        paragraphs: [
          'New trucks are built to order, so you pick the chassis, kitchen layout, and equipment — and wait for the build. Used trucks are available now and usually cost less, but their value depends heavily on mileage, maintenance history, and the age of the kitchen equipment. Ask every seller for service records, the year of major equipment, and whether the truck has recently passed a health or fire inspection anywhere.',
          'If you are unsure, compare a few used trucks against a builder quote for the same menu. The gap between them is what you are paying for choice and a clean history.',
        ],
        links: [
          { href: '/used-food-trucks-for-sale', label: 'Used food trucks for sale' },
          { href: '/food-truck-prices', label: 'Compare asking prices' },
        ],
      },
      {
        heading: 'Buying nearby vs. nationwide',
        paragraphs: [
          'Buying close to home makes it easy to see the truck, test-drive it, and bring a mechanic. Widening your search to other states gives you more choice, but plan how you will inspect it — in person, with a hired inspector, or on a live video walkthrough — and how it will get to you: driving it home, or freight transport. Agree on pickup timing, who pays transport, and what condition it should arrive in before you pay.',
        ],
        links: [
          { href: '/guides/meetup-inspection', label: 'How to inspect at a meetup' },
          { href: '/vendibook-freight', label: 'Arrange freight transport' },
          { href: '/how-it-works', label: 'How buying on Vendibook works' },
        ],
      },
      {
        heading: 'Paying for a food truck',
        paragraphs: [
          'On Vendibook, eligible listings can be paid through online checkout powered by PayPal, and some sellers also accept payment in person. Whatever method you use, keep a written record of the agreed price, what is included, and the handoff date. Financing is available through third-party lenders for some buyers; approval, rates, and terms depend on the lender and your application.',
        ],
        links: [
          { href: '/financing', label: 'Explore financing' },
          { href: '/payments', label: 'Payment options' },
        ],
      },
    ],
    faqs: truckSaleFaqs,
    related: [
      { href: '/food-trucks', label: 'All food trucks' },
      { href: '/food-trucks-for-rent', label: 'Rent before you buy' },
      { href: '/food-trailers-for-sale', label: 'Food trailers for sale' },
      { href: '/coffee-trucks-trailers-for-sale', label: 'Coffee trucks & trailers for sale' },
      { href: '/ice-cream-trucks-trailers-for-sale', label: 'Ice cream trucks & trailers for sale' },
      { href: '/sell-my-food-truck', label: 'Sell my food truck' },
      { href: '/food-truck-prices', label: 'Food truck prices & cost calculator' },
      { href: '/how-to-buy-a-food-truck', label: 'How to buy a food truck' },
      { href: '/used-food-trucks-for-sale', label: 'Used food trucks for sale' },
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
    businessTypeNav: true,
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
    businessTypeNav: true,
    h1: 'Food Trailers for Sale',
    title: 'Food Trailers for Sale | Concession & Mobile Kitchen | Vendibook',
    description:
      'Used and new food trailers for sale on Vendibook. Browse concession trailers, BBQ trailers, and turnkey mobile kitchens with photos, specs, and pricing.',
    intro:
      'Find food trailers for sale from owners across the US. Compare concession trailers, BBQ trailers, and full mobile kitchens using the photos, equipment lists, and asking prices each seller provides.',
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
      {
        heading: 'Starting a coffee business?',
        paragraphs: [
          'Coffee is one of the lowest-cost mobile food concepts to launch. Espresso-ready trailers need a commercial espresso machine, grinder, water system, refrigeration, and enough power to run them all at once. Compare espresso setups, generator capacity, and asking prices side by side on our dedicated coffee inventory page.',
        ],
        links: [
          { href: '/coffee-trucks-trailers-for-sale', label: 'Shop coffee trucks & trailers for sale' },
          { href: '/financing', label: 'Finance a coffee trailer' },
        ],
      },
      {
        heading: 'Where to buy a food trailer',
        paragraphs: [
          'Food trailers come from three main sources: builders and trailer dealers, who sell new and custom units; current owners, who sell used trailers on marketplaces and classifieds; and caterers or event companies selling surplus equipment. A marketplace lets you compare trailers from many sellers at once. A builder lets you choose the layout. A private seller may offer the lowest price, but you do more of the checking yourself.',
        ],
        links: [
          { href: '/how-to-buy-a-food-truck', label: 'Step-by-step buying guide' },
          { href: '/search?category=food_trailer&mode=sale', label: 'Search food trailers for sale' },
        ],
      },
      {
        heading: 'Food trailer vs. food truck',
        paragraphs: [
          'A trailer separates the kitchen from the vehicle. That means no engine or transmission to maintain on the kitchen itself, and you can unhitch it at an event and use your vehicle for supply runs. The trade-off is that you need a capable tow vehicle, setup takes longer, and some venues or parking spots are easier with a single self-contained truck.',
        ],
        links: [
          { href: '/food-trucks-for-sale', label: 'Compare food trucks for sale' },
        ],
      },
      {
        heading: 'Match the layout and equipment to your menu',
        paragraphs: [
          'Start from what you will cook. A fry-heavy or griddle menu needs a hood and fire suppression system sized for that line; a coffee or dessert concept may need more refrigeration, water, and power than cooking space. Check the service window position, the prep counter length, sink setup, and where staff will stand at peak times. Ask the seller for the make and age of each major appliance.',
        ],
      },
      {
        heading: 'Check your tow vehicle before you buy',
        paragraphs: [
          'Get the trailer\'s GVWR (loaded weight rating), tongue weight, coupler size, and electrical connector from the seller, then compare them against your vehicle\'s towing capacity, hitch class, and brake controller. Longer and heavier trailers can also affect parking, fuel use, and whether your state requires a license endorsement.',
        ],
      },
      {
        heading: 'Budget for the total cost, not just the price',
        paragraphs: [
          'Beyond the asking price, plan for sales tax, title and registration, an inspection, transport or freight if it is out of town, hitch or tow-vehicle upgrades, local health and fire permits, commissary fees where required, insurance, and any repairs or equipment changes your menu needs.',
        ],
        links: [
          { href: '/food-truck-prices', label: 'See current asking prices' },
          { href: '/financing', label: 'Financing options' },
          { href: '/vendibook-freight', label: 'Freight & delivery' },
        ],
      },
    ],
    faqs: trailerSaleFaqs,
    related: [
      { href: '/food-trailers', label: 'All food trailers' },
      { href: '/food-trailers-for-rent', label: 'Rent before you buy' },
      { href: '/food-trucks-for-sale', label: 'Food trucks for sale' },
      { href: '/coffee-trucks-trailers-for-sale', label: 'Coffee trucks & trailers for sale' },
      { href: '/ice-cream-trucks-trailers-for-sale', label: 'Ice cream trucks & trailers for sale' },
      { href: '/food-truck-prices', label: 'Food trailer prices & cost data' },
      { href: '/how-to-buy-a-food-truck', label: 'How to buy a food truck or trailer' },
      { href: '/sell-my-food-truck', label: 'Sell my trailer or truck' },
    ],
  },
  {
    path: '/used-food-trucks-for-sale',
    category: 'food_truck',
    mode: 'sale',
    conditions: USED_CONDITION_VALUES,
    inventoryNoun: 'used food trucks',
    breadcrumbParent: { name: 'Food Trucks for Sale', href: '/food-trucks-for-sale' },
    searchHrefOverride: '/search?category=food_truck&mode=sale',
    h1: 'Used Food Trucks for Sale',
    title: 'Used Food Trucks for Sale — Pre-Owned Mobile Kitchens | Vendibook',
    description:
      'Shop used food trucks for sale where the seller lists the condition as like new, good, fair, or needs work. Plus what to inspect, which records to ask for, and how to compare costs.',
    intro:
      'These are food trucks for sale whose sellers described the condition as like new, good, fair, or needs work. Trucks listed without a condition are not shown here — browse all food trucks for sale to see them, and confirm condition with the seller either way.',
    clarification:
      'Condition is chosen by each seller, not verified by Vendibook. Treat it as a starting point and confirm it with an inspection.',
    sections: [
      {
        heading: 'Inspect before you commit',
        paragraphs: [
          'A used truck is two purchases: a vehicle and a commercial kitchen. Have a mechanic check the engine, transmission, brakes, tires, and frame, and look for rust or leaks under the kitchen floor. Then check the kitchen: run the generator under load, confirm refrigeration holds temperature, test burners, fryers and griddles, and look at the hood, fire suppression tags, propane lines, and water system.',
        ],
        links: [
          { href: '/guides/meetup-inspection', label: 'Meetup & inspection checklist' },
        ],
      },
      {
        heading: 'Ask for service records and paperwork',
        paragraphs: [
          'Ask for the title (in the seller\'s name), maintenance and repair records, generator hours, fire suppression service dates, and any past health or fire inspection reports. Gaps are not always a deal-breaker, but they should lower what you are willing to pay or raise what you budget for repairs.',
        ],
      },
      {
        heading: 'Judge the equipment, not just the truck',
        paragraphs: [
          'Kitchen equipment ages separately from the vehicle. Note the make and approximate age of each major appliance, and whether it suits your menu. Replacing a hood system, generator, or refrigeration can change the real cost of a truck that looked cheap.',
        ],
      },
      {
        heading: 'Compare total cost, not asking price',
        paragraphs: [
          'Two trucks at the same price can cost very different amounts to put on the road. Add expected repairs, equipment changes, transport, taxes and registration, permits, and insurance to each option. Compare that total against a newer truck or a builder quote before deciding.',
        ],
        links: [
          { href: '/food-truck-prices', label: 'Current asking-price data' },
          { href: '/financing', label: 'Financing options' },
        ],
      },
      {
        heading: 'Evaluate the seller\'s details',
        paragraphs: [
          'Read the full listing, ask questions through Vendibook messaging, and request a live video walkthrough if you cannot visit. Be cautious if a seller pressures you to pay off-platform, refuses an inspection, or cannot show a title in their name.',
        ],
        links: [
          { href: '/how-to-buy-a-food-truck', label: 'Full food truck buying guide' },
          { href: '/food-trucks-for-sale', label: 'All food trucks for sale (any condition)' },
        ],
      },
    ],
    faqs: [
      {
        q: 'How do you decide which food trucks are used?',
        a: 'This page only shows food trucks for sale where the seller chose a pre-owned condition — like new, good, fair, or needs work — when listing. Trucks marked new, or listed without a condition, are not included.',
      },
      {
        q: 'Where can I buy a used food truck?',
        a: 'Used food trucks are sold by current owners on marketplaces and classifieds, by some dealers, and by fleet operators. This page shows used trucks listed on Vendibook; you can also browse all food trucks for sale.',
      },
      {
        q: 'What should I check on a used food truck?',
        a: 'Check the vehicle (engine, transmission, brakes, tires, frame, rust) and the kitchen (generator, refrigeration, cooking equipment, hood and fire suppression, propane and water systems). Ask for the title, service records, and any recent inspection reports.',
      },
      {
        q: 'How much does a used food truck cost?',
        a: 'Asking prices depend on age, mileage, size, and equipment. See the food truck prices page for current asking-price data from Vendibook listings, and budget for repairs, transport, taxes, permits, and insurance on top.',
      },
    ],
    related: [
      { href: '/food-trucks-for-sale', label: 'All food trucks for sale' },
      { href: '/food-trailers-for-sale', label: 'Food trailers for sale' },
      { href: '/how-to-buy-a-food-truck', label: 'How to buy a food truck' },
      { href: '/food-truck-prices', label: 'Food truck prices' },
      { href: '/food-trucks-for-rent', label: 'Rent before you buy' },
    ],
  },
  {
    path: '/food-trailers-for-rent',
    category: 'food_trailer',
    mode: 'rent',
    h1: 'Food Trailers for Rent',
    title: 'Food Trailers for Rent — Daily, Weekly & Monthly | Vendibook',
    description:
      'Rent a food trailer or concession trailer near you. Owner-listed trailers with real rates, photos, and equipment details — daily, weekly, and monthly terms, delivery available.',
    intro:
      'Rent a food trailer for your next season, market, pop-up, or full-time operation. Concession trailers tow behind a standard vehicle and typically rent for less than a self-propelled truck. Every listing is owner-managed with photos, equipment lists, transparent rates, and direct messaging.',
    clarification:
      'This is equipment rental: you rent the trailer and operate it yourself. Rental terms — daily, weekly, or monthly — are set by each owner and shown on the listing.',
    sections: [
      {
        heading: 'Food trailer rental terms: daily, weekly, and monthly',
        paragraphs: [
          'Owners set their own rental terms, and most trailers on Vendibook are offered on more than one. Daily rates suit single festivals, weddings, and weekend markets. Weekly terms cover multi-day events and short seasonal runs. Monthly food trailer rental is common for operators covering a full season, bridging a build-out, or testing a new market before buying — message the owner through the listing to structure a longer term.',
          'Every rate shown on a listing is the owner\'s own asking rate. There is no generic price sheet: compare the live listings on this page rather than an industry average.',
        ],
        links: [
          { href: '/search?category=food_trailer&mode=rent', label: 'Search all food trailers for rent' },
        ],
      },
      {
        heading: 'Rent a food trailer by city',
        paragraphs: [
          'Trailer rental demand concentrates in a handful of markets. Browse city pages for local inventory, or use the listings on this page to compare nationwide options and arrange delivery.',
        ],
        links: [
          { href: '/rent/food-trailers/los-angeles-ca', label: 'Food trailers for rent in Los Angeles' },
          { href: '/rent/food-trailers/houston-tx', label: 'Food trailers for rent in Houston' },
          { href: '/rent/food-trailers/miami-fl', label: 'Food trailers for rent in Miami' },
          { href: '/rent/food-trailers/atlanta-ga', label: 'Food trailers for rent in Atlanta' },
          { href: '/food-trucks-for-rent', label: 'Food trucks for rent nationwide' },
        ],
      },
      {
        heading: 'What to check before you rent a concession trailer',
        paragraphs: [
          'Confirm the tow requirements against your vehicle — hitch class, weight, and brake controller. Check the power and water setup: generator size, shore-power hookup, fresh and grey tank capacity, and whether a three-compartment sink is fitted. Ask the owner about health-department compliance in your county, insurance expectations, and whether delivery and setup are offered. All of it can be settled in the listing conversation before you book.',
        ],
        links: [
          { href: '/tools/permitpath', label: 'Permit & licensing checklist' },
          { href: '/tools/startup-guide', label: 'Mobile food startup guide' },
        ],
      },
      {
        heading: 'Rent now, or buy instead?',
        paragraphs: [
          'Renting keeps upfront cost low while you validate a concept, cover a season, or wait on a build. Buying makes sense once the concept is proven and you want to customize the equipment and build equity. Many Vendibook operators rent a trailer first and purchase once the numbers work.',
        ],
        links: [
          { href: '/food-trailers-for-sale', label: 'Food trailers for sale' },
          { href: '/food-truck-prices', label: 'Food truck & trailer price data' },
          { href: '/rent-out-my-food-truck', label: 'Rent out your own trailer' },
        ],
      },
    ],
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
