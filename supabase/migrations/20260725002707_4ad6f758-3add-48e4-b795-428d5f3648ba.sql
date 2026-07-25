ALTER TABLE public.monetization_purchases
  ADD COLUMN IF NOT EXISTS access_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS nudge_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_monetization_purchases_access_window
  ON public.monetization_purchases (user_id, access_ends_at)
  WHERE access_ends_at IS NOT NULL;