-- Create helper function to calculate booking end timestamp from hourly_slots
CREATE OR REPLACE FUNCTION public.calculate_booking_end_timestamp(
  p_end_date DATE,
  p_hourly_slots JSONB
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  last_date TEXT;
  last_hour TEXT;
BEGIN
  -- Default to end of day
  IF p_hourly_slots IS NULL OR jsonb_array_length(p_hourly_slots) = 0 THEN
    RETURN p_end_date::timestamptz + INTERVAL '23 hours 59 minutes 59 seconds';
  END IF;
  
  -- Find the last date in the array
  SELECT MAX(entry->>'date') INTO last_date
  FROM jsonb_array_elements(p_hourly_slots) AS entry;
  
  -- Find the last hour on that date
  SELECT MAX(hour_val) INTO last_hour
  FROM jsonb_array_elements(p_hourly_slots) AS entry
  CROSS JOIN LATERAL jsonb_array_elements_text(entry->'slots') AS hour_val
  WHERE entry->>'date' = last_date;
  
  IF last_hour IS NULL THEN
    RETURN p_end_date::timestamptz + INTERVAL '23 hours 59 minutes 59 seconds';
  END IF;
  
  -- Return end of the last booked hour (add 1 hour to start time)
  RETURN (last_date || ' ' || last_hour)::timestamptz + INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Add booking_end_timestamp column for precise end time tracking
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS booking_end_timestamp TIMESTAMPTZ;

-- Add manual hold columns for admin override
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS payout_hold_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payout_hold_reason TEXT,
ADD COLUMN IF NOT EXISTS payout_hold_set_by UUID REFERENCES public.profiles(id);

-- Backfill existing bookings with calculated booking_end_timestamp
UPDATE public.booking_requests SET booking_end_timestamp = 
  CASE 
    WHEN is_hourly_booking = true AND end_time IS NOT NULL THEN
      (end_date::text || ' ' || end_time::text)::timestamptz
    WHEN is_hourly_booking = true AND hourly_slots IS NOT NULL THEN
      public.calculate_booking_end_timestamp(end_date, hourly_slots)
    ELSE
      end_date::timestamptz + INTERVAL '23 hours 59 minutes 59 seconds'
  END
WHERE booking_end_timestamp IS NULL;