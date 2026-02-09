export type ListingMode = 'rent' | 'sale';

// Include both vendor_space (new) and vendor_lot (legacy) for backward compatibility
export type ListingCategory = 'food_truck' | 'food_trailer' | 'ghost_kitchen' | 'vendor_space' | 'vendor_lot';

export type FulfillmentType = 'pickup' | 'delivery' | 'both' | 'on_site';

export type ListingStatus = 'draft' | 'published' | 'paused';

// Subcategory types for each main category
export type FoodTruckSubcategory = 
  | 'full_service_kitchen' 
  | 'coffee_beverage' 
  | 'bbq_smoker' 
  | 'pizza_truck' 
  | 'ice_cream_dessert';

export type FoodTrailerSubcategory = 
  | 'concession_trailer' 
  | 'catering_trailer' 
  | 'bbq_pit_trailer' 
  | 'mobile_bar' 
  | 'specialty_food';

export type GhostKitchenSubcategory = 
  | 'commercial_kitchen' 
  | 'cottage_kitchen' 
  | 'bakery_kitchen' 
  | 'prep_kitchen' 
  | 'shared_commissary';

export type VendorSpaceSubcategory = 
  | 'festival_ground' 
  | 'farmers_market' 
  | 'brewery_patio' 
  | 'private_event' 
  | 'street_corner'
  | 'food_truck_park';

export type ListingSubcategory = 
  | FoodTruckSubcategory 
  | FoodTrailerSubcategory 
  | GhostKitchenSubcategory 
  | VendorSpaceSubcategory;

// Subcategory options mapped by parent category
export const SUBCATEGORIES_BY_CATEGORY: Record<ListingCategory, { 
  value: string; 
  label: string; 
  description: string 
}[]> = {
  food_truck: [
    { value: 'full_service_kitchen', label: 'Full-Service Kitchen', description: 'Complete cooking setup for any cuisine' },
    { value: 'coffee_beverage', label: 'Coffee & Beverage', description: 'Espresso, smoothies, and specialty drinks' },
    { value: 'bbq_smoker', label: 'BBQ & Smoker', description: 'Built-in smoker and grill setup' },
    { value: 'pizza_truck', label: 'Pizza Truck', description: 'Wood-fired or deck oven for pizza' },
    { value: 'ice_cream_dessert', label: 'Ice Cream & Dessert', description: 'Freezers and soft-serve equipment' },
  ],
  food_trailer: [
    { value: 'concession_trailer', label: 'Concession Trailer', description: 'Classic fair-style food service' },
    { value: 'catering_trailer', label: 'Catering Trailer', description: 'High-volume event catering setup' },
    { value: 'bbq_pit_trailer', label: 'BBQ Pit Trailer', description: 'Dedicated smoker and BBQ pit' },
    { value: 'mobile_bar', label: 'Mobile Bar', description: 'Beverage service with bar setup' },
    { value: 'specialty_food', label: 'Specialty Food Trailer', description: 'Unique cuisine or concept builds' },
  ],
  ghost_kitchen: [
    { value: 'commercial_kitchen', label: 'Commercial Kitchen', description: 'Full commercial-grade facility' },
    { value: 'cottage_kitchen', label: 'Cottage Kitchen', description: 'Licensed home kitchen for cottage food' },
    { value: 'bakery_kitchen', label: 'Bakery Kitchen', description: 'Ovens, mixers, and pastry equipment' },
    { value: 'prep_kitchen', label: 'Prep Kitchen', description: 'Prep-only space for off-site cooking' },
    { value: 'shared_commissary', label: 'Shared Commissary', description: 'Multi-vendor shared kitchen space' },
  ],
  vendor_space: [
    { value: 'festival_ground', label: 'Festival Ground', description: 'High-traffic event and festival spots' },
    { value: 'farmers_market', label: 'Farmers Market Spot', description: 'Weekly market vendor locations' },
    { value: 'brewery_patio', label: 'Brewery/Bar Patio', description: 'Partnered taproom or bar location' },
    { value: 'private_event', label: 'Private Event Space', description: 'Bookable for private functions' },
    { value: 'street_corner', label: 'Street Corner Spot', description: 'Permitted street vending locations' },
    { value: 'food_truck_park', label: 'Food Truck Park', description: 'Dedicated park with multiple vendor slots and shared amenities' },
  ],
  // Legacy alias for vendor_space
  vendor_lot: [
    { value: 'festival_ground', label: 'Festival Ground', description: 'High-traffic event and festival spots' },
    { value: 'farmers_market', label: 'Farmers Market Spot', description: 'Weekly market vendor locations' },
    { value: 'brewery_patio', label: 'Brewery/Bar Patio', description: 'Partnered taproom or bar location' },
    { value: 'private_event', label: 'Private Event Space', description: 'Bookable for private functions' },
    { value: 'street_corner', label: 'Street Corner Spot', description: 'Permitted street vending locations' },
    { value: 'food_truck_park', label: 'Food Truck Park', description: 'Dedicated park with multiple vendor slots and shared amenities' },
  ],
};

