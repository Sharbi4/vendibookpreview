CREATE TABLE public.callback_dialer_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  to_number text NOT NULL CHECK (to_number ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$'),
  caller_id text NOT NULL DEFAULT '+18666906227' CHECK (caller_id = '+18666906227'),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  twilio_call_sid text,
  status text NOT NULL DEFAULT 'intent_created',
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.callback_dialer_calls TO authenticated;
GRANT ALL ON public.callback_dialer_calls TO service_role;
ALTER TABLE public.callback_dialer_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read callback dialer calls" ON public.callback_dialer_calls
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX callback_dialer_calls_admin_created ON public.callback_dialer_calls (admin_user_id, created_at DESC);