-- ============================================================
-- Verified Seller: optional paid account-level identity check
-- ============================================================

-- ---------- authoritative per-user record ----------
CREATE TABLE public.seller_verifications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  identity_status text,
  identity_succeeded_at timestamptz,
  payment_state text NOT NULL DEFAULT 'none',
  verified_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  revoked_by uuid,
  current_attempt_id text,
  template_id text,
  retry_count integer NOT NULL DEFAULT 0,
  retry_allowance integer NOT NULL DEFAULT 1,
  last_reason_code text,
  terms_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_verifications_status_chk CHECK (status IN (
    'not_started','terms_accepted','awaiting_authorization','authorized',
    'identity_in_progress','pending_review','payment_required',
    'verified','failed','canceled','expired','revoked'
  )),
  CONSTRAINT seller_verifications_payment_state_chk CHECK (payment_state IN (
    'none','created','authorized','captured','voided','refunded','failed'
  )),
  CONSTRAINT seller_verifications_retry_chk CHECK (retry_count >= 0)
);

GRANT ALL ON public.seller_verifications TO service_role;
ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view seller verifications"
  ON public.seller_verifications FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_seller_verifications_status ON public.seller_verifications(status);
CREATE INDEX idx_seller_verifications_verified_at ON public.seller_verifications(verified_at);

-- ---------- attempt lineage ----------
CREATE TABLE public.seller_verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_verification_id text NOT NULL UNIQUE,
  previous_verification_id text,
  template_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  reason_code text,
  request_id text,
  shareable_url_issued boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.seller_verification_attempts TO service_role;
ALTER TABLE public.seller_verification_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view verification attempts"
  ON public.seller_verification_attempts FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_sv_attempts_user ON public.seller_verification_attempts(user_id, created_at DESC);

-- ---------- payment lifecycle ----------
CREATE TABLE public.seller_verification_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'paypal',
  paypal_order_id text UNIQUE,
  paypal_authorization_id text UNIQUE,
  paypal_capture_id text UNIQUE,
  paypal_refund_id text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  state text NOT NULL DEFAULT 'created',
  attempt_verification_id text,
  error_code text,
  authorized_at timestamptz,
  captured_at timestamptz,
  voided_at timestamptz,
  refunded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sv_payments_state_chk CHECK (state IN (
    'created','authorized','captured','voided','refunded','failed','expired'
  )),
  CONSTRAINT sv_payments_amount_chk CHECK (amount_cents > 0)
);

GRANT ALL ON public.seller_verification_payments TO service_role;
ALTER TABLE public.seller_verification_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view verification payments"
  ON public.seller_verification_payments FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_sv_payments_user ON public.seller_verification_payments(user_id, created_at DESC);
CREATE INDEX idx_sv_payments_state ON public.seller_verification_payments(state);
-- at most one live (created/authorized) payment per user
CREATE UNIQUE INDEX idx_sv_payments_one_open
  ON public.seller_verification_payments(user_id)
  WHERE state IN ('created','authorized');
-- at most one captured (non-refunded) payment per user
CREATE UNIQUE INDEX idx_sv_payments_one_captured
  ON public.seller_verification_payments(user_id)
  WHERE state = 'captured';

-- ---------- terms acceptance ----------
CREATE TABLE public.seller_verification_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.seller_verification_terms TO service_role;
ALTER TABLE public.seller_verification_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view verification terms"
  ON public.seller_verification_terms FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_sv_terms_user ON public.seller_verification_terms(user_id, accepted_at DESC);

-- ---------- webhook / event de-duplication ----------
CREATE TABLE public.seller_verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_key text NOT NULL,
  event_type text,
  user_id uuid,
  verification_id text,
  processed_at timestamptz NOT NULL DEFAULT now(),
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sv_events_unique UNIQUE (provider, event_key)
);

GRANT ALL ON public.seller_verification_events TO service_role;
ALTER TABLE public.seller_verification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view verification events"
  ON public.seller_verification_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_sv_events_verification ON public.seller_verification_events(verification_id);

-- ---------- updated_at triggers ----------
CREATE TRIGGER trg_sv_updated_at BEFORE UPDATE ON public.seller_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sv_attempts_updated_at BEFORE UPDATE ON public.seller_verification_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sv_payments_updated_at BEFORE UPDATE ON public.seller_verification_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- authoritative badge eligibility ----------
CREATE OR REPLACE FUNCTION public.is_seller_identity_verified(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.seller_verifications sv
    WHERE sv.user_id = _user_id
      AND sv.identity_status = 'success'
      AND sv.payment_state = 'captured'
      AND sv.verified_at IS NOT NULL
      AND sv.revoked_at IS NULL
  );
$$;

-- Mirror the derived badge onto profiles so every existing public surface
-- (search, cards, profile headers) reflects it without extra queries.
-- profiles.identity_verified is already protected from user writes by
-- protect_profile_stripe_columns().
CREATE OR REPLACE FUNCTION public.sync_seller_verification_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eligible boolean;
BEGIN
  eligible := (
    NEW.identity_status = 'success'
    AND NEW.payment_state = 'captured'
    AND NEW.verified_at IS NOT NULL
    AND NEW.revoked_at IS NULL
  );

  IF eligible THEN
    UPDATE public.profiles
       SET identity_verified = true,
           identity_verified_at = COALESCE(identity_verified_at, NEW.verified_at)
     WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    UPDATE public.profiles
       SET identity_verified = false,
           identity_verified_at = NULL
     WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_seller_verification_badge
  AFTER INSERT OR UPDATE ON public.seller_verifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_seller_verification_badge();

-- ---------- sanitized self-read ----------
CREATE OR REPLACE FUNCTION public.get_my_seller_verification()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
        'status', sv.status,
        'identity_status', sv.identity_status,
        'payment_state', sv.payment_state,
        'verified', (sv.identity_status = 'success'
                     AND sv.payment_state = 'captured'
                     AND sv.verified_at IS NOT NULL
                     AND sv.revoked_at IS NULL),
        'verified_at', sv.verified_at,
        'revoked', sv.revoked_at IS NOT NULL,
        'retry_count', sv.retry_count,
        'retry_allowance', sv.retry_allowance,
        'terms_version', sv.terms_version,
        'updated_at', sv.updated_at
      )
      FROM public.seller_verifications sv
      WHERE sv.user_id = auth.uid()),
    jsonb_build_object('status', 'not_started', 'verified', false)
  );
$$;

REVOKE ALL ON FUNCTION public.get_my_seller_verification() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_seller_verification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_seller_identity_verified(uuid) TO authenticated, anon, service_role;

-- ---------- feature switch ----------
INSERT INTO public.app_feature_flags (key, enabled, description)
VALUES (
  'verified_seller_enabled', true,
  'Master switch for the optional paid Verified Seller identity check ($19.99 one time). When false, all purchase CTAs hide; existing badges are unaffected.'
)
ON CONFLICT (key) DO NOTHING;