// Labels for display
export const SUBCATEGORY_LABELS: Record<string, string> = {
  // Food Truck
  full_service_kitchen: 'Full-Service Kitchen',
  coffee_beverage: 'Coffee & Beverage',
  bbq_smoker: 'BBQ & Smoker',
  pizza_truck: 'Pizza Truck',
  ice_cream_dessert: 'Ice Cream & Dessert',
  // Food Trailer
  concession_trailer: 'Concession Trailer',
  catering_trailer: 'Catering Trailer',
  bbq_pit_trailer: 'BBQ Pit Trailer',
  mobile_bar: 'Mobile Bar',
  specialty_food: 'Specialty Food Trailer',
  // Ghost Kitchen
  commercial_kitchen: 'Commercial Kitchen',
  cottage_kitchen: 'Cottage Kitchen',
  bakery_kitchen: 'Bakery Kitchen',
  prep_kitchen: 'Prep Kitchen',
  shared_commissary: 'Shared Commissary',
  // Vendor Space
  festival_ground: 'Festival Ground',
  farmers_market: 'Farmers Market Spot',
  brewery_patio: 'Brewery/Bar Patio',
  private_event: 'Private Event Space',
  street_corner: 'Street Corner Spot',
  food_truck_park: 'Food Truck Park',
};

