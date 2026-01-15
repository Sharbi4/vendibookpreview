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
  amenities: string[];
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
  latitude?: number | null;
  longitude?: number | null;
  // Vendibook freight fields
  vendibook_freight_enabled?: boolean;
  freight_payer?: FreightPayer | string;
}

// Category-specific amenities
export const AMENITIES_BY_CATEGORY: Record<ListingCategory, { label: string; items: { id: string; label: string }[] }[]> = {
  food_truck: [
    {
      label: 'Kitchen Equipment',
      items: [
        { id: 'three_compartment_sink', label: '3 Compartment Sink' },
        { id: 'hand_wash_sink', label: 'Hand Wash Sink' },
        { id: 'refrigerator', label: 'Refrigerator' },
        { id: 'freezer', label: 'Freezer' },
        { id: 'fryer', label: 'Fryer' },
        { id: 'flat_top_grill', label: 'Flat Top Grill' },
        { id: 'oven', label: 'Oven' },
        { id: 'warmers', label: 'Food Warmers' },
        { id: 'steam_table', label: 'Steam Table' },
        { id: 'hood_system', label: 'Hood Ventilation System' },
      ],
    },
    {
      label: 'Power & Utilities',
      items: [
        { id: 'generator', label: 'Generator Included' },
        { id: 'propane_tanks', label: 'Propane Tanks' },
        { id: 'water_tank', label: 'Fresh Water Tank' },
        { id: 'waste_water_tank', label: 'Waste Water Tank' },
        { id: 'electrical_hookup', label: 'Shore Power Hookup' },
      ],
    },
    {
      label: 'Additional Features',
      items: [
        { id: 'pos_system', label: 'POS System' },
        { id: 'serving_window', label: 'Serving Window' },
        { id: 'awning', label: 'Awning/Canopy' },
        { id: 'ac_unit', label: 'A/C Unit' },
        { id: 'fire_suppression', label: 'Fire Suppression System' },
      ],
    },
  ],
  food_trailer: [
    {
      label: 'Kitchen Equipment',
      items: [
        { id: 'three_compartment_sink', label: '3 Compartment Sink' },
        { id: 'hand_wash_sink', label: 'Hand Wash Sink' },
        { id: 'refrigerator', label: 'Refrigerator' },
        { id: 'freezer', label: 'Freezer' },
        { id: 'fryer', label: 'Fryer' },
        { id: 'flat_top_grill', label: 'Flat Top Grill' },
        { id: 'oven', label: 'Oven' },
        { id: 'warmers', label: 'Food Warmers' },
        { id: 'steam_table', label: 'Steam Table' },
        { id: 'hood_system', label: 'Hood Ventilation System' },
      ],
    },
    {
      label: 'Power & Utilities',
      items: [
        { id: 'generator', label: 'Generator Included' },
        { id: 'propane_tanks', label: 'Propane Tanks' },
        { id: 'water_tank', label: 'Fresh Water Tank' },
        { id: 'waste_water_tank', label: 'Waste Water Tank' },
        { id: 'electrical_hookup', label: 'Shore Power Hookup' },
      ],
    },
    {
      label: 'Additional Features',
      items: [
        { id: 'pos_system', label: 'POS System' },
        { id: 'serving_window', label: 'Serving Window' },
        { id: 'awning', label: 'Awning/Canopy' },
        { id: 'ac_unit', label: 'A/C Unit' },
        { id: 'fire_suppression', label: 'Fire Suppression System' },
      ],
    },
  ],
  ghost_kitchen: [
    {
      label: 'Kitchen Equipment',
      items: [
        { id: 'three_compartment_sink', label: '3 Compartment Sink' },
        { id: 'commercial_refrigerator', label: 'Commercial Refrigerator' },
        { id: 'walk_in_cooler', label: 'Walk-in Cooler' },
        { id: 'walk_in_freezer', label: 'Walk-in Freezer' },
        { id: 'fryer', label: 'Commercial Fryer' },
        { id: 'range', label: 'Commercial Range' },
        { id: 'convection_oven', label: 'Convection Oven' },
        { id: 'prep_tables', label: 'Prep Tables' },
        { id: 'hood_system', label: 'Hood Ventilation System' },
      ],
    },
    {
      label: 'Utilities & Infrastructure',
      items: [
        { id: 'grease_trap', label: 'Grease Trap' },
        { id: 'fire_suppression', label: 'Fire Suppression System' },
        { id: 'hvac', label: 'HVAC System' },
        { id: 'high_voltage', label: 'High Voltage Electrical' },
        { id: 'gas_hookup', label: 'Gas Hookup' },
      ],
    },
    {
      label: 'Additional Features',
      items: [
        { id: 'storage_area', label: 'Storage Area' },
        { id: 'office_space', label: 'Office Space' },
        { id: 'restroom', label: 'Restroom Access' },
        { id: 'loading_dock', label: 'Loading Dock' },
        { id: 'wifi', label: 'WiFi Included' },
      ],
    },
  ],
  vendor_lot: [
    {
      label: 'Utility Hookups',
      items: [
        { id: 'electric_hookup', label: 'Electric Hookup' },
        { id: 'water_hookup', label: 'Water Hookup' },
        { id: 'trash_service', label: 'Trash Service' },
        { id: 'oil_dumping', label: 'Oil Dumping Available' },
        { id: 'grease_disposal', label: 'Grease Disposal' },
        { id: 'sewage_hookup', label: 'Sewage Hookup' },
      ],
    },
    {
      label: 'Location Features',
      items: [
        { id: 'major_street', label: 'Major Street Location' },
        { id: 'high_traffic', label: 'High Traffic Area' },
        { id: 'corner_lot', label: 'Corner Lot' },
        { id: 'visibility', label: 'High Visibility' },
        { id: 'parking_available', label: 'Customer Parking' },
      ],
    },
    {
      label: 'Amenities',
      items: [
        { id: 'covered_parking', label: 'Covered Parking' },
        { id: 'customer_seating', label: 'Customer Seating Area' },
        { id: 'restroom_access', label: 'Restroom Access' },
        { id: 'security', label: '24/7 Security' },
        { id: 'lighting', label: 'Night Lighting' },
        { id: 'wifi', label: 'WiFi Available' },
      ],
    },
  ],
};

export type FreightPayer = 'buyer' | 'seller';

export type FreightCategory = 'standard' | 'fragile' | 'heavy_equipment' | 'oversized';

export const FREIGHT_CATEGORY_LABELS: Record<FreightCategory, string> = {
  standard: 'Standard',
  fragile: 'Fragile',
  heavy_equipment: 'Heavy Equipment',
  oversized: 'Oversized',
};

export interface ListingFormData {
  mode: ListingMode | null;
  category: ListingCategory | null;
  title: string;
  description: string;
  highlights: string[];
  amenities: string[];
  fulfillment_type: FulfillmentType | null;
  is_static_location: boolean;
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
  // Vendibook Freight settings (for sales)
  vendibook_freight_enabled: boolean;
  freight_payer: FreightPayer;
  // Item dimensions for freight estimates
  weight_lbs: string;
  length_inches: string;
  width_inches: string;
  height_inches: string;
  freight_category: FreightCategory | null;
  // Required documents for rentals
  required_documents?: {
    document_type: string;
    is_required: boolean;
    deadline_type: string;
    deadline_offset_hours?: number;
    description?: string;
  }[];
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
