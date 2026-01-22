-- Create listing_leads table to capture anonymous visitor info
CREATE TABLE public.listing_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  host_id UUID NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  message TEXT,
  source TEXT DEFAULT 'request_info',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listing_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert leads (for anonymous visitors)
CREATE POLICY "Anyone can create leads"
ON public.listing_leads
FOR INSERT
WITH CHECK (true);

-- Hosts can view leads for their listings
CREATE POLICY "Hosts can view their listing leads"
ON public.listing_leads
FOR SELECT
USING (auth.uid() = host_id);

-- Create index for faster queries
CREATE INDEX idx_listing_leads_host_id ON public.listing_leads(host_id);
CREATE INDEX idx_listing_leads_listing_id ON public.listing_leads(listing_id);