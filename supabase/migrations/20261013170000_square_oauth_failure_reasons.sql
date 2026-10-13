-- Record why a host's Square connection failed so support can diagnose it
-- without reading function logs. Codes only: never tokens or auth codes.
ALTER TABLE public.square_oauth_states
  ADD COLUMN IF NOT EXISTS failure_stage text,
  ADD COLUMN IF NOT EXISTS failure_code text,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz;
