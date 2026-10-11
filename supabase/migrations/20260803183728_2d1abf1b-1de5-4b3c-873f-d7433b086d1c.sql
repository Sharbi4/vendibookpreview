CREATE TYPE public.payout_method AS ENUM ('paypal', 'venmo', 'cash_app', 'ach');
CREATE TYPE public.payout_preference_status AS ENUM ('not_set', 'pending_review', 'verified', 'needs_attention');

CREATE TABLE public.payout_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  method public.payout_method NOT NULL,
  status public.payout_preference_status NOT NULL DEFAULT 'pending_review',
  display_label text,
  masked_destination text,
  paypal_email text,
  venmo_identifier_type text,
  venmo_masked_identifier text,
  cash_app_cashtag text,
  ach_bank_name text,
  ach_account_type text,
  ach_account_holder text,
  ach_routing_last4 text,
  ach_account_last4 text,
  verified_at timestamptz,
  needs_attention_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_preferences TO authenticated;
GRANT ALL ON public.payout_preferences TO service_role;

ALTER TABLE public.payout_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own payout preference"
  ON public.payout_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payout preferences"
  ON public.payout_preferences FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payout_preferences_updated_at
  BEFORE UPDATE ON public.payout_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_payout_preferences_status ON public.payout_preferences (status);

-- Operations-only vault for sensitive ACH details. No client role may read it.
CREATE TABLE public.payout_ach_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id uuid NOT NULL UNIQUE REFERENCES public.payout_preferences(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  encrypted_payload text,
  encryption_version text NOT NULL DEFAULT 'v1',
  intake_mode text NOT NULL DEFAULT 'setup_request',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.payout_ach_details TO service_role;

ALTER TABLE public.payout_ach_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to ACH details"
  ON public.payout_ach_details FOR SELECT
  USING (false);

CREATE TRIGGER trg_payout_ach_details_updated_at
  BEFORE UPDATE ON public.payout_ach_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
