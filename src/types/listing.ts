export type ListingMode = 'rent' | 'sale';

export type ListingCategory = 'food_truck' | 'food_trailer' | 'ghost_kitchen' | 'vendor_lot';

export type FulfillmentType = 'pickup' | 'delivery' | 'both' | 'on_site';

export type ListingStatus = 'draft' | 'published' | 'paused';

export interface Listing {
  id: string;
  title: string;
  description: string;
  mode: ListingMode;
  category: ListingCategory;
  city: string;
  state: string;
  address?: string;
  images: string[];
  priceDaily?: number;
  priceWeekly?: number;
  priceSale?: number;
  status: ListingStatus;
  fulfillmentType: FulfillmentType;
  pickupLocation?: string;
  deliveryFee?: number;
  deliveryRadiusMiles?: number;
  accessInstructions?: string;
  hoursOfAccess?: string;
  createdAt: string;
  ownerId: string;
}

export const categoryLabels: Record<ListingCategory, string> = {
  food_truck: 'Food Truck',
  food_trailer: 'Food Trailer',
  ghost_kitchen: 'Ghost Kitchen',
  vendor_lot: 'Vendor Lot',
};

export const categoryIcons: Record<ListingCategory, string> = {
  food_truck: '🚚',
  food_trailer: '🛒',
  ghost_kitchen: '🏭',
  vendor_lot: '📍',
};
