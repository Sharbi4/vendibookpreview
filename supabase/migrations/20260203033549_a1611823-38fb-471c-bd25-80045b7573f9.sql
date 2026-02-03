-- Add special hourly pricing column to listings
-- This stores pricing tiers for different hours of the day

ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS hourly_special_pricing JSONB DEFAULT NULL;

-- Example structure:
-- {
--   "peak": { "hours": [8, 9, 10, 11, 12, 17, 18, 19], "multiplier": 1.5, "label": "Peak Hours" },
--   "offpeak": { "hours": [6, 7, 13, 14, 15, 16, 20, 21], "multiplier": 0.8, "label": "Off-Peak" }
-- }
-- Or simpler hour-by-hour pricing:
-- {
--   "hourPrices": { "8": 50, "9": 50, "10": 60, "11": 60, "12": 75, ... }
-- }

COMMENT ON COLUMN public.listings.hourly_special_pricing IS 'JSON configuration for variable hourly pricing by time of day';