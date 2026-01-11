-- Create reviews table for completed bookings
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  host_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews for published listings
CREATE POLICY "Anyone can view reviews for published listings"
ON public.reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = reviews.listing_id
    AND listings.status = 'published'
  )
);

-- Hosts can view reviews for their listings
CREATE POLICY "Hosts can view their reviews"
ON public.reviews
FOR SELECT
USING (auth.uid() = host_id);

-- Shoppers can view their own reviews
CREATE POLICY "Reviewers can view their own reviews"
ON public.reviews
FOR SELECT
USING (auth.uid() = reviewer_id);

-- Shoppers can create reviews for their completed bookings
CREATE POLICY "Shoppers can create reviews for completed bookings"
ON public.reviews
FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id
  AND EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id = reviews.booking_id
    AND br.shopper_id = auth.uid()
    AND br.status = 'completed'
  )
);

-- Shoppers can update their own reviews
CREATE POLICY "Reviewers can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = reviewer_id);

-- Trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;