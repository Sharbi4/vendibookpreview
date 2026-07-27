ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_source_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_source_check
  CHECK (source = ANY (ARRAY['in_app'::text, 'tawkto'::text, 'email'::text, 'system'::text, 'vapi_callback'::text]));

ALTER TABLE public.support_ticket_webhook_events DROP CONSTRAINT IF EXISTS support_ticket_webhook_events_source_check;
ALTER TABLE public.support_ticket_webhook_events ADD CONSTRAINT support_ticket_webhook_events_source_check
  CHECK (source = ANY (ARRAY['tawkto'::text, 'vapi_callback'::text]));

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS vapi_call_id text,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forwarding_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS forwarding_last_error text,
  ADD COLUMN IF NOT EXISTS forwarded_at timestamptz;

ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_forwarding_status_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_forwarding_status_check
  CHECK (forwarding_status = ANY (ARRAY['pending'::text, 'delivered'::text, 'retryable_failure'::text, 'permanent_failure'::text, 'skipped'::text]));

CREATE INDEX IF NOT EXISTS support_tickets_vapi_call_id_idx ON public.support_tickets (vapi_call_id) WHERE vapi_call_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS support_tickets_forwarding_status_idx ON public.support_tickets (forwarding_status) WHERE forwarding_status IN ('pending','retryable_failure');