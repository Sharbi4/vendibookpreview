ALTER TABLE public.asset_requests
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS timeline text,
  ADD COLUMN IF NOT EXISTS source_page text,
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_asset_requests_intent_created
  ON public.asset_requests (intent, created_at DESC);