-- Add header_image_url column to profiles table for custom profile banner images
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS header_image_url text;