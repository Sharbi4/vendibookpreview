CREATE TABLE IF NOT EXISTS public.admin_action_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  user_id UUID NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_action_idempotency TO authenticated;
GRANT ALL ON public.admin_action_idempotency TO service_role;

ALTER TABLE public.admin_action_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read idempotency"
ON public.admin_action_idempotency FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_admin_action_idempotency_created_at
  ON public.admin_action_idempotency (created_at DESC);