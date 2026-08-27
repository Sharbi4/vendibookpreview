ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS creation_session_key text;

CREATE UNIQUE INDEX IF NOT EXISTS listings_host_creation_session_key_uidx
  ON public.listings (host_id, creation_session_key)
  WHERE creation_session_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS listings_creation_active_draft_idx
  ON public.listings (host_id, created_at DESC)
  WHERE creation_session_key IS NOT NULL AND status = 'draft';