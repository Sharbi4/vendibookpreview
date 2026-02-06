-- Add business_info JSONB column to booking_requests table
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS business_info JSONB DEFAULT NULL;

COMMENT ON COLUMN public.booking_requests.business_info IS 'Stores business information for food trucks, trailers, and shared kitchen bookings';