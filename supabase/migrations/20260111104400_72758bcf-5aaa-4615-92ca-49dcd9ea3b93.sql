-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM ('pending', 'approved', 'declined', 'cancelled', 'completed');

-- Create booking_requests table
CREATE TABLE public.booking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  shopper_id UUID NOT NULL,
  host_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  message TEXT,
  status public.booking_status NOT NULL DEFAULT 'pending',
  total_price NUMERIC NOT NULL,
  host_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Shoppers can create booking requests
CREATE POLICY "Shoppers can create booking requests"
ON public.booking_requests
FOR INSERT
WITH CHECK (auth.uid() = shopper_id);

-- Shoppers can view their own booking requests
CREATE POLICY "Shoppers can view their own requests"
ON public.booking_requests
FOR SELECT
USING (auth.uid() = shopper_id);

-- Hosts can view booking requests for their listings
CREATE POLICY "Hosts can view requests for their listings"
ON public.booking_requests
FOR SELECT
USING (auth.uid() = host_id);

-- Hosts can update booking requests for their listings (approve/decline)
CREATE POLICY "Hosts can respond to booking requests"
ON public.booking_requests
FOR UPDATE
USING (auth.uid() = host_id);

-- Shoppers can cancel their own pending requests
CREATE POLICY "Shoppers can cancel their pending requests"
ON public.booking_requests
FOR UPDATE
USING (auth.uid() = shopper_id AND status = 'pending');

-- Create trigger for updated_at
CREATE TRIGGER update_booking_requests_updated_at
BEFORE UPDATE ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_booking_requests_listing ON public.booking_requests(listing_id);
CREATE INDEX idx_booking_requests_shopper ON public.booking_requests(shopper_id);
CREATE INDEX idx_booking_requests_host ON public.booking_requests(host_id);
CREATE INDEX idx_booking_requests_status ON public.booking_requests(status);