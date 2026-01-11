-- Add amenities column to listings table
ALTER TABLE public.listings 
ADD COLUMN amenities text[] DEFAULT '{}'::text[];