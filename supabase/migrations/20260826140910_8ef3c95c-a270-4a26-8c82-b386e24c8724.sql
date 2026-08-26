ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS vendi_session_key text;

CREATE UNIQUE INDEX IF NOT EXISTS listings_host_vendi_session_key_uidx
  ON public.listings (host_id, vendi_session_key)
  WHERE vendi_session_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS listings_vendi_active_draft_idx
  ON public.listings (host_id, created_at DESC)
  WHERE vendi_session_key IS NOT NULL AND status = 'draft';