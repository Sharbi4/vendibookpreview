
-- 1) Extend support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'in_app',
  ADD COLUMN IF NOT EXISTS tawk_ticket_id text,
  ADD COLUMN IF NOT EXISTS tawk_chat_id text,
  ADD COLUMN IF NOT EXISTS tawk_property_id text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_due_at timestamptz;

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_source_check;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_source_check
    CHECK (source = ANY (ARRAY['in_app','tawkto','email','system']));

-- Dedup: one Vendibook ticket per Tawk ticket ID (when present)
CREATE UNIQUE INDEX IF NOT EXISTS ux_support_tickets_tawk_ticket_id
  ON public.support_tickets (tawk_ticket_id)
  WHERE tawk_ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_source
  ON public.support_tickets (source);

-- 2) Webhook delivery ledger (idempotency)
CREATE TABLE IF NOT EXISTS public.support_ticket_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('tawkto')),
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  property_id text,
  payload jsonb NOT NULL,
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_event_id)
);

GRANT SELECT ON public.support_ticket_webhook_events TO authenticated;
GRANT ALL    ON public.support_ticket_webhook_events TO service_role;

ALTER TABLE public.support_ticket_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view webhook events"
  ON public.support_ticket_webhook_events
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3) Audit event log
CREATE TABLE IF NOT EXISTS public.support_ticket_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_type text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('system','user','admin','tawk_agent')),
  actor_id uuid,
  previous_status text,
  new_status text,
  external_ref text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.support_ticket_audit_events TO authenticated;
GRANT ALL    ON public.support_ticket_audit_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_support_ticket_audit_events_ticket
  ON public.support_ticket_audit_events (ticket_id, created_at DESC);

ALTER TABLE public.support_ticket_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket owner or admin can view audit events"
  ON public.support_ticket_audit_events
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_audit_events.ticket_id
        AND t.user_id = auth.uid()
    )
  );
