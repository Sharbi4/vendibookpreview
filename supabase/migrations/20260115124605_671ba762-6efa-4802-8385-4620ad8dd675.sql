-- Create listing_views table to track views
CREATE TABLE public.listing_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT,
  referrer TEXT,
  user_agent TEXT
);

-- Create indexes for efficient querying
CREATE INDEX idx_listing_views_listing_id ON public.listing_views(listing_id);
CREATE INDEX idx_listing_views_viewed_at ON public.listing_views(viewed_at);
CREATE INDEX idx_listing_views_listing_date ON public.listing_views(listing_id, viewed_at);

-- Enable RLS
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert views (for tracking)
CREATE POLICY "Anyone can track views"
ON public.listing_views
FOR INSERT
WITH CHECK (true);

-- Policy: Hosts can view analytics for their own listings
CREATE POLICY "Hosts can view their listing analytics"
ON public.listing_views
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_views.listing_id
    AND listings.host_id = auth.uid()
  )
);

-- Add view_count column to listings for quick access
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create function to increment view count
CREATE OR REPLACE FUNCTION public.increment_listing_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings
  SET view_count = view_count + 1
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-increment view count
CREATE TRIGGER on_listing_view_insert
  AFTER INSERT ON public.listing_views
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_listing_view_count();

-- Enable realtime for listing_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_views;