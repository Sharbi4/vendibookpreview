ALTER TABLE public.permit_progress
  ADD COLUMN IF NOT EXISTS owned jsonb NOT NULL DEFAULT '{}'::jsonb;