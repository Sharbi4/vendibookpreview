-- Create favorites table
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add their own favorites
CREATE POLICY "Users can add their own favorites"
ON public.favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can delete their own favorites"
ON public.favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Hosts can view favorite counts for their listings
CREATE POLICY "Hosts can view favorites on their listings"
ON public.favorites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings 
    WHERE listings.id = favorites.listing_id 
    AND listings.host_id = auth.uid()
  )
);

-- Add index for performance
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_listing_id ON public.favorites(listing_id);

-- Create function to get favorite count for a listing
CREATE OR REPLACE FUNCTION public.get_listing_favorite_count(listing_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER FROM public.favorites WHERE listing_id = listing_uuid;
$$;