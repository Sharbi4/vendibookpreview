-- Phase 4 SEO: backfill structured subcategory for coffee/ice-cream listings
-- so specialty category pages can prefer structured data over keyword matching.
-- These six listings were identified by title keyword audit on 2026-08-25.

UPDATE public.listings SET subcategory = 'coffee_beverage', updated_at = updated_at
WHERE id IN (
  '31711bb6-93ed-4ad0-9218-20959c84236c', -- 2025 mobile coffee trailer (Elgin, SC)
  'a02adafe-ad00-40cb-90c7-2a8ccc55f469', -- Coffee Tailer (San Francisco, CA)
  'ee20ce79-1fbc-4885-aaf8-61f4c3a5cc25', -- Gourmet Coffee Cart (Fort Worth, TX)
  'c2457bdb-fad5-4686-90e7-da1f82da7336'  -- Kombi Food and Coffee van (Austin, TX)
);

UPDATE public.listings SET subcategory = 'ice_cream_dessert', updated_at = updated_at
WHERE id IN (
  'ddb8e4cb-3e16-482e-a9c5-845cd6068e4c', -- Dessert & Ice Cream Trailer (San Diego, CA)
  'f1a879a6-6c16-4c17-b902-a2c84b1036ff'  -- Mobile Ice Cream Trailer For Sale (Everett, WA)
);