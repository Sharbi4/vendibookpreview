-- Additive category only; commit before any statements using the new enum value.
ALTER TYPE public.listing_category ADD VALUE IF NOT EXISTS 'food_cart';
