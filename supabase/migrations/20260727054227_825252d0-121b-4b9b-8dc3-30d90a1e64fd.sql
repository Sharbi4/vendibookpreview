
-- =========================================================================
-- D1: trusted server-only host payment eligibility + publish enforcement
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.host_payment_eligibility (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  requirements_currently_due JSONB NOT NULL DEFAULT '[]'::jsonb,
  disabled_reason TEXT,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.host_payment_eligibility TO authenticated;
GRANT ALL ON public.host_payment_eligibility TO service_role;

ALTER TABLE public.host_payment_eligibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hpe_user_read_own" ON public.host_payment_eligibility;
CREATE POLICY "hpe_user_read_own" ON public.host_payment_eligibility
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "hpe_admin_read_all" ON public.host_payment_eligibility;
CREATE POLICY "hpe_admin_read_all" ON public.host_payment_eligibility
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies for authenticated: service_role only.

DROP TRIGGER IF EXISTS trg_host_payment_eligibility_updated ON public.host_payment_eligibility;
CREATE TRIGGER trg_host_payment_eligibility_updated
  BEFORE UPDATE ON public.host_payment_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill from existing profiles: trust current stripe_onboarding_complete
-- for hosts that already have a Stripe account, so their live listings and
-- new publishes continue to work while the webhook / check-stripe-connect
-- reconciles authoritative charges_enabled on the next call.
INSERT INTO public.host_payment_eligibility (
  user_id, stripe_account_id, onboarding_complete, charges_enabled,
  payouts_enabled, details_submitted
)
SELECT
  p.id,
  p.stripe_account_id,
  COALESCE(p.stripe_onboarding_complete, false),
  COALESCE(p.stripe_onboarding_complete, false),
  COALESCE(p.stripe_onboarding_complete, false),
  COALESCE(p.stripe_onboarding_complete, false)
FROM public.profiles p
WHERE p.stripe_account_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Publish enforcement: block card-enabled publishing without trusted Connect eligibility.
CREATE OR REPLACE FUNCTION public.enforce_card_publish_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_elig public.host_payment_eligibility;
  v_wants_card boolean;
BEGIN
  IF NEW.status IS DISTINCT FROM 'published'::listing_status THEN
    RETURN NEW;
  END IF;

  -- On UPDATE of an already-published listing, only re-check when card
  -- enablement is being turned ON or the host is changing.
  IF TG_OP = 'UPDATE' AND OLD.status = 'published'::listing_status THEN
    IF COALESCE(OLD.accept_card_payment,false) = COALESCE(NEW.accept_card_payment,false)
       AND OLD.host_id IS NOT DISTINCT FROM NEW.host_id THEN
      RETURN NEW;
    END IF;
  END IF;

  v_wants_card := COALESCE(NEW.accept_card_payment, false);
  IF NOT v_wants_card THEN
    RETURN NEW;
  END IF;

  IF NEW.host_id IS NULL THEN
    RAISE EXCEPTION '[STRIPE_CONNECT_REQUIRED] Card payments require a Stripe-connected host.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_elig FROM public.host_payment_eligibility WHERE user_id = NEW.host_id;
  IF v_elig.user_id IS NULL
     OR NOT v_elig.onboarding_complete
     OR NOT v_elig.charges_enabled THEN
    RAISE EXCEPTION '[STRIPE_CONNECT_REQUIRED] Connect Stripe and complete onboarding before publishing a card-enabled listing.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_card_publish_eligibility ON public.listings;
CREATE TRIGGER trg_enforce_card_publish_eligibility
  BEFORE INSERT OR UPDATE OF status, accept_card_payment, host_id
  ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_card_publish_eligibility();

-- Protect trusted Stripe fields on profiles from client forgery.
-- Silently revert to OLD values on any self-update. Service-role callers
-- (edge functions, webhooks) have auth.uid() IS NULL and are unaffected.
CREATE OR REPLACE FUNCTION public.protect_profile_stripe_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
    NEW.stripe_account_id := OLD.stripe_account_id;
    NEW.stripe_onboarding_complete := OLD.stripe_onboarding_complete;
    NEW.stripe_identity_session_id := OLD.stripe_identity_session_id;
    NEW.identity_verified := OLD.identity_verified;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_stripe_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_stripe_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_stripe_columns();

-- =========================================================================
-- D2: recurring-billing consent replay guard + attempt scoping
-- =========================================================================

ALTER TABLE public.user_consents
  ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consumed_by_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_user_consents_checkout_attempt
  ON public.user_consents ((related_ids->>'checkout_attempt_id'))
  WHERE related_ids ? 'checkout_attempt_id';
