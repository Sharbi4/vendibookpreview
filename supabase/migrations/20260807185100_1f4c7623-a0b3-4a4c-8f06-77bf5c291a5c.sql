-- =====================================================================
-- Verified Seller — corrective, additive migration
-- =====================================================================

-- 1) The paid badge must NOT be mirrored into profiles.identity_verified.
--    profiles.identity_verified holds legacy history and stays untouched.
DROP TRIGGER IF EXISTS trg_sync_seller_verification_badge ON public.seller_verifications;
DROP FUNCTION IF EXISTS public.sync_seller_verification_badge();

-- 2) Payment purpose so a retry authorization is unambiguous server-side.
ALTER TABLE public.seller_verification_payments
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'initial',
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refunded_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'svp_purpose_chk'
  ) THEN
    ALTER TABLE public.seller_verification_payments
      ADD CONSTRAINT svp_purpose_chk
      CHECK (purpose = ANY (ARRAY['initial','retry','payment_only']));
  END IF;
END $$;

-- 3) Exactly one open payment per seller (blocks double-click double-holds).
CREATE UNIQUE INDEX IF NOT EXISTS uq_svp_one_open_payment
  ON public.seller_verification_payments (user_id)
  WHERE state IN ('created','authorized');

-- 4) Atomic self-service retry claim. Returns true only for the caller that
--    actually consumed the allowance, so concurrent requests cannot both win.
CREATE OR REPLACE FUNCTION public.claim_seller_verification_retry(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed boolean;
BEGIN
  UPDATE public.seller_verifications
     SET retry_count = retry_count + 1,
         updated_at  = now()
   WHERE user_id = _user_id
     AND retry_count < retry_allowance
     AND identity_status IS DISTINCT FROM 'success'
     AND revoked_at IS NULL
  RETURNING true INTO claimed;

  RETURN COALESCE(claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_seller_verification_retry(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_seller_verification_retry(uuid) TO service_role;

-- 5) Releases a claimed retry when Plaid never created the attempt.
CREATE OR REPLACE FUNCTION public.release_seller_verification_retry(_user_id uuid)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.seller_verifications
     SET retry_count = GREATEST(retry_count - 1, 0),
         updated_at  = now()
   WHERE user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.release_seller_verification_retry(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_seller_verification_retry(uuid) TO service_role;

-- 6) Sanitized batch badge read for listing cards / profiles.
--    Exposes ONLY user_id + verified_at for eligible sellers. No Plaid or
--    PayPal identifiers, no failure data, no rows for ineligible sellers.
CREATE OR REPLACE FUNCTION public.seller_identity_badges(_user_ids uuid[])
RETURNS TABLE (user_id uuid, verified_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sv.user_id, sv.verified_at
  FROM public.seller_verifications sv
  WHERE sv.user_id = ANY(_user_ids)
    AND sv.identity_status = 'success'
    AND sv.payment_state = 'captured'
    AND sv.verified_at IS NOT NULL
    AND sv.revoked_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.seller_identity_badges(uuid[]) TO anon, authenticated, service_role;

-- 7) Keep the single-seller read consistent with the batch read.
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

GRANT EXECUTE ON FUNCTION public.is_seller_identity_verified(uuid) TO anon, authenticated, service_role;

-- 8) Feature flag row must exist and default to OFF for this rollout.
INSERT INTO public.app_feature_flags (key, enabled, description)
VALUES ('verified_seller_enabled', false,
        'Paid Verified Seller identity check offer. Keep FALSE until Plaid webhook, cleanup schedule and PayPal AUTHORIZE capability are confirmed.')
ON CONFLICT (key) DO UPDATE
  SET enabled = false,
      description = EXCLUDED.description,
      updated_at = now();