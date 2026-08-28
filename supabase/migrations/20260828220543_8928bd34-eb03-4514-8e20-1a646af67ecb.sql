CREATE TABLE IF NOT EXISTS public.booking_identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'not_started',
  identity_status text,
  plaid_verification_id text,
  template_id text,
  attempt_count integer NOT NULL DEFAULT 0,
  retry_allowance integer NOT NULL DEFAULT 1,
  last_reason_code text,
  reused_from text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.booking_identity_verifications TO authenticated;
GRANT ALL ON public.booking_identity_verifications TO service_role;

ALTER TABLE public.booking_identity_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Renters can read their own booking identity check"
  ON public.booking_identity_verifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all booking identity checks"
  ON public.booking_identity_verifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS booking_identity_verifications_plaid_idx
  ON public.booking_identity_verifications (plaid_verification_id);

CREATE TRIGGER booking_identity_verifications_set_updated_at
  BEFORE UPDATE ON public.booking_identity_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.booking_identity_verifications IS 'Free booking-purpose Plaid Identity Verification state for renters. No payment is ever attached; writes are server-side only.';