-- Add hourly_slots column to store multi-day hourly booking data
-- Format: [{"date": "2024-02-09", "slots": ["07:00", "08:00", "09:00"]}, ...]
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS hourly_slots jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.booking_requests.hourly_slots IS 'Stores multi-day hourly booking slots as JSON array. Format: [{"date": "YYYY-MM-DD", "slots": ["HH:MM", ...]}]';