-- Create enum for listing mode
CREATE TYPE public.listing_mode AS ENUM ('rent', 'sale');

-- Create enum for listing category
CREATE TYPE public.listing_category AS ENUM ('food_truck', 'food_trailer', 'ghost_kitchen', 'vendor_lot');

-- Create enum for fulfillment type
CREATE TYPE public.fulfillment_type AS ENUM ('pickup', 'delivery', 'both', 'on_site');

-- Create enum for listing status
CREATE TYPE public.listing_status AS ENUM ('draft', 'published', 'paused');

-- Create listings table
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  mode listing_mode NOT NULL,
  category listing_category NOT NULL,
  status listing_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  highlights TEXT[] DEFAULT '{}',
  
  -- Location & Fulfillment
  fulfillment_type fulfillment_type NOT NULL,
  pickup_location_text TEXT,
  address TEXT,
  delivery_fee NUMERIC(10,2),
  delivery_radius_miles INTEGER,
  pickup_instructions TEXT,
  delivery_instructions TEXT,
  access_instructions TEXT,
  hours_of_access TEXT,
  location_notes TEXT,
  
  -- Pricing
  price_daily NUMERIC(10,2),
  price_weekly NUMERIC(10,2),
  price_sale NUMERIC(10,2),
  
  -- Availability (for rentals)
  available_from DATE,
  available_to DATE,
  
  -- Images (stored as URLs from storage)
  cover_image_url TEXT,
  image_urls TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view published listings"
ON public.listings
FOR SELECT
USING (status = 'published');

CREATE POLICY "Hosts can view their own listings"
ON public.listings
FOR SELECT
USING (auth.uid() = host_id);

CREATE POLICY "Hosts can create listings"
ON public.listings
FOR INSERT
WITH CHECK (
  auth.uid() = host_id 
  AND public.has_role(auth.uid(), 'host')
);

CREATE POLICY "Hosts can update their own listings"
ON public.listings
FOR UPDATE
USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their own listings"
ON public.listings
FOR DELETE
USING (auth.uid() = host_id);

-- Trigger for updated_at
CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add stripe_account_id to profiles for Stripe Connect
ALTER TABLE public.profiles 
ADD COLUMN stripe_account_id TEXT,
ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT false;

-- Create storage bucket for listing images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('listing-images', 'listing-images', true);

-- Storage policies for listing images
CREATE POLICY "Anyone can view listing images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'listing-images');

CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own listing images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'listing-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own listing images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'listing-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);