ALTER TABLE public.asset_requests
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS matched_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title text;

CREATE INDEX IF NOT EXISTS idx_asset_requests_public ON public.asset_requests(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_asset_requests_city_type ON public.asset_requests(city, asset_type);

DROP POLICY IF EXISTS "Anyone can view public wanted requests" ON public.asset_requests;
CREATE POLICY "Anyone can view public wanted requests"
ON public.asset_requests
FOR SELECT
USING (is_public = true);