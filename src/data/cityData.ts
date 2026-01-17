// City-specific data for landing pages

export interface CityData {
  slug: string;
  name: string;
  state: string;
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
}

export const CITY_DATA: Record<string, CityData> = {
  houston: {
    slug: 'houston',
    name: 'Houston',
    state: 'TX',
    tagline: 'The food truck capital of Texas',
    supplyHeadline: 'List your asset in Houston',
    supplySubheadline: 'Reach thousands of Houston food entrepreneurs looking for trucks, trailers, and commercial kitchen space.',
    demandHeadline: 'Find rentals in Houston',
    demandSubheadline: 'Browse food trucks, trailers, ghost kitchens, and vendor lots across Greater Houston.',
    stats: {
      activeListings: 45,
      avgDailyRate: 275,
      hostsEarning: 12,
    },
    neighborhoods: ['Downtown', 'Montrose', 'The Heights', 'Midtown', 'Galleria', 'Katy'],
    popularCategories: ['food_truck', 'food_trailer', 'vendor_lot'],
  },
  'los-angeles': {
    slug: 'los-angeles',
    name: 'Los Angeles',
    state: 'CA',
    tagline: 'The birthplace of food truck culture',
    supplyHeadline: 'List your asset in Los Angeles',
    supplySubheadline: 'Connect with LA\'s vibrant food entrepreneur community. High demand, premium rates.',
    demandHeadline: 'Find rentals in Los Angeles',
    demandSubheadline: 'Browse food trucks, trailers, ghost kitchens, and vendor lots across LA County.',
    stats: {
      activeListings: 78,
      avgDailyRate: 350,
      hostsEarning: 24,
    },
    neighborhoods: ['Downtown LA', 'Santa Monica', 'Venice', 'Silver Lake', 'Arts District', 'Culver City'],
    popularCategories: ['food_truck', 'ghost_kitchen', 'food_trailer'],
  },
  dallas: {
    slug: 'dallas',
    name: 'Dallas',
    state: 'TX',
    tagline: 'Big D\'s growing food scene',
    supplyHeadline: 'List your asset in Dallas',
    supplySubheadline: 'Dallas food entrepreneurs are actively searching. List your asset and start earning.',
    demandHeadline: 'Find rentals in Dallas',
    demandSubheadline: 'Browse food trucks, trailers, ghost kitchens, and vendor lots in the DFW metroplex.',
    stats: {
      activeListings: 32,
      avgDailyRate: 250,
      hostsEarning: 8,
    },
    neighborhoods: ['Deep Ellum', 'Bishop Arts', 'Uptown', 'Design District', 'Oak Cliff', 'Plano'],
    popularCategories: ['food_truck', 'food_trailer', 'vendor_lot'],
  },
  phoenix: {
    slug: 'phoenix',
    name: 'Phoenix',
    state: 'AZ',
    tagline: 'The desert\'s hottest food scene',
    supplyHeadline: 'List your asset in Phoenix',
    supplySubheadline: 'Phoenix food entrepreneurs are searching for trucks, trailers, and kitchen space. Get listed today.',
    demandHeadline: 'Find rentals in Phoenix',
    demandSubheadline: 'Browse food trucks, trailers, ghost kitchens, and vendor lots across the Valley of the Sun.',
    stats: {
      activeListings: 28,
      avgDailyRate: 225,
      hostsEarning: 6,
    },
    neighborhoods: ['Downtown', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler', 'Gilbert'],
    popularCategories: ['food_truck', 'food_trailer', 'vendor_lot'],
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
  'ghost-kitchen': {
    slug: 'ghost-kitchen',
    label: 'Ghost Kitchen',
    category: 'ghost_kitchen' as const,
    description: 'Commercial kitchen space for delivery-only concepts',
    icon: '🏭',
  },
  'vendor-lot': {
    slug: 'vendor-lot',
    label: 'Vendor Lot',
    category: 'vendor_lot' as const,
    description: 'Prime location for mobile food vendors',
    icon: '📍',
  },
};

export function getCityFromSlug(slug: string): CityData | null {
  return CITY_DATA[slug] || null;
}

export function getAssetTypeFromSlug(slug: string) {
  return ASSET_TYPES[slug as keyof typeof ASSET_TYPES] || null;
}
