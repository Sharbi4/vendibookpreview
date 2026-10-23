/** Public city centers, used for approximate straight-line distances, never driving estimates. */
export const BUYER_MARKETS: Record<string, { latitude: number; longitude: number; cities?: string[]; distanceLabel?: string }> = {
  'tucson-az': { latitude: 32.2226, longitude: -110.9747 },
  'phoenix-az': { latitude: 33.4484, longitude: -112.074 },
  'houston-tx': { latitude: 29.7604, longitude: -95.3698 },
  'austin-tx': { latitude: 30.2672, longitude: -97.7431 },
  'dallas-tx': { latitude: 32.7767, longitude: -96.797 },
  'san-antonio-tx': { latitude: 29.4241, longitude: -98.4936 },
  'atlanta-ga': { latitude: 33.749, longitude: -84.388 },
  'miami-fl': { latitude: 25.7617, longitude: -80.1918 },
  'tampa-fl': { latitude: 27.9506, longitude: -82.4572 },
  'charlotte-nc': { latitude: 35.2271, longitude: -80.8431 },
  'portland-or': { latitude: 45.5152, longitude: -122.6784 },
  'los-angeles-ca': { latitude: 34.0522, longitude: -118.2437 },
  'mesa-az': { latitude: 33.4152, longitude: -111.8315 },
  'north-florida': { latitude: 30.3322, longitude: -81.6557, cities: ['Jacksonville', 'Tallahassee', 'Pensacola', 'Gainesville', 'St. Augustine', 'Lake City', 'Panama City', 'Ocala'], distanceLabel: 'Jacksonville' },
};

export function buyerMarketPath(category: string, slug: string): string | null {
  if (category === 'food_truck' && BUYER_MARKETS[slug] && slug !== 'mesa-az') return `/food-trucks-for-sale/${slug}`;
  if (category === 'food_trailer' && ['tucson-az','phoenix-az','houston-tx','mesa-az'].includes(slug)) return `/food-trailers-for-sale/${slug}`;
  return null;
}
