// City-specific data for landing pages

export interface CityData {
  slug: string;
  name: string;
  state: string;
  stateCode: string;
  tagline: string;
  supplyHeadline: string;
  supplySubheadline: string;
  demandHeadline: string;
  demandSubheadline: string;
  stats: {
    activeListings: number;
    avgDailyRate: number;
    hostsEarning: number;
  };
  neighborhoods: string[];
  popularCategories: string[];
  /** 150-250 word SEO intro for category+city pages */
  seoIntros: Record<string, string>;
}

export const CITY_DATA: Record<string, CityData> = {
  houston: {
    slug: 'houston',
    name: 'Houston',
    state: 'TX',
    stateCode: 'TX',
    tagline: 'The food truck capital of Texas',
    supplyHeadline: 'List your asset in Houston',
    supplySubheadline: 'Reach thousands of Houston food entrepreneurs looking for trucks, trailers, and commercial kitchen space.',
    demandHeadline: 'Find rentals in Houston',
    demandSubheadline: 'Browse food trucks, trailers, shared kitchens, and Vendor Spaces across Greater Houston.',
    stats: { activeListings: 45, avgDailyRate: 275, hostsEarning: 12 },
    neighborhoods: ['Downtown', 'Montrose', 'The Heights', 'Midtown', 'Galleria', 'Katy'],
    popularCategories: ['food_truck', 'food_trailer', 'vendor_space'],
    seoIntros: {
      food_truck: "Houston's food truck scene is one of the largest in the country, fueled by the city's incredible culinary diversity and year-round outdoor weather. From Tex-Mex to Vietnamese fusion, operators across Greater Houston rely on Vendibook to find fully-equipped food trucks ready for daily, weekly, or monthly rental. Whether you're launching a pop-up at Montrose or catering a corporate event in the Galleria area, renting a food truck in Houston gives you the flexibility to test concepts without a six-figure investment. Browse available trucks below and book instantly.",
      food_trailer: "Food trailers are the most popular entry point for Houston food entrepreneurs. Lower startup costs, easier permitting, and the ability to tow to any location make trailers ideal for farmers markets, brewery pop-ups, and weekend events across Harris County. Vendibook connects you with trailer owners throughout Greater Houston who offer flexible rental terms and delivery options.",
      ghost_kitchen: "Houston's shared kitchen and ghost kitchen market is booming as delivery-only restaurant concepts continue to grow. Whether you need a licensed commissary for your food truck operation or a full commercial kitchen for a virtual brand, Vendibook lists verified kitchen spaces across Houston with transparent pricing and instant booking.",
      vendor_space: "Finding the right vending location in Houston can make or break your mobile food business. Vendibook lists curated vendor spaces across Greater Houston — from high-traffic food truck parks to brewery patios and office complex lots. Each listing includes foot traffic details, utility access, and booking availability so you can secure your next spot with confidence.",
    },
  },
  'los-angeles': {
    slug: 'los-angeles',
    name: 'Los Angeles',
    state: 'CA',
    stateCode: 'CA',
    tagline: 'The birthplace of food truck culture',
    supplyHeadline: 'List your asset in Los Angeles',
    supplySubheadline: 'Connect with LA\'s vibrant food entrepreneur community. High demand, premium rates.',
    demandHeadline: 'Find rentals in Los Angeles',
    demandSubheadline: 'Browse food trucks, trailers, shared kitchens, and Vendor Spaces across LA County.',
    stats: { activeListings: 78, avgDailyRate: 350, hostsEarning: 24 },
    neighborhoods: ['Downtown LA', 'Santa Monica', 'Venice', 'Silver Lake', 'Arts District', 'Culver City'],
    popularCategories: ['food_truck', 'ghost_kitchen', 'food_trailer'],
    seoIntros: {
      food_truck: "Los Angeles is the birthplace of modern food truck culture, and demand for mobile kitchens has never been higher. From taco trucks in East LA to gourmet concepts in Santa Monica, LA food entrepreneurs rely on Vendibook to find inspected, ready-to-operate food trucks for rent. Skip the six-figure purchase and start serving within days. Browse available food trucks across LA County below.",
      food_trailer: "Food trailers in Los Angeles offer a cost-effective path into the mobile food industry. With lower overhead than traditional food trucks, trailers are perfect for farmers markets, brewery collaborations, and weekend festivals across LA County. Vendibook lists trailers from verified owners with flexible rental terms.",
      ghost_kitchen: "LA's ghost kitchen scene leads the nation, driven by delivery app demand and the city's appetite for diverse cuisines. Whether you're launching a virtual brand or need a licensed commissary for your food truck, Vendibook connects you with commercial kitchen spaces across Los Angeles County.",
      vendor_space: "Securing a prime vending location in Los Angeles is critical for mobile food success. Vendibook curates vendor spaces from food truck parks to corporate campus lots across LA County, giving you transparent pricing and availability at a glance.",
    },
  },
  dallas: {
    slug: 'dallas',
    name: 'Dallas',
    state: 'TX',
    stateCode: 'TX',
    tagline: 'Big D\'s growing food scene',
    supplyHeadline: 'List your asset in Dallas',
    supplySubheadline: 'Dallas food entrepreneurs are actively searching. List your asset and start earning.',
    demandHeadline: 'Find rentals in Dallas',
    demandSubheadline: 'Browse food trucks, trailers, shared kitchens, and Vendor Spaces in the DFW metroplex.',
    stats: { activeListings: 32, avgDailyRate: 250, hostsEarning: 8 },
    neighborhoods: ['Deep Ellum', 'Bishop Arts', 'Uptown', 'Design District', 'Oak Cliff', 'Plano'],
    popularCategories: ['food_truck', 'food_trailer', 'vendor_space'],
    seoIntros: {
      food_truck: "The Dallas-Fort Worth metroplex is one of the fastest-growing food truck markets in the South. With booming corporate catering demand and a thriving festival scene, renting a food truck in Dallas lets you tap into a market of 7+ million people without the capital commitment of buying. Browse available food trucks across DFW below.",
      food_trailer: "Food trailers are increasingly popular across the DFW metroplex, offering lower costs and greater flexibility than traditional food trucks. Whether you're serving at Deep Ellum weekend markets or Plano office parks, Vendibook connects you with trailer owners offering daily, weekly, and monthly rentals.",
      ghost_kitchen: "Dallas's shared kitchen market is expanding rapidly as delivery-only concepts and virtual brands gain traction across the metroplex. Find licensed commercial kitchen space with flexible terms and transparent pricing on Vendibook.",
      vendor_space: "From food truck parks in Deep Ellum to brewery patios in Bishop Arts, Dallas offers diverse vending locations for mobile food operators. Browse curated vendor spaces with foot traffic data and utility access information on Vendibook.",
    },
  },
  phoenix: {
    slug: 'phoenix',
    name: 'Phoenix',
    state: 'AZ',
    stateCode: 'AZ',
    tagline: 'The desert\'s hottest food scene',
    supplyHeadline: 'List your asset in Phoenix',
    supplySubheadline: 'Phoenix food entrepreneurs are searching for trucks, trailers, and kitchen space. Get listed today.',
    demandHeadline: 'Find rentals in Phoenix',
    demandSubheadline: 'Browse food trucks, trailers, shared kitchens, and Vendor Spaces across the Valley of the Sun.',
    stats: { activeListings: 28, avgDailyRate: 225, hostsEarning: 6 },
    neighborhoods: ['Downtown', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler', 'Gilbert'],
    popularCategories: ['food_truck', 'food_trailer', 'vendor_space'],
    seoIntros: {
      food_truck: "Phoenix's food truck scene thrives year-round thanks to the Valley's outdoor lifestyle and booming population growth. From Scottsdale corporate events to Tempe university crowds, renting a food truck in Phoenix is the fastest way to start serving. Browse inspected, ready-to-operate food trucks across the Valley of the Sun below.",
      food_trailer: "Food trailers are a smart entry point for Phoenix food entrepreneurs looking to minimize startup costs while maximizing flexibility. Tow to farmers markets, brewery pop-ups, and community events across Maricopa County with a Vendibook trailer rental.",
      ghost_kitchen: "Phoenix's ghost kitchen and shared kitchen market is growing as delivery demand increases across the Valley. Find licensed commercial kitchen space in Phoenix, Scottsdale, Tempe, and Mesa with transparent pricing on Vendibook.",
      vendor_space: "The Phoenix metro area offers diverse vending opportunities from food truck parks to corporate campuses and event venues. Browse curated vendor spaces across the Valley of the Sun with booking availability and utility details on Vendibook.",
    },
  },
  'tampa': {
    slug: 'tampa',
    name: 'Tampa',
    state: 'FL',
    stateCode: 'FL',
    tagline: 'Florida\'s fastest-growing food scene',
    supplyHeadline: 'List your asset in Tampa',
    supplySubheadline: 'Tampa Bay food entrepreneurs are searching for trucks, trailers, and kitchen space.',
    demandHeadline: 'Find rentals in Tampa',
    demandSubheadline: 'Browse food trucks, trailers, shared kitchens, and Vendor Spaces across Tampa Bay.',
    stats: { activeListings: 22, avgDailyRate: 235, hostsEarning: 5 },
    neighborhoods: ['Ybor City', 'SoHo', 'Seminole Heights', 'Downtown', 'Hyde Park', 'Channelside'],
    popularCategories: ['food_truck', 'food_trailer', 'ghost_kitchen'],
    seoIntros: {
      food_truck: "Tampa Bay's food truck scene is booming, fueled by year-round outdoor events, a growing population, and a diverse culinary culture. From Ybor City to Seminole Heights, renting a food truck in Tampa gives you instant access to one of Florida's most active mobile food markets. Browse available food trucks across Tampa Bay below and book instantly on Vendibook.",
      food_trailer: "Food trailers are the go-to choice for Tampa Bay food entrepreneurs who want flexibility without the overhead of a full food truck. Perfect for farmers markets, brewery collaborations, and waterfront events across Hillsborough and Pinellas counties.",
      ghost_kitchen: "Tampa's shared kitchen market is expanding as delivery-only concepts and virtual brands gain traction across the Bay Area. Find licensed commissary and commercial kitchen space with flexible terms on Vendibook.",
      vendor_space: "From food truck rallies in Ybor City to waterfront lots in Channelside, Tampa Bay offers prime vending locations for mobile food operators. Browse curated vendor spaces with foot traffic and utility details on Vendibook.",
    },
  },
  portland: {
    slug: 'portland',
    name: 'Portland',
    state: 'OR',
    stateCode: 'OR',
    tagline: 'The food cart capital of the West',
    supplyHeadline: 'List your asset in Portland',
    supplySubheadline: 'Portland\'s food cart culture creates constant demand for mobile food assets.',
    demandHeadline: 'Find rentals in Portland',
    demandSubheadline: 'Browse food trucks, trailers, shared kitchens, and Vendor Spaces across Portland.',
    stats: { activeListings: 35, avgDailyRate: 200, hostsEarning: 9 },
    neighborhoods: ['Pearl District', 'Alberta Arts', 'Hawthorne', 'Division', 'Mississippi', 'Sellwood'],
    popularCategories: ['food_truck', 'food_trailer', 'vendor_space'],
    seoIntros: {
      food_truck: "Portland is legendary for its food cart pods and mobile food culture, making it one of the best cities in America to launch a food truck business. With hundreds of active food carts and a community that celebrates street food, renting a food truck in Portland lets you join a thriving culinary ecosystem. Browse available trucks below.",
      food_trailer: "Food trailers and carts are the backbone of Portland's famous food pod culture. Lower costs and simpler permitting make trailers ideal for joining one of Portland's dozens of food cart pods across the city.",
      ghost_kitchen: "Portland's shared kitchen scene supports the city's thriving food cart operators who need licensed commissary space. Find commercial kitchen rentals with flexible scheduling across Portland on Vendibook.",
      vendor_space: "Portland's food cart pods are world-famous, and securing a spot in the right pod can transform your business. Browse curated vendor spaces and food cart pod openings across Portland on Vendibook.",
    },
  },
  miami: {
    slug: 'miami',
    name: 'Miami',
    state: 'FL',
    stateCode: 'FL',
    tagline: 'Where Latin flavors meet street food',
    supplyHeadline: 'List your asset in Miami',
    supplySubheadline: 'Miami\'s food scene is exploding. List your asset and reach hungry entrepreneurs.',
    demandHeadline: 'Find rentals in Miami',
    demandSubheadline: 'Browse food trucks, trailers, shared kitchens, and Vendor Spaces across Miami-Dade.',
    stats: { activeListings: 30, avgDailyRate: 300, hostsEarning: 8 },
    neighborhoods: ['Wynwood', 'Little Havana', 'Brickell', 'Design District', 'Coconut Grove', 'Doral'],
    popularCategories: ['food_truck', 'ghost_kitchen', 'food_trailer'],
    seoIntros: {
      food_truck: "Miami's food truck scene blends Latin American flavors with international street food culture, creating one of the most vibrant mobile food markets in the Southeast. From Wynwood art walks to Brickell lunch crowds, renting a food truck in Miami lets you serve a diverse, food-loving population year-round.",
      food_trailer: "Food trailers in Miami offer a flexible, lower-cost entry into South Florida's booming mobile food market. Perfect for beach events, farmers markets, and pop-ups across Miami-Dade County.",
      ghost_kitchen: "Miami's ghost kitchen market is growing rapidly, driven by delivery demand and the city's diverse culinary landscape. Find licensed commercial kitchen space across Miami-Dade on Vendibook.",
      vendor_space: "From Wynwood walls to beachfront lots, Miami offers premium vending locations for mobile food operators. Browse curated vendor spaces across Miami-Dade with pricing and availability on Vendibook.",
    },
  },
  atlanta: {
    slug: 'atlanta',
    name: 'Atlanta',
    state: 'GA',
    stateCode: 'GA',
    tagline: 'The South\'s culinary capital',
    supplyHeadline: 'List your asset in Atlanta',
    supplySubheadline: 'Atlanta food entrepreneurs need trucks, kitchens, and vendor spaces. List yours today.',
    demandHeadline: 'Find rentals in Atlanta',
    demandSubheadline: 'Browse food trucks, trailers, shared kitchens, and Vendor Spaces across Metro Atlanta.',
    stats: { activeListings: 25, avgDailyRate: 240, hostsEarning: 7 },
    neighborhoods: ['Midtown', 'Buckhead', 'East Atlanta', 'Decatur', 'West End', 'Ponce City'],
    popularCategories: ['food_truck', 'ghost_kitchen', 'vendor_space'],
    seoIntros: {
      food_truck: "Atlanta's food truck scene has exploded in recent years, with mobile kitchens serving everything from Southern comfort food to international street cuisine across the metro area. Renting a food truck in Atlanta lets you tap into one of the South's largest and most diverse food markets.",
      food_trailer: "Food trailers are gaining popularity across Metro Atlanta as entrepreneurs seek affordable ways to enter the mobile food industry. From Decatur farmers markets to Buckhead corporate events, trailers offer flexibility without the full food truck investment.",
      ghost_kitchen: "Atlanta's ghost kitchen market is thriving, fueled by strong delivery app adoption and the city's diverse food culture. Find licensed commercial kitchen space across Metro Atlanta on Vendibook.",
      vendor_space: "Metro Atlanta offers diverse vending opportunities from food truck parks to brewery patios and corporate campuses. Browse curated vendor spaces with foot traffic data on Vendibook.",
    },
  },
  austin: {
    slug: 'austin',
    name: 'Austin',
    state: 'TX',
    stateCode: 'TX',
    tagline: 'Keep Austin eating',
    supplyHeadline: 'List your asset in Austin',
    supplySubheadline: 'Austin\'s legendary food scene needs your trucks, trailers, and kitchen space.',
    demandHeadline: 'Find rentals in Austin',
    demandSubheadline: 'Browse food trucks, trailers, shared kitchens, and Vendor Spaces across Austin.',
    stats: { activeListings: 40, avgDailyRate: 260, hostsEarning: 10 },
    neighborhoods: ['South Congress', 'East Austin', 'Rainey Street', 'The Domain', 'South Lamar', 'Mueller'],
    popularCategories: ['food_truck', 'food_trailer', 'vendor_space'],
    seoIntros: {
      food_truck: "Austin is one of America's most iconic food truck cities, with hundreds of mobile kitchens operating across the metro area. From South Congress to East Austin, the city's food truck culture is woven into its identity. Renting a food truck in Austin lets you join this legendary scene without the upfront investment of buying.",
      food_trailer: "Food trailers are at the heart of Austin's famous food truck parks and outdoor dining culture. Whether you're setting up on Rainey Street or at a South Lamar food pod, trailers offer the perfect balance of affordability and flexibility.",
      ghost_kitchen: "Austin's shared kitchen scene supports the city's massive food truck community with licensed commissary spaces and commercial kitchens. Find flexible kitchen rentals across Austin on Vendibook.",
      vendor_space: "Austin's food truck parks and outdoor venues are legendary. From Rainey Street to The Domain, browse curated vendor spaces and food truck pod openings across Austin on Vendibook.",
    },
  },
  'san-antonio': {
    slug: 'san-antonio',
    name: 'San Antonio',
    state: 'TX',
    stateCode: 'TX',
    tagline: 'Where tradition meets street food',
    supplyHeadline: 'List your asset in San Antonio',
    supplySubheadline: 'San Antonio food entrepreneurs are looking for trucks, trailers, and kitchen space.',
    demandHeadline: 'Find rentals in San Antonio',
    demandSubheadline: 'Browse food trucks, trailers, shared kitchens, and Vendor Spaces across San Antonio.',
    stats: { activeListings: 20, avgDailyRate: 210, hostsEarning: 5 },
    neighborhoods: ['Pearl District', 'Southtown', 'The Rim', 'Alamo Heights', 'Stone Oak', 'Downtown'],
    popularCategories: ['food_truck', 'food_trailer', 'vendor_space'],
    seoIntros: {
      food_truck: "San Antonio's food truck market blends the city's rich Tex-Mex heritage with a growing appetite for diverse street food. From the Pearl District to Southtown, renting a food truck in San Antonio gives you access to a city of 1.5+ million residents and millions of annual tourists.",
      food_trailer: "Food trailers are a popular choice for San Antonio entrepreneurs looking to serve the city's growing food scene at lower startup costs. Perfect for weekend markets, brewery pop-ups, and Riverwalk-adjacent events.",
      ghost_kitchen: "San Antonio's shared kitchen and commissary market is growing as the city's food truck community expands. Find licensed commercial kitchen space with flexible terms on Vendibook.",
      vendor_space: "From the Pearl District to festival grounds along the Riverwalk, San Antonio offers prime vending locations for mobile food operators. Browse curated vendor spaces with booking availability on Vendibook.",
    },
  },
  chicago: {
    slug: 'chicago',
    name: 'Chicago',
    state: 'IL',
    stateCode: 'IL',
    tagline: 'The Windy City\'s street food revolution',
    supplyHeadline: 'List your asset in Chicago',
    supplySubheadline: 'Chicago food entrepreneurs need trucks, kitchens, and vendor spaces. List yours today.',
    demandHeadline: 'Find rentals in Chicago',
    demandSubheadline: 'Browse food trucks, trailers, shared kitchens, and Vendor Spaces across Chicagoland.',
    stats: { activeListings: 38, avgDailyRate: 280, hostsEarning: 11 },
    neighborhoods: ['Loop', 'Wicker Park', 'Logan Square', 'Pilsen', 'River North', 'Lincoln Park'],
    popularCategories: ['food_truck', 'ghost_kitchen', 'vendor_space'],
    seoIntros: {
      food_truck: "Chicago's food truck scene has grown dramatically, with mobile kitchens serving the city's 2.7 million residents and countless tourists year-round. From Loop lunch crowds to Wicker Park weekend festivals, renting a food truck in Chicago puts you in one of America's most food-obsessed cities.",
      food_trailer: "Food trailers are an emerging force in Chicago's mobile food market, offering lower costs and flexibility for entrepreneurs serving farmers markets, brewery events, and neighborhood festivals across Chicagoland.",
      ghost_kitchen: "Chicago's ghost kitchen market is one of the largest in the Midwest, powered by strong delivery demand and the city's legendary food culture. Find licensed commercial kitchen space across Chicagoland on Vendibook.",
      vendor_space: "From food truck rallies in the Loop to brewery patios in Logan Square, Chicago offers diverse vending opportunities. Browse curated vendor spaces across Chicagoland with foot traffic and utility details on Vendibook.",
    },
  },
};

export const ASSET_TYPES = {
  'food-truck': {
    slug: 'food-truck',
    label: 'Food Truck',
    category: 'food_truck' as const,
    description: 'Fully-equipped mobile kitchen on wheels',
    icon: '🚚',
  },
  'food-trailer': {
    slug: 'food-trailer',
    label: 'Food Trailer',
    category: 'food_trailer' as const,
    description: 'Towable commercial food preparation unit',
    icon: '🏕️',
  },
  'shared-kitchen': {
    slug: 'shared-kitchen',
    label: 'Shared Kitchen',
    category: 'ghost_kitchen' as const,
    description: 'Commercial kitchen space for delivery-only concepts',
    icon: '🏭',
  },
  'vendor-space': {
    slug: 'vendor-space',
    label: 'Vendor Space',
    category: 'vendor_space' as const,
    description: 'Prime location for mobile food vendors',
    icon: '📍',
  },
};

/** Map URL category slugs to DB category values */
export const CATEGORY_SLUG_MAP: Record<string, string> = {
  'food-trucks': 'food_truck',
  'food-trailers': 'food_trailer',
  'commercial-kitchens': 'ghost_kitchen',
  'vendor-spaces': 'vendor_space',
};

/** Reverse map: DB category -> URL slug */
export const CATEGORY_TO_SLUG: Record<string, string> = {
  food_truck: 'food-trucks',
  food_trailer: 'food-trailers',
  ghost_kitchen: 'commercial-kitchens',
  vendor_space: 'vendor-spaces',
};

/** Human-readable category labels (plural) */
export const CATEGORY_LABELS_PLURAL: Record<string, string> = {
  food_truck: 'Food Trucks',
  food_trailer: 'Food Trailers',
  ghost_kitchen: 'Commercial Kitchens',
  vendor_space: 'Vendor Spaces',
};

/** Build a city-state slug like "houston-tx" */
export function getCityStateSlug(city: CityData): string {
  return `${city.slug}-${city.stateCode.toLowerCase()}`;
}

/** Parse "houston-tx" -> { citySlug: "houston", stateCode: "TX" } */
export function parseCityStateSlug(slug: string): { citySlug: string; stateCode: string } | null {
  const parts = slug.split('-');
  if (parts.length < 2) return null;
  const stateCode = parts.pop()!.toUpperCase();
  const citySlug = parts.join('-');
  return { citySlug, stateCode };
}

/** Find city data from a city-state slug like "houston-tx" */
export function getCityFromStateSlug(slug: string): CityData | null {
  const parsed = parseCityStateSlug(slug);
  if (!parsed) return null;
  const city = CITY_DATA[parsed.citySlug];
  if (city && city.stateCode.toUpperCase() === parsed.stateCode) return city;
  return null;
}

export function getCityFromSlug(slug: string): CityData | null {
  return CITY_DATA[slug] || null;
}

export function getAssetTypeFromSlug(slug: string) {
  return ASSET_TYPES[slug as keyof typeof ASSET_TYPES] || null;
}

/** Get all city+category+mode combinations for sitemap generation */
export function getAllSeoPages(): Array<{ mode: string; categorySlug: string; cityStateSlug: string }> {
  const pages: Array<{ mode: string; categorySlug: string; cityStateSlug: string }> = [];
  for (const city of Object.values(CITY_DATA)) {
    for (const [catSlug] of Object.entries(CATEGORY_SLUG_MAP)) {
      for (const mode of ['rent', 'buy']) {
        pages.push({
          mode,
          categorySlug: catSlug,
          cityStateSlug: getCityStateSlug(city),
        });
      }
    }
  }
  return pages;
}
