
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_lookup
  ON public.rate_limit_events (scope, key, created_at DESC);

GRANT ALL ON public.rate_limit_events TO service_role;

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read rate limit events" ON public.rate_limit_events;
CREATE POLICY "Admins can read rate limit events"
ON public.rate_limit_events
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
