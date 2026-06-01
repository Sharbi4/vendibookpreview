
CREATE TABLE public.error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  fingerprint text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  priority text NOT NULL DEFAULT 'normal',
  source text NOT NULL DEFAULT 'frontend',
  action text,
  endpoint text,
  method text,
  status_code integer,
  page_url text,
  user_id uuid,
  user_email text,
  listing_id uuid,
  boost_id text,
  payment_id text,
  error_type text,
  error_message text,
  stack text,
  user_agent text,
  session_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  internal_notes text,
  alert_sent_at timestamptz,
  alert_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.error_events TO authenticated;
GRANT ALL ON public.error_events TO service_role;

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view error events"
  ON public.error_events FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update error events"
  ON public.error_events FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_error_events_occurred_at ON public.error_events (occurred_at DESC);
CREATE INDEX idx_error_events_fingerprint ON public.error_events (fingerprint);
CREATE INDEX idx_error_events_priority_resolved ON public.error_events (priority, resolved, occurred_at DESC);
CREATE INDEX idx_error_events_user_id ON public.error_events (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_error_events_listing_id ON public.error_events (listing_id) WHERE listing_id IS NOT NULL;

CREATE TRIGGER update_error_events_updated_at
  BEFORE UPDATE ON public.error_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
