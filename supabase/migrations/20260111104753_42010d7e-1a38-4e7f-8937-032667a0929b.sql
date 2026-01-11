-- Add fulfillment tracking columns to booking_requests
ALTER TABLE public.booking_requests
ADD COLUMN fulfillment_selected text DEFAULT 'pickup',
ADD COLUMN delivery_address text,
ADD COLUMN delivery_instructions text,
ADD COLUMN delivery_fee_snapshot numeric,
ADD COLUMN address_snapshot text,
ADD COLUMN access_instructions_snapshot text;

-- Add check constraint for fulfillment_selected values
ALTER TABLE public.booking_requests
ADD CONSTRAINT booking_requests_fulfillment_check 
CHECK (fulfillment_selected IN ('pickup', 'delivery', 'on_site'));