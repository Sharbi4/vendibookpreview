ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS callback_phone_e164 text,
  ADD COLUMN IF NOT EXISTS callback_phone_display text,
  ADD COLUMN IF NOT EXISTS callback_phone_country text,
  ADD COLUMN IF NOT EXISTS callback_phone_extension text,
  ADD COLUMN IF NOT EXISTS callback_phone_source text,
  ADD COLUMN IF NOT EXISTS vapi_tool_call_id text,
  ADD COLUMN IF NOT EXISTS submission_channel text,
  ADD COLUMN IF NOT EXISTS delivery_attempted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_vapi_call_tool_uidx
  ON public.support_tickets (vapi_call_id, vapi_tool_call_id)
  WHERE vapi_call_id IS NOT NULL AND vapi_tool_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS support_tickets_callback_phone_e164_idx
  ON public.support_tickets (callback_phone_e164)
  WHERE callback_phone_e164 IS NOT NULL;