export interface Listing {
  id: string;
  host_id: string;
  mode: ListingMode;
  category: ListingCategory;
  subcategory?: string | null;
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
  price_monthly: number | null;
  price_hourly: number | null;
  price_sale: number | null;
  available_from: string | null;
  available_to: string | null;
  cover_image_url: string | null;
  image_urls: string[];
  video_urls?: string[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
  latitude?: number | null;
  longitude?: number | null;
  // Instant Book (for rentals)
  instant_book?: boolean;
  // Security deposit for rentals
  deposit_amount?: number | null;
  // Vendibook freight fields
  vendibook_freight_enabled?: boolean;
  freight_payer?: FreightPayer | string;
  // Payment method preferences (for sales)
  accept_cash_payment?: boolean;
  accept_card_payment?: boolean;
  // Multi-slot capacity for Vendor Spaces
  total_slots?: number;
}

// Category-specific amenities
export const AMENITIES_BY_CATEGORY: Record<ListingCategory, { label: string; items: { id: string; label: string }[] }[]> = {
  food_truck: [
    {
      label: 'Core Utilities',
      items: [
        { id: 'generator', label: 'Generator Included' },
        { id: 'shore_power', label: 'Shore Power (Plug-in)' },
        { id: 'propane_system', label: 'Propane System' },
        { id: 'solar_battery', label: 'Solar / Battery System' },
        { id: 'fresh_water_tank', label: 'Fresh Water Tank' },
        { id: 'grey_water_tank', label: 'Grey Water Tank' },
        { id: 'hot_water_heater', label: 'Hot Water Heater' },
      ],
    },
    {
      label: 'Kitchen & Cooking',
      items: [
        { id: 'hood_system', label: 'Hood System' },
        { id: 'fire_suppression', label: 'Fire Suppression System' },
        { id: 'flat_top_grill', label: 'Flat Top Grill' },
        { id: 'fryer', label: 'Fryer' },
        { id: 'range_burners', label: 'Range / Burners' },
        { id: 'oven', label: 'Oven' },
        { id: 'microwave', label: 'Microwave' },
        { id: 'steam_table', label: 'Steam Table / Hot Holding' },
        { id: 'prep_tables', label: 'Prep Table(s)' },
        { id: 'food_warmer', label: 'Food Warmer / Heat Lamps' },
      ],
    },
    {
      label: 'Cold Storage',
      items: [
        { id: 'refrigerator', label: 'Refrigerator' },
        { id: 'freezer', label: 'Freezer' },
        { id: 'reach_in_fridge', label: 'Reach-In Fridge' },
        { id: 'undercounter_fridge', label: 'Undercounter Fridge' },
      ],
    },
    {
      label: 'Service & Build',
      items: [
        { id: 'serving_window', label: 'Serving Window' },
        { id: 'pos_shelf', label: 'POS Shelf / Counter Space' },
        { id: 'menu_board_mount', label: 'Menu Board Mount' },
        { id: 'exterior_lighting', label: 'Exterior Lighting' },
        { id: 'awning', label: 'Awning' },
      ],
    },
    {
      label: 'Cleaning & Safety',
      items: [
        { id: 'three_compartment_sink', label: '3-Compartment Sink' },
        { id: 'handwashing_sink', label: 'Handwashing Sink' },
        { id: 'nsf_surfaces', label: 'NSF Surfaces' },
        { id: 'first_aid_kit', label: 'First Aid Kit' },
        { id: 'fire_extinguisher', label: 'Fire Extinguisher(s)' },
      ],
    },
    {
      label: 'Comfort & Ops',
      items: [
        { id: 'ac', label: 'AC' },
        { id: 'heat', label: 'Heat' },
        { id: 'storage_cabinets', label: 'Storage Cabinets' },
        { id: 'staff_seating', label: 'Staff Seating' },
      ],
    },
  ],
  food_trailer: [
    {
      label: 'Utilities',
      items: [
        { id: 'shore_power', label: 'Shore Power' },
        { id: 'generator', label: 'Generator Included' },
        { id: 'propane_system', label: 'Propane System' },
        { id: 'fresh_water_tank', label: 'Fresh Water Tank' },
        { id: 'grey_water_tank', label: 'Grey Water Tank' },
        { id: 'hot_water_heater', label: 'Hot Water Heater' },
      ],
    },
    {
      label: 'Kitchen',
      items: [
        { id: 'hood_system', label: 'Hood System' },
        { id: 'fire_suppression', label: 'Fire Suppression' },
        { id: 'flat_top_grill', label: 'Flat Top' },
        { id: 'fryer', label: 'Fryer' },
        { id: 'range_burners', label: 'Range / Burners' },
        { id: 'oven', label: 'Oven' },
        { id: 'prep_tables', label: 'Prep Table(s)' },
        { id: 'steam_table', label: 'Steam Table / Hot Holding' },
      ],
    },
    {
      label: 'Cold Storage',
      items: [
        { id: 'refrigerator', label: 'Refrigerator' },
        { id: 'freezer', label: 'Freezer' },
        { id: 'reach_in_fridge', label: 'Reach-In' },
        { id: 'undercounter_fridge', label: 'Undercounter Fridge' },
      ],
    },
    {
      label: 'Build & Service',
      items: [
        { id: 'serving_window', label: 'Serving Window' },
        { id: 'dual_windows', label: 'Dual Windows' },
        { id: 'awning', label: 'Awning' },
        { id: 'exterior_lighting', label: 'Exterior Lighting' },
        { id: 'pass_through', label: 'Pass-Through' },
      ],
    },
    {
      label: 'Cleaning & Safety',
      items: [
        { id: 'three_compartment_sink', label: '3-Comp Sink' },
        { id: 'handwashing_sink', label: 'Hand Sink' },
        { id: 'fire_extinguisher', label: 'Fire Extinguisher(s)' },
      ],
    },
  ],
  ghost_kitchen: [
    {
      label: 'Infrastructure',
      items: [
        { id: 'type_i_hood', label: 'Type I Hood' },
        { id: 'type_ii_hood', label: 'Type II Hood' },
        { id: 'fire_suppression', label: 'Fire Suppression' },
        { id: 'grease_trap', label: 'Grease Trap' },
        { id: 'floor_drains', label: 'Floor Drains' },
        { id: 'sprinkler_system', label: 'Sprinkler System' },
      ],
    },
    {
      label: 'Prep & Storage',
      items: [
        { id: 'prep_tables', label: 'Prep Tables' },
        { id: 'shelving_storage', label: 'Shelving / Dry Storage' },
        { id: 'walk_in_cooler', label: 'Walk-In Cooler' },
        { id: 'walk_in_freezer', label: 'Walk-In Freezer' },
        { id: 'reach_in_fridge', label: 'Reach-In Fridge' },
        { id: 'freezer', label: 'Freezer' },
      ],
    },
    {
      label: 'Warewashing',
      items: [
        { id: 'three_compartment_sink', label: '3-Comp Sink' },
        { id: 'dish_pit', label: 'Dish Pit' },
        { id: 'commercial_dishwasher', label: 'Commercial Dishwasher' },
      ],
    },
    {
      label: 'Equipment Access',
      items: [
        { id: 'shared_equipment', label: 'Shared Equipment Access' },
        { id: 'dedicated_equipment', label: 'Dedicated Equipment Allowed' },
        { id: 'cold_storage_included', label: 'Cold Storage Included' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { id: 'dedicated_station', label: 'Dedicated Station' },
        { id: 'private_suite', label: 'Private Kitchen Suite' },
        { id: 'packaging_station', label: 'Packaging Station' },
        { id: 'loading_dock', label: 'Loading Zone / Dock' },
        { id: 'onsite_parking', label: 'On-site Parking' },
        { id: 'security_cameras', label: 'Security Cameras' },
      ],
    },
    {
      label: 'Compliance',
      items: [
        { id: 'health_inspected', label: 'Health Inspected Facility' },
        { id: 'commissary_rules', label: 'Shared Commissary Rules' },
        { id: 'permit_guidance', label: 'Permit Guidance Available' },
      ],
    },
  ],
  vendor_space: [
    {
      label: 'Hookups',
      items: [
        { id: 'power_110v', label: 'Power Hookup (110v)' },
        { id: 'power_220v', label: 'Power Hookup (220v/240v)' },
        { id: 'water_hookup', label: 'Water Hookup' },
        { id: 'sewer_hookup', label: 'Sewer Hookup' },
        { id: 'dump_station', label: 'Dump Station' },
      ],
    },
    {
      label: 'Site Features',
      items: [
        { id: 'high_foot_traffic', label: 'High Foot Traffic' },
        { id: 'near_nightlife', label: 'Near Nightlife' },
        { id: 'near_office', label: 'Near Office District' },
        { id: 'event_space', label: 'Event Space' },
        { id: 'covered_shade', label: 'Covered / Shade' },
        { id: 'seating_area', label: 'Seating Area' },
        { id: 'stage_entertainment', label: 'Stage / Entertainment Area' },
        { id: 'lighting', label: 'Lighting' },
      ],
    },
    {
      label: 'Guest Amenities',
      items: [
        { id: 'restrooms_onsite', label: 'Restrooms On-site' },
        { id: 'handwash_stations', label: 'Handwash Stations' },
        { id: 'trash_service', label: 'Trash Service' },
        { id: 'wifi', label: 'WiFi Available' },
      ],
    },
    {
      label: 'Safety & Access',
      items: [
        { id: 'security_onsite', label: 'Security On-site' },
        { id: 'gated_lot', label: 'Gated Lot' },
        { id: 'cameras', label: 'Cameras' },
        { id: 'overnight_parking', label: 'Overnight Parking Allowed' },
        { id: 'access_24_7', label: '24/7 Access' },
        { id: 'staff_onsite', label: 'Staff On-site' },
      ],
    },
    {
      label: 'Rules & Positioning',
      items: [
        { id: 'exclusive_spot', label: 'Exclusive Spot' },
        { id: 'rotating_spots', label: 'Rotating Spots' },
        { id: 'alcohol_allowed', label: 'Alcohol Allowed' },
        { id: 'family_friendly', label: 'Family Friendly' },
      ],
    },
  ],
  // Legacy alias for vendor_space
  vendor_lot: [
    {
      label: 'Hookups',
      items: [
        { id: 'power_110v', label: 'Power Hookup (110v)' },
        { id: 'power_220v', label: 'Power Hookup (220v/240v)' },
        { id: 'water_hookup', label: 'Water Hookup' },
        { id: 'sewer_hookup', label: 'Sewer Hookup' },
        { id: 'dump_station', label: 'Dump Station' },
      ],
    },
  ],
};

// Listing tags for search and filtering
export const LISTING_TAGS: Record<ListingCategory, { general: string[]; rent: string[]; sale: string[] }> = {
  food_truck: {
    general: [
      'Turnkey Ready',
      'Fully Equipped',
      'Beginner Friendly',
      'High Capacity',
      'Event Ready',
      'Commissary Compliant',
      'Newly Renovated',
      'Great for Festivals',
      'Great for Catering',
    ],
    rent: [
      'Deposit Required',
      'Cleaning Fee',
      'Min Rental Days',
      'Training Included',
      'Delivery Setup Available',
    ],
    sale: [
      'Business Included',
      'Maintenance Records Included',
      'Financing Available',
      'Accepts Offers',
    ],
  },
  food_trailer: {
    general: [
      'Lightweight Tow',
      'Easy Setup',
      'Turnkey Ready',
      'Fully Equipped',
      'Great for Events',
      'Great for Pop-Ups',
      'Custom Build',
      'New Build',
      'High Capacity',
    ],
    rent: [
      'Delivery Available',
      'Setup Assistance',
      'Deposit Required',
      'Cleaning Fee',
      'Min Rental Days',
    ],
    sale: [
      'VIN / Title Ready',
      'Maintenance Records Included',
      'Accepts Offers',
    ],
  },
  ghost_kitchen: {
    general: [
      'Delivery App Ready',
      'Startup Friendly',
      'High Volume',
      'Shared Kitchen',
      'Private Suite',
      '24/7 Access',
      'Peak Hours Available',
      'Storage Included',
    ],
    rent: [
      'Hourly',
      'Daily',
      'Monthly',
      'Dedicated Station',
      'Storage Included',
      'Cleaning Included',
      'Cleaning Fee',
    ],
    sale: [
      'Lease Transfer Available',
      'Buildout Included',
      'Accepts Offers',
    ],
  },
  vendor_space: {
    general: [
      'Prime Location',
      'High Visibility',
      'Built-in Audience',
      'Weekend Markets',
      'Long-Term Spots',
      'First-Time Vendor Friendly',
      'Event Ready',
      'Multiple Slots Available',
    ],
    rent: [
      'Daily Spot',
      'Weekly Spot',
      'Monthly Spot',
      'Reserved Spot',
      'Permit Guidance Available',
      'Utilities Included',
      'Utilities Extra',
    ],
    sale: [
      'Lease Included',
      'Business Included',
      'Accepts Offers',
    ],
  },
  // Legacy alias
  vendor_lot: {
    general: [
      'Prime Location',
      'High Visibility',
      'Multiple Slots Available',
    ],
    rent: ['Daily Spot', 'Weekly Spot', 'Monthly Spot'],
    sale: ['Lease Included', 'Business Included'],
  },
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
  subcategory: string | null;
  title: string;
  description: string;
  highlights: string[];
  amenities: string[];
  fulfillment_type: FulfillmentType | null;
  is_static_location: boolean;
  pickup_location_text: string;
  // Legacy single address field (deprecated, kept for backwards compatibility)
  address: string;
  // Structured address fields (Airbnb-style)
  country: string;
  street_address: string;
  apt_suite: string;
  city: string;
  state: string;
  zip_code: string;
  show_precise_location: boolean;
  delivery_fee: string;
  delivery_radius_miles: string;
  pickup_instructions: string;
  delivery_instructions: string;
  access_instructions: string;
  hours_of_access: string;
  location_notes: string;
  price_hourly: string;
  price_daily: string;
  price_weekly: string;
  price_monthly: string;
  price_sale: string;
  available_from: string;
  available_to: string;
  images: File[];
  existingImages: string[];
  videos: File[];
  existingVideos: string[];
  // Instant Book (for rentals)
  instant_book: boolean;
  // Security deposit for rentals
  deposit_amount: string;
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
  // Payment method preferences (for sales)
  accept_cash_payment: boolean;
  accept_card_payment: boolean;
  // Proof Notary add-on (for sales)
  proof_notary_enabled: boolean;
  // Featured Listing add-on (for both rentals and sales)
  featured_enabled: boolean;
  // Multi-slot capacity for Vendor Spaces (default 1)
  total_slots: number;
}

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  food_truck: 'Food Truck',
  food_trailer: 'Food Trailer',
  ghost_kitchen: 'Shared Kitchen',
  vendor_space: 'Vendor Space',
  vendor_lot: 'Vendor Space', // Legacy alias
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
  return category === 'ghost_kitchen' || category === 'vendor_space' || category === 'vendor_lot';
};
