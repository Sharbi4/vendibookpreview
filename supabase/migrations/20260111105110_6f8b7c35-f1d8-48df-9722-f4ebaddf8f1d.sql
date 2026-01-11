-- Create table for blocked dates
CREATE TABLE public.listing_blocked_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  blocked_date date NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(listing_id, blocked_date)
);

-- Enable RLS
ALTER TABLE public.listing_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Hosts can view their own blocked dates
CREATE POLICY "Hosts can view their blocked dates"
ON public.listing_blocked_dates
FOR SELECT
USING (auth.uid() = host_id);

-- Hosts can create blocked dates for their listings
CREATE POLICY "Hosts can create blocked dates"
ON public.listing_blocked_dates
FOR INSERT
WITH CHECK (auth.uid() = host_id);

-- Hosts can delete their blocked dates
CREATE POLICY "Hosts can delete blocked dates"
ON public.listing_blocked_dates
FOR DELETE
USING (auth.uid() = host_id);

-- Anyone can view blocked dates for published listings (for booking form)
CREATE POLICY "Anyone can view blocked dates for published listings"
ON public.listing_blocked_dates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings 
    WHERE id = listing_id AND status = 'published'
  )
);

-- Create index for faster lookups
CREATE INDEX idx_blocked_dates_listing ON public.listing_blocked_dates(listing_id, blocked_date);