ALTER TABLE public.availability_alerts
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS last_geocoded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_availability_alerts_coords
  ON public.availability_alerts (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;