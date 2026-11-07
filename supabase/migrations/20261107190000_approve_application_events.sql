-- Private immutable status receipts. Applicant details are never stored here.
CREATE TABLE public.approve_application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_hash text NOT NULL UNIQUE CHECK (event_hash ~ '^[a-f0-9]{64}$'),
  application_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('started','submitted','queued_for_vendor_submission','in_review','approved','pending_signature','funded','declined','closed','cancelled')),
  received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.approve_application_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.approve_application_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.approve_application_events TO authenticated;
GRANT ALL ON public.approve_application_events TO service_role;
CREATE POLICY approve_events_admin ON public.approve_application_events FOR SELECT TO authenticated
USING (public.has_role((SELECT auth.uid()), 'admin'));
CREATE INDEX approve_events_application ON public.approve_application_events(application_id, received_at);
