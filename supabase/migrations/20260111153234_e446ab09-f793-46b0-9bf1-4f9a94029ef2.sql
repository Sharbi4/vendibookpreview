-- Seed demo listings for testing listing detail pages and booking flow
-- All listings assigned to the existing host profile

INSERT INTO listings (
  host_id, title, description, mode, category, status,
  highlights, amenities, fulfillment_type, 
  pickup_location_text, address, latitude, longitude,
  delivery_fee, delivery_radius_miles,
  access_instructions, hours_of_access,
  price_daily, price_weekly, price_sale,
  cover_image_url, image_urls, published_at
) VALUES 
-- 1. Taco Truck (rent, food_truck)
(
  '9aae25c4-8340-4b3d-98f0-d307b91bff9c',
  'Fully Equipped Taco Truck',
  'Professional-grade food truck perfect for starting your mobile taco business. Features a complete kitchen setup with commercial-grade equipment, fresh water and waste water tanks, and a powerful generator. Recently inspected and ready to roll!',
  'rent', 'food_truck', 'published',
  ARRAY['Turnkey operation ready', 'All permits current', 'Low mileage', 'Recently serviced'],
  ARRAY['three_compartment_sink', 'hand_wash_sink', 'refrigerator', 'flat_top_grill', 'fryer', 'generator', 'propane_tanks', 'water_tank', 'hood_system', 'fire_suppression'],
  'both',
  'Downtown Austin Food Truck Park',
  '1234 Congress Ave, Austin, TX 78701',
  30.2672, -97.7431,
  75, 25,
  NULL, NULL,
  350, 1800, NULL,
  'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=800',
  ARRAY['https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=800', 'https://images.unsplash.com/photo-1567129937968-cdad8f07e2f8?w=800'],
  NOW()
),

-- 2. Burger Food Truck for Sale
(
  '9aae25c4-8340-4b3d-98f0-d307b91bff9c',
  'Food Truck for Sale - Burger Setup',
  'Well-maintained food truck with proven burger concept. Includes all equipment, established social media following, and training available. Perfect for entrepreneurs ready to own their food business.',
  'sale', 'food_truck', 'published',
  ARRAY['Profitable business model', 'Training included', '5-star health rating', 'Loyal customer base'],
  ARRAY['three_compartment_sink', 'hand_wash_sink', 'refrigerator', 'freezer', 'flat_top_grill', 'fryer', 'generator', 'pos_system', 'serving_window', 'ac_unit'],
  'pickup',
  'San Antonio Metro Area',
  '456 Market Square, San Antonio, TX 78205',
  29.4241, -98.4936,
  NULL, NULL,
  NULL, NULL,
  NULL, NULL, 68000,
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
  ARRAY['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800'],
  NOW()
),

-- 3. Mobile Kitchen Trailer (rent)
(
  '9aae25c4-8340-4b3d-98f0-d307b91bff9c',
  'Mobile Kitchen Trailer - Event Ready',
  'Spacious food trailer ideal for catering events and festivals. Features a full commercial kitchen with ample prep space. Easy to tow and set up. Available for daily or weekly rentals.',
  'rent', 'food_trailer', 'published',
  ARRAY['Perfect for events', 'Easy setup', 'Ample prep space', 'Climate controlled'],
  ARRAY['three_compartment_sink', 'hand_wash_sink', 'refrigerator', 'freezer', 'flat_top_grill', 'oven', 'steam_table', 'hood_system', 'awning', 'ac_unit'],
  'delivery',
  NULL,
  '789 Festival Blvd, Houston, TX 77002',
  29.7604, -95.3698,
  150, 50,
  NULL, NULL,
  225, 1200, NULL,
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
  ARRAY['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'],
  NOW()
),

-- 4. Pizza Oven Trailer for Sale
(
  '9aae25c4-8340-4b3d-98f0-d307b91bff9c',
  'Wood-Fired Pizza Trailer',
  'Authentic wood-fired pizza trailer with imported Italian oven. Creates restaurant-quality Neapolitan pizzas in 90 seconds. Unique concept that stands out at events and farmers markets.',
  'sale', 'food_trailer', 'published',
  ARRAY['Authentic Italian oven', 'High profit margins', 'Unique concept', 'Festival favorite'],
  ARRAY['hand_wash_sink', 'refrigerator', 'oven', 'propane_tanks', 'water_tank', 'serving_window', 'awning'],
  'pickup',
  'Dallas Area',
  '321 Deep Ellum St, Dallas, TX 75226',
  32.7767, -96.7970,
  NULL, NULL,
  NULL, NULL,
  NULL, NULL, 32000,
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
  ARRAY['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800'],
  NOW()
),

-- 5. Ghost Kitchen Space (rent)
(
  '9aae25c4-8340-4b3d-98f0-d307b91bff9c',
  'Modern Ghost Kitchen Space',
  'Fully equipped commercial kitchen space in a shared facility. Perfect for delivery-only restaurant concepts, meal prep businesses, or catering operations. 24/7 access with all utilities included.',
  'rent', 'ghost_kitchen', 'published',
  ARRAY['24/7 access', 'All utilities included', 'Loading dock access', 'Health dept approved'],
  ARRAY['three_compartment_sink', 'commercial_refrigerator', 'walk_in_cooler', 'range', 'convection_oven', 'prep_tables', 'hood_system', 'grease_trap', 'fire_suppression', 'storage_area', 'wifi'],
  'on_site',
  NULL,
  '500 Industrial Way, Austin, TX 78702',
  30.2650, -97.7200,
  NULL, NULL,
  'Enter through loading dock on east side. Check in at front desk for access card.',
  'Available 24/7. Quiet hours 10pm-6am.',
  200, 1000, NULL,
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
  ARRAY['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800'],
  NOW()
),

-- 6. Prime Vendor Lot (rent)
(
  '9aae25c4-8340-4b3d-98f0-d307b91bff9c',
  'Prime Corner Vendor Lot',
  'High-visibility corner lot in busy commercial area. Perfect for food trucks or trailers. Includes electric hookup, water access, and customer parking. Heavy foot traffic from nearby office buildings.',
  'rent', 'vendor_lot', 'published',
  ARRAY['Corner location', 'High foot traffic', 'Office crowd nearby', 'Ample parking'],
  ARRAY['electric_hookup', 'water_hookup', 'trash_service', 'major_street', 'high_traffic', 'corner_lot', 'visibility', 'parking_available', 'customer_seating', 'lighting'],
  'on_site',
  NULL,
  '100 Business Center Dr, Austin, TX 78759',
  30.3950, -97.7350,
  NULL, NULL,
  'Gate code provided after booking. Park in designated vendor spot.',
  'Monday-Friday 6am-9pm, Saturday 8am-6pm',
  100, 500, NULL,
  'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=800',
  ARRAY['https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=800', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800'],
  NOW()
);