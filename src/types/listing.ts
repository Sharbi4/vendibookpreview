export type ListingMode = 'rent' | 'sale';

export type ListingCategory = 'food_truck' | 'food_trailer' | 'ghost_kitchen' | 'vendor_lot';

export type FulfillmentType = 'pickup' | 'delivery' | 'both' | 'on_site';

export type ListingStatus = 'draft' | 'published' | 'paused';

export interface Listing {
  id: string;
  host_id: string;
  mode: ListingMode;
  category: ListingCategory;
  status: ListingStatus;
  title: string;
  description: string;
  highlights: string[];
  fulfillment_type: FulfillmentType;
  pickup_location_text: string | null;
  address: string | null;
  delivery_fee: number | null;
  delivery_radius_miles: number | null;
  pickup_instructions: string | null;
  delivery_instructions: string | null;
  access_instructions: string | null;
  hours_of_access: string | null;
  location_notes: string | null;
  price_daily: number | null;
  price_weekly: number | null;
  price_sale: number | null;
  available_from: string | null;
  available_to: string | null;
  cover_image_url: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface ListingFormData {
  mode: ListingMode | null;
  category: ListingCategory | null;
  title: string;
  description: string;
  highlights: string[];
  fulfillment_type: FulfillmentType | null;
  pickup_location_text: string;
  address: string;
  delivery_fee: string;
  delivery_radius_miles: string;
  pickup_instructions: string;
  delivery_instructions: string;
  access_instructions: string;
  hours_of_access: string;
  location_notes: string;
  price_daily: string;
  price_weekly: string;
  price_sale: string;
  available_from: string;
  available_to: string;
  images: File[];
  existingImages: string[];
}

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  food_truck: 'Food Truck',
  food_trailer: 'Food Trailer',
  ghost_kitchen: 'Ghost Kitchen',
  vendor_lot: 'Vendor Lot',
};

export const MODE_LABELS: Record<ListingMode, string> = {
  rent: 'For Rent',
  sale: 'For Sale',
};

export const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  pickup: 'Pickup Only',
  delivery: 'Delivery Only',
  both: 'Pickup & Delivery',
  on_site: 'On-site Access',
};

export const isMobileAsset = (category: ListingCategory | null): boolean => {
  return category === 'food_truck' || category === 'food_trailer';
};

export const isStaticLocation = (category: ListingCategory | null): boolean => {
  return category === 'ghost_kitchen' || category === 'vendor_lot';
};
