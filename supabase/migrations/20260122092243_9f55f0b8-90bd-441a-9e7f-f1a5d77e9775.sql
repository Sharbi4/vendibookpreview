-- Add weekly hourly schedule as JSONB for storing per-day time windows
-- Format: {"mon": [{"start": "08:00", "end": "12:00"}, {"start": "14:00", "end": "18:00"}], "tue": [...], ...}
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS hourly_schedule jsonb DEFAULT '{}' ::jsonb,
ADD COLUMN IF NOT EXISTS rental_min_days integer DEFAULT 1;