-- Add hourly booking fields to listings table
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS price_hourly numeric NULL,
ADD COLUMN IF NOT EXISTS hourly_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS daily_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS min_hours integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_hours integer DEFAULT 24,
ADD COLUMN IF NOT EXISTS buffer_time_mins integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_notice_hours integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS operating_hours_start time NULL,
ADD COLUMN IF NOT EXISTS operating_hours_end time NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.listings.price_hourly IS 'Hourly rental rate';
COMMENT ON COLUMN public.listings.hourly_enabled IS 'Whether hourly booking is enabled';
COMMENT ON COLUMN public.listings.daily_enabled IS 'Whether daily booking is enabled';
COMMENT ON COLUMN public.listings.min_hours IS 'Minimum hours for hourly booking';
COMMENT ON COLUMN public.listings.max_hours IS 'Maximum hours for hourly booking';
COMMENT ON COLUMN public.listings.buffer_time_mins IS 'Buffer time between bookings in minutes';
COMMENT ON COLUMN public.listings.min_notice_hours IS 'Minimum notice required before booking starts';
COMMENT ON COLUMN public.listings.operating_hours_start IS 'Start of operating hours for hourly slots';
COMMENT ON COLUMN public.listings.operating_hours_end IS 'End of operating hours for hourly slots';

-- Create table for hourly booking time slots (blocked time ranges)
CREATE TABLE IF NOT EXISTS public.listing_blocked_times (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  blocked_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Add RLS policies for blocked times
ALTER TABLE public.listing_blocked_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked times" 
ON public.listing_blocked_times 
FOR SELECT 
USING (true);

CREATE POLICY "Hosts can manage their blocked times" 
ON public.listing_blocked_times 
FOR ALL 
USING (auth.uid() = host_id);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_listing_blocked_times_listing_date ON public.listing_blocked_times(listing_id, blocked_date);

-- Add hourly booking fields to booking_requests
ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS is_hourly_booking boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS start_time time NULL,
ADD COLUMN IF NOT EXISTS end_time time NULL,
ADD COLUMN IF NOT EXISTS duration_hours numeric NULL;

COMMENT ON COLUMN public.booking_requests.is_hourly_booking IS 'Whether this is an hourly booking vs full-day';
COMMENT ON COLUMN public.booking_requests.start_time IS 'Start time for hourly bookings';
COMMENT ON COLUMN public.booking_requests.end_time IS 'End time for hourly bookings';
COMMENT ON COLUMN public.booking_requests.duration_hours IS 'Duration in hours for hourly bookings';