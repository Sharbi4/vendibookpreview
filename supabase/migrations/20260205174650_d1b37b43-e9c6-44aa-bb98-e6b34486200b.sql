-- Create listing_events table for storefront updates/events
CREATE TABLE public.listing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  host_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'event', -- 'event', 'update', 'announcement'
  event_date DATE,
  start_time TIME,
  end_time TIME,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- 'weekly', 'monthly', etc.
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;

-- Anyone can view events for published listings
CREATE POLICY "Anyone can view events for published listings"
ON public.listing_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_events.listing_id
    AND listings.status = 'published'
  )
);

-- Hosts can view their own events
CREATE POLICY "Hosts can view their own events"
ON public.listing_events
FOR SELECT
USING (auth.uid() = host_id);

-- Hosts can create events for their listings
CREATE POLICY "Hosts can create events"
ON public.listing_events
FOR INSERT
WITH CHECK (
  auth.uid() = host_id AND
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_events.listing_id
    AND listings.host_id = auth.uid()
  )
);

-- Hosts can update their events
CREATE POLICY "Hosts can update their events"
ON public.listing_events
FOR UPDATE
USING (auth.uid() = host_id);

-- Hosts can delete their events
CREATE POLICY "Hosts can delete their events"
ON public.listing_events
FOR DELETE
USING (auth.uid() = host_id);

-- Create index for faster queries
CREATE INDEX idx_listing_events_listing_id ON public.listing_events(listing_id);
CREATE INDEX idx_listing_events_event_date ON public.listing_events(event_date);