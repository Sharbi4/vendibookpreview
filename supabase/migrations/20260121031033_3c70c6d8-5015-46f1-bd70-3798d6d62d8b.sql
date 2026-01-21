-- Create offers table for sale listings
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  offer_amount NUMERIC NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  seller_response TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '48 hours')
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Buyers can create offers
CREATE POLICY "Buyers can create offers"
ON public.offers
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Buyers can view their own offers
CREATE POLICY "Buyers can view their offers"
ON public.offers
FOR SELECT
USING (auth.uid() = buyer_id);

-- Sellers can view offers on their listings
CREATE POLICY "Sellers can view offers on their listings"
ON public.offers
FOR SELECT
USING (auth.uid() = seller_id);

-- Sellers can update offers (accept/reject)
CREATE POLICY "Sellers can respond to offers"
ON public.offers
FOR UPDATE
USING (auth.uid() = seller_id);

-- Buyers can cancel their pending offers
CREATE POLICY "Buyers can cancel pending offers"
ON public.offers
FOR UPDATE
USING (auth.uid() = buyer_id AND status = 'pending');

-- Admins can view all offers
CREATE POLICY "Admins can view all offers"
ON public.offers
FOR SELECT
USING (is_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_offers_listing_id ON public.offers(listing_id);
CREATE INDEX idx_offers_buyer_id ON public.offers(buyer_id);
CREATE INDEX idx_offers_seller_id ON public.offers(seller_id);
CREATE INDEX idx_offers_status ON public.offers(status);

-- Trigger for updated_at
CